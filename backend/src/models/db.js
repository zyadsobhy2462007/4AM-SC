const fs = require('fs');
const path = require('path');

const MYSQL_URL = process.env.MYSQL_URL || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Check for MySQL first (via MYSQL_URL or mysql:// in DATABASE_URL)
if (MYSQL_URL || (DATABASE_URL && DATABASE_URL.startsWith('mysql://'))) {
  // Use MySQL - Store only account information (users table)
  const mysql = require('mysql2/promise');
  const connectionString = MYSQL_URL || DATABASE_URL;
  
  // Parse MySQL connection string or use individual variables
  let connection;
  if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE) {
    // Use individual environment variables
    connection = mysql.createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } else {
    // Parse connection string mysql://user:password@host:port/database
    try {
      const url = new URL(connectionString.replace('mysql://', 'http://'));
      connection = mysql.createPool({
        host: url.hostname,
        port: url.port || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace('/', ''),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    } catch (err) {
      throw new Error('Invalid MySQL connection string. Use format: mysql://user:password@host:port/database or set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
    }
  }

  async function query(sql, params = []) {
    const [rows] = await connection.execute(sql, params);
    return { rows, rowCount: rows.length };
  }

  async function init() {
    // Create users table only (for account information)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type VARCHAR(20) DEFAULT 'employee',
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Add new columns if table already exists (migration)
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN user_type VARCHAR(20) DEFAULT "employee"');
    } catch (err) {
      // Column already exists, ignore
    }
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN department VARCHAR(100)');
    } catch (err) {
      // Column already exists, ignore
    }
    
    // Create admin account if it doesn't exist
    try {
      const adminCheck = await connection.execute('SELECT id FROM users WHERE email = ?', ['admin@4am.com']);
      if (adminCheck[0].length === 0) {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const adminPasswordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
        await connection.execute(
          'INSERT INTO users(name, email, password_hash, user_type, department) VALUES(?, ?, ?, ?, ?)',
          ['Mr.Mostafa Nassar - Manager', 'admin@4am.com', adminPasswordHash, 'admin', null]
        );
        console.log('✅ Admin account created: admin@4am.com / admin123');
      } else {
        console.log('✅ Admin account already exists');
      }
    } catch (err) {
      console.log('⚠️ Admin account check/creation:', err.message);
    }
    
    // Create tasks table with necessary columns
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        completed_at DATETIME NULL,
        week_start DATE NULL,
        assigned_by INT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // MySQL migrations: add columns if they don't exist
    try { await connection.execute('ALTER TABLE tasks ADD COLUMN status VARCHAR(20) DEFAULT "pending"'); } catch (e) {}
    try { await connection.execute('ALTER TABLE tasks ADD COLUMN completed_at DATETIME NULL'); } catch (e) {}
    try { await connection.execute('ALTER TABLE tasks ADD COLUMN week_start DATE NULL'); } catch (e) {}
    try { await connection.execute('ALTER TABLE tasks ADD COLUMN assigned_by INT NULL'); } catch (e) {}
    try { await connection.execute('ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT "medium"'); } catch (e) {}

    console.log('MySQL DB initialized - Users and Tasks tables ensured');
  }

  module.exports = { 
    init, 
    query,
    // Helper methods for compatibility
    async runAsync(sql, params) {
      const [result] = await connection.execute(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    },
    async allAsync(sql, params) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    },
    async getAsync(sql, params) {
      const [rows] = await connection.execute(sql, params);
      return rows[0] || null;
    }
  };
} else if (DATABASE_URL && typeof DATABASE_URL === 'string' && (DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://'))) {
  // Use Postgres
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL });
  async function init() {
    // create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type VARCHAR(20) DEFAULT 'employee',
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        completed_at TIMESTAMP NULL,
        week_start DATE NULL,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Postgres migrations: add columns if they don't exist
    await pool.query(`ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL`);
    await pool.query(`ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS week_start DATE NULL`);
    await pool.query(`ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'`);
    
    // Create admin account if it doesn't exist
    try {
      const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@4am.com']);
      if (adminCheck.rows.length === 0) {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const adminPasswordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
        await pool.query(
          'INSERT INTO users(name, email, password_hash, user_type, department) VALUES($1, $2, $3, $4, $5)',
          ['Mr.Mostafa Nassar - Manager', 'admin@4am.com', adminPasswordHash, 'admin', null]
        );
        console.log('✅ Admin account created: admin@4am.com / admin123');
      } else {
        console.log('✅ Admin account already exists');
      }
    } catch (err) {
      console.log('⚠️ Admin account check/creation:', err.message);
    }
    
    console.log('Postgres DB initialized');
  }
  async function query(sql, params = []) {
    const result = await pool.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  module.exports = { 
    init, 
    query,
    // Helper methods for compatibility
    async runAsync(sql, params) {
      const result = await pool.query(sql, params);
      // For INSERT, RETURNING clause should be used to get the id
      // If no RETURNING, we'll try to extract from the result
      return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
    },
    async allAsync(sql, params) {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    async getAsync(sql, params) {
      const result = await pool.query(sql, params);
      return result.rows[0] || null;
    }
  };
} else {
  // Use sqlite3
  const sqlite3 = require('sqlite3').verbose();
  const dataDir = path.resolve(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'database.sqlite');
  const db = new sqlite3.Database(dbPath);
  function runAsync(sql, params=[]) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
  function allAsync(sql, params=[]) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, function(err, rows) {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  function getAsync(sql, params=[]) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, function(err, row) {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  async function init() {
    await runAsync(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      user_type TEXT DEFAULT 'employee',
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    
    // Migration: Add new columns if table already exists (migration)
    try {
      // Check if user_type column exists
      const tableInfo = await allAsync('PRAGMA table_info(users)');
      const columns = tableInfo.map(col => col.name);
      
      if (!columns.includes('user_type')) {
        await runAsync('ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT "employee"');
        console.log('✅ Added user_type column to users table');
      }
      
      if (!columns.includes('department')) {
        await runAsync('ALTER TABLE users ADD COLUMN department TEXT');
        console.log('✅ Added department column to users table');
      }
    } catch (err) {
      console.log('⚠️ Migration check:', err.message);
    }
    
    // Create admin account if it doesn't exist
    try {
      const adminCheck = await getAsync('SELECT id FROM users WHERE email = ?', ['admin@4am.com']);
      if (!adminCheck) {
        const bcrypt = require('bcrypt');
        const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
        const adminPasswordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
        await runAsync(
          'INSERT INTO users(name, email, password_hash, user_type, department) VALUES(?, ?, ?, ?, ?)',
          ['Mr.Mostafa Nassar - Manager', 'admin@4am.com', adminPasswordHash, 'admin', null]
        );
        console.log('✅ Admin account created: admin@4am.com / admin123');
      } else {
        console.log('✅ Admin account already exists');
      }
    } catch (err) {
      console.log('⚠️ Admin account check/creation:', err.message);
    }
    await runAsync(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      completed_at DATETIME NULL,
      week_start DATE NULL,
      assigned_by INTEGER NULL,
      priority TEXT DEFAULT 'medium',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL
    );`);
    // SQLite migrations: add columns if they don't exist
    try {
      const taskInfo = await allAsync('PRAGMA table_info(tasks)');
      const tcols = taskInfo.map(c => c.name);
      if (!tcols.includes('status')) await runAsync('ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT "pending"');
      if (!tcols.includes('completed_at')) await runAsync('ALTER TABLE tasks ADD COLUMN completed_at DATETIME NULL');
      if (!tcols.includes('week_start')) await runAsync('ALTER TABLE tasks ADD COLUMN week_start DATE NULL');
      if (!tcols.includes('assigned_by')) await runAsync('ALTER TABLE tasks ADD COLUMN assigned_by INTEGER NULL');
      if (!tcols.includes('priority')) await runAsync('ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT "medium"');
    } catch (e) {
      console.log('⚠️ Tasks migration (sqlite):', e.message);
    }
    console.log('SQLite DB initialized at', dbPath);
  }
  module.exports = { init, runAsync, allAsync, getAsync };
}
