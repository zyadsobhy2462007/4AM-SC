const dbModule = require('../models/db');

async function listIncentives(req, res) {
  try {
    const userId = req.userId;
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));

    if (isPostgres) {
      const result = await dbModule.query(`
        SELECT i.id, i.user_id, i.type, i.amount, i.reason, i.created_by, i.created_at,
               u.name AS user_name, u.email AS user_email,
               c.name AS created_by_name
        FROM incentives i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN users c ON c.id = i.created_by
        WHERE i.user_id = $1
        ORDER BY i.created_at DESC
      `, [userId]);
      res.json({ incentives: result.rows });
    } else if (isMySQL) {
      const rows = await dbModule.allAsync(`
        SELECT i.id, i.user_id, i.type, i.amount, i.reason, i.created_by, i.created_at,
               u.name AS user_name, u.email AS user_email,
               c.name AS created_by_name
        FROM incentives i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN users c ON c.id = i.created_by
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
      `, [userId]);
      res.json({ incentives: rows });
    } else {
      const rows = await dbModule.allAsync(`
        SELECT i.id, i.user_id, i.type, i.amount, i.reason, i.created_by, i.created_at,
               u.name AS user_name, u.email AS user_email,
               c.name AS created_by_name
        FROM incentives i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN users c ON c.id = i.created_by
        WHERE i.user_id = ?
        ORDER BY i.created_at DESC
      `, [userId]);
      res.json({ incentives: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function createIncentive(req, res) {
  try {
    const adminId = req.userId;
    const { user_id, type, amount, reason } = req.body;
    
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (!type || !['bonus', 'deduction'].includes(type)) return res.status(400).json({ error: 'type must be bonus or deduction' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!reason) return res.status(400).json({ error: 'reason required' });

    // authorize admin
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    let currentUser;
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [adminId]);
      currentUser = result.rows[0];
    } else if (isMySQL) {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    } else {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    }
    if (!currentUser || currentUser.user_type !== 'admin') {
      return res.status(403).json({ error: 'forbidden - admin access required' });
    }

    if (isPostgres) {
      const result = await dbModule.query(
        'INSERT INTO incentives(user_id,type,amount,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,user_id,type,amount,reason,created_by,created_at',
        [user_id, type, amount, reason, adminId]
      );
      res.json({ incentive: result.rows[0] });
    } else if (isMySQL) {
      const info = await dbModule.runAsync('INSERT INTO incentives(user_id,type,amount,reason,created_by) VALUES(?,?,?,?,?)', [user_id, type, amount, reason, adminId]);
      const id = info.lastID;
      const incentive = await dbModule.getAsync('SELECT id,user_id,type,amount,reason,created_by,created_at FROM incentives WHERE id = ?', [id]);
      res.json({ incentive });
    } else {
      const info = await dbModule.runAsync('INSERT INTO incentives(user_id,type,amount,reason,created_by) VALUES(?,?,?,?,?)', [user_id, type, amount, reason, adminId]);
      const id = info.lastID;
      const incentive = await dbModule.getAsync('SELECT id,user_id,type,amount,reason,created_by,created_at FROM incentives WHERE id = ?', [id]);
      res.json({ incentive });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function adminListAllIncentives(req, res) {
  try {
    const adminId = req.userId;
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    
    // authorize admin
    let currentUser;
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [adminId]);
      currentUser = result.rows[0];
    } else if (isMySQL) {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    } else {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    }
    if (!currentUser || currentUser.user_type !== 'admin') {
      return res.status(403).json({ error: 'forbidden - admin access required' });
    }
    
    if (isPostgres) {
      const result = await dbModule.query(`
        SELECT i.id, i.user_id, i.type, i.amount, i.reason, i.created_by, i.created_at,
               u.name AS user_name, u.email AS user_email,
               c.name AS created_by_name
        FROM incentives i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN users c ON c.id = i.created_by
        ORDER BY i.created_at DESC
      `);
      return res.json({ incentives: result.rows });
    } else {
      const rows = await dbModule.allAsync(`
        SELECT i.id, i.user_id, i.type, i.amount, i.reason, i.created_by, i.created_at,
               u.name AS user_name, u.email AS user_email,
               c.name AS created_by_name
        FROM incentives i
        LEFT JOIN users u ON u.id = i.user_id
        LEFT JOIN users c ON c.id = i.created_by
        ORDER BY i.created_at DESC
      `);
      return res.json({ incentives: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function deleteIncentive(req, res) {
  try {
    const adminId = req.userId;
    const { id } = req.params;
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    
    // authorize admin
    let currentUser;
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [adminId]);
      currentUser = result.rows[0];
    } else if (isMySQL) {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    } else {
      currentUser = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [adminId]);
    }
    if (!currentUser || currentUser.user_type !== 'admin') {
      return res.status(403).json({ error: 'forbidden - admin access required' });
    }
    
    if (isPostgres) {
      await dbModule.query('DELETE FROM incentives WHERE id = $1', [id]);
    } else {
      await dbModule.runAsync('DELETE FROM incentives WHERE id = ?', [id]);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

module.exports = { listIncentives, createIncentive, adminListAllIncentives, deleteIncentive };

