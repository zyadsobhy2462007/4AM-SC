const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dbModule = require('../models/db');
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function register(req, res) {
  try {
    const { name, email, password, user_type, department } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Validate user_type
    const validTypes = ['admin', 'assistant', 'employee'];
    const userType = user_type && validTypes.includes(user_type) ? user_type : 'employee';
    
    // Check if MySQL is being used
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    
    if (isMySQL) {
      // MySQL - uses ? placeholders
      const info = await dbModule.runAsync(
        'INSERT INTO users(name,email,password_hash,user_type,department) VALUES(?,?,?,?,?)',
        [name || null, email, hash, userType, department || null]
      );
      const id = info.lastID;
      const user = await dbModule.getAsync('SELECT id,name,email,user_type,department,created_at FROM users WHERE id = ?', [id]);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      res.json({ user, token });
    } else if (isPostgres) {
      // Postgres
      const result = await dbModule.query(
        'INSERT INTO users(name,email,password_hash,user_type,department) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,user_type,department,created_at',
        [name || null, email, hash, userType, department || null]
      );
      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      res.json({ user, token });
    } else {
      // sqlite
      const info = await dbModule.runAsync(
        'INSERT INTO users(name,email,password_hash,user_type,department) VALUES(?,?,?,?,?)',
        [name || null, email, hash, userType, department || null]
      );
      const id = info.lastID;
      const user = await dbModule.getAsync('SELECT id,name,email,user_type,department,created_at FROM users WHERE id = ?', [id]);
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
      res.json({ user, token });
    }
  } catch (err) {
    console.error('Register error:', err);
    console.error('Error stack:', err.stack);
    if (err && err.code === 'SQLITE_CONSTRAINT' || err && err.code === '23505' || err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'email already registered' });
    }
    res.status(500).json({ error: 'server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    
    // Check if MySQL is being used
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    
    let user;
    if (isMySQL) {
      // MySQL - uses ? placeholders
      user = await dbModule.getAsync('SELECT id,email,name,password_hash,user_type,department FROM users WHERE email = ?', [email]);
    } else if (isPostgres) {
      // Postgres - uses $1 placeholders
      const result = await dbModule.query('SELECT id,email,name,password_hash,user_type,department FROM users WHERE email = $1', [email]);
      user = result.rows[0];
    } else {
      // SQLite - uses ? placeholders
      user = await dbModule.getAsync('SELECT id,email,name,password_hash,user_type,department FROM users WHERE email = ?', [email]);
    }
    
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        user_type: user.user_type || 'employee',
        department: user.department || null
      }, 
      token 
    });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function me(req, res) {
  try {
    const userId = req.userId;
    
    // Check if MySQL is being used
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    
    let user;
    if (isMySQL) {
      // MySQL - uses ? placeholders
      user = await dbModule.getAsync('SELECT id,email,name,user_type,department,created_at FROM users WHERE id = ?', [userId]);
    } else if (isPostgres) {
      // Postgres - uses $1 placeholders
      const result = await dbModule.query('SELECT id,email,name,user_type,department,created_at FROM users WHERE id = $1', [userId]);
      user = result.rows[0];
    } else {
      // SQLite - uses ? placeholders
      user = await dbModule.getAsync('SELECT id,email,name,user_type,department,created_at FROM users WHERE id = ?', [userId]);
    }
    
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function getAllUsers(req, res) {
  try {
    // Only admin can access all users
    const currentUserId = req.userId;
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');
    
    // Get current user to check if admin
    let currentUser;
    if (isMySQL) {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [currentUserId]);
    } else if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [currentUserId]);
      currentUser = result.rows[0];
    } else {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [currentUserId]);
    }
    
    if (!currentUser || (currentUser.user_type !== 'admin' && currentUser.user_type !== 'assistant')) {
      return res.status(403).json({ error: 'forbidden - admin or assistant access required' });
    }
    
    // Get all users
    let users;
    if (isMySQL) {
      users = await dbModule.allAsync('SELECT id,name,email,user_type,department,created_at FROM users ORDER BY created_at DESC');
    } else if (isPostgres) {
      const result = await dbModule.query('SELECT id,name,email,user_type,department,created_at FROM users ORDER BY created_at DESC');
      users = result.rows;
    } else {
      users = await dbModule.allAsync('SELECT id,name,email,user_type,department,created_at FROM users ORDER BY created_at DESC');
    }
    
    res.json({ users });
  } catch (err) {
    console.error('Get all users error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function getUserStats(req, res) {
  try {
    console.log('getUserStats called, userId:', req.userId);
    
    // Only admin can access user statistics
    const currentUserId = req.userId;
    if (!currentUserId) {
      console.error('No userId in request');
      return res.status(401).json({ error: 'unauthorized' });
    }
    
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    const isPostgres = process.env.DATABASE_URL && typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.startsWith('postgresql://');
    
    // Get current user to check if admin
    let currentUser;
    if (isMySQL) {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [currentUserId]);
    } else if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [currentUserId]);
      currentUser = result.rows[0];
    } else {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [currentUserId]);
    }
    
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
      console.error('User not found with id:', currentUserId);
      return res.status(404).json({ error: 'user not found' });
    }
    
    if (currentUser.user_type !== 'admin') {
      console.warn('Non-admin user tried to access stats:', currentUser.user_type);
      return res.status(403).json({ error: 'forbidden - admin access required' });
    }
    
    // Get user counts by type
    let stats;
    let allUsers;
    
    if (isMySQL) {
      allUsers = await dbModule.allAsync('SELECT user_type FROM users');
      console.log('MySQL - All users:', allUsers);
    } else if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users');
      allUsers = result.rows;
      console.log('Postgres - All users:', allUsers);
    } else {
      allUsers = await dbModule.allAsync('SELECT user_type FROM users');
      console.log('SQLite - All users:', allUsers);
    }
    
    const employees = allUsers.filter(u => u.user_type === 'employee').length;
    const assistants = allUsers.filter(u => u.user_type === 'assistant').length;
    const admins = allUsers.filter(u => u.user_type === 'admin').length;
    stats = { employees, assistants, admins, total: allUsers.length };
    
    console.log('Returning stats:', stats);
    res.json({ stats });
  } catch (err) {
    console.error('Get user stats error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

module.exports = { register, login, me, getAllUsers, getUserStats };
