const dbModule = require('../models/db');

async function listTasks(req, res) {
  try {
    const userId = req.userId;
    const { week_start } = req.query;
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));

    // Determine requester role
    let userType = 'employee';
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [userId]);
      userType = result.rows[0]?.user_type || 'employee';
    } else {
      const row = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [userId]);
      userType = row?.user_type || 'employee';
    }

    if (isPostgres) {
      const params = [userId];
      let where = 'WHERE t.user_id = $1';
      if (userType === 'assistant') {
        where = 'WHERE (t.user_id = $1 OR t.assigned_by = $1)';
      }
      if (week_start) {
        params.push(week_start);
        where += ` AND t.week_start = $${params.length}`;
      }
      const result = await dbModule.query(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        ${where} ORDER BY t.created_at DESC
      `, params);
      res.json({ tasks: result.rows });
    } else if (isMySQL) {
      const params = [userId];
      let where = 'WHERE t.user_id = ?';
      if (userType === 'assistant') {
        where = 'WHERE (t.user_id = ? OR t.assigned_by = ?)';
        params.push(userId);
      }
      if (week_start) {
        params.push(week_start);
        where += ' AND t.week_start = ?';
      }
      const rows = await dbModule.allAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        ${where} ORDER BY t.created_at DESC
      `, params);
      res.json({ tasks: rows });
    } else {
      const params = [userId];
      let where = 'WHERE t.user_id = ?';
      if (userType === 'assistant') {
        where = 'WHERE (t.user_id = ? OR t.assigned_by = ?)';
        params.push(userId);
      }
      if (week_start) {
        params.push(week_start);
        where += ' AND t.week_start = ?';
      }
      const rows = await dbModule.allAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        ${where} ORDER BY t.created_at DESC
      `, params);
      res.json({ tasks: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function createTask(req, res) {
  try {
    const { title, description, week_start, user_id, priority } = req.body;
    const userId = req.userId;
    if (!title) return res.status(400).json({ error: 'title required' });
    
    // Use provided user_id if given (for assignment), otherwise use current user's ID
    const taskUserId = user_id ? Number(user_id) : userId;
    const taskPriority = priority || 'medium';
    const assignedBy = user_id ? userId : null; // Set assigned_by if assigning to another user
    
    if (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))) {
      const result = await dbModule.query('INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at', [taskUserId, title, description || null, week_start || null, assignedBy, taskPriority]);
      res.json({ task: result.rows[0] });
    } else if (process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'))) {
      const info = await dbModule.runAsync('INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES(?,?,?,?,?,?)', [taskUserId, title, description || null, week_start || null, assignedBy, taskPriority]);
      const id = info.lastID;
      const task = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task });
    } else {
      const info = await dbModule.runAsync('INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES(?,?,?,?,?,?)', [taskUserId, title, description || null, week_start || null, assignedBy, taskPriority]);
      const id = info.lastID;
      const task = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function assignTaskToUser(req, res) {
  try {
    const adminId = req.userId;
    const { user_id, title, description, week_start, priority } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (!title) return res.status(400).json({ error: 'title required' });

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
    // Allow both admin and assistant to assign tasks
    if (!currentUser || (currentUser.user_type !== 'admin' && currentUser.user_type !== 'assistant')) {
      return res.status(403).json({ error: 'forbidden - admin or assistant access required' });
    }

    const taskPriority = priority || 'medium';

    if (isPostgres) {
      const result = await dbModule.query(
        'INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at',
        [user_id, title, description || null, week_start || null, adminId, taskPriority]
      );
      res.json({ task: result.rows[0] });
    } else if (isMySQL) {
      const info = await dbModule.runAsync('INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES(?,?,?,?,?,?)', [user_id, title, description || null, week_start || null, adminId, taskPriority]);
      const id = info.lastID;
      const task = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task });
    } else {
      const info = await dbModule.runAsync('INSERT INTO tasks(user_id,title,description,week_start,assigned_by,priority) VALUES(?,?,?,?,?,?)', [user_id, title, description || null, week_start || null, adminId, taskPriority]);
      const id = info.lastID;
      const task = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function completeTask(req, res) {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));

    // ensure task belongs to user
    let task;
    if (isPostgres) {
      const t = await dbModule.query('SELECT id,user_id FROM tasks WHERE id = $1', [id]);
      task = t.rows[0];
    } else {
      task = await dbModule.getAsync('SELECT id,user_id FROM tasks WHERE id = ?', [id]);
    }
    if (!task || task.user_id !== Number(userId)) return res.status(404).json({ error: 'not found' });

    if (isPostgres) {
      await dbModule.query('UPDATE tasks SET status = $1, completed_at = NOW() WHERE id = $2', ['completed', id]);
      const result = await dbModule.query('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = $1', [id]);
      res.json({ task: result.rows[0] });
    } else if (isMySQL) {
      await dbModule.runAsync('UPDATE tasks SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', id]);
      const updated = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task: updated });
    } else {
      await dbModule.runAsync('UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', id]);
      const updated = await dbModule.getAsync('SELECT id,user_id,title,description,status,week_start,assigned_by,priority,created_at,completed_at FROM tasks WHERE id = ?', [id]);
      res.json({ task: updated });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function getTaskAnalytics(req, res) {
  try {
    const adminId = req.userId;
    const { week_start } = req.query;
    const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');
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

    // overall counts
    let totals = { assigned: 0, completed: 0, completion_rate: 0 };
    let perUser = [];
    if (isPostgres) {
      const params = [];
      let where = '';
      if (week_start) { where = 'WHERE week_start = $1'; params.push(week_start); }
      const assigned = await dbModule.query(`SELECT COUNT(*)::int AS c FROM tasks ${where}`, params);
      const completed = await dbModule.query(`SELECT COUNT(*)::int AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status = 'completed'`, params);
      totals.assigned = assigned.rows[0].c; totals.completed = completed.rows[0].c; totals.completion_rate = totals.assigned ? Math.round((totals.completed / totals.assigned) * 100) : 0;
      const per = await dbModule.query(`
        SELECT u.id as user_id, u.name, 
               COUNT(t.id)::int AS assigned,
               SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)::int AS completed
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id ${week_start ? 'AND t.week_start = $1' : ''}
        GROUP BY u.id, u.name
        ORDER BY u.name ASC
      `, params);
      perUser = per.rows.map(r => ({ ...r, completion_rate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 }));
    } else if (isMySQL) {
      const params = [];
      let where = '';
      if (week_start) { where = 'WHERE week_start = ?'; params.push(week_start); }
      const assigned = await dbModule.getAsync(`SELECT COUNT(*) AS c FROM tasks ${where}`, params);
      const completed = await dbModule.getAsync(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status = 'completed'`, params);
      totals.assigned = assigned.c; totals.completed = completed.c; totals.completion_rate = totals.assigned ? Math.round((totals.completed / totals.assigned) * 100) : 0;
      const per = await dbModule.allAsync(`
        SELECT u.id as user_id, u.name,
               COUNT(t.id) AS assigned,
               SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id ${week_start ? 'AND t.week_start = ?' : ''}
        GROUP BY u.id, u.name
        ORDER BY u.name ASC
      `, params);
      perUser = per.map(r => ({ ...r, completion_rate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 }));
    } else {
      const params = [];
      let where = '';
      if (week_start) { where = 'WHERE week_start = ?'; params.push(week_start); }
      const assigned = await dbModule.getAsync(`SELECT COUNT(*) AS c FROM tasks ${where}`, params);
      const completed = await dbModule.getAsync(`SELECT COUNT(*) AS c FROM tasks ${where ? where + ' AND' : 'WHERE'} status = 'completed'`, params);
      totals.assigned = assigned.c; totals.completed = completed.c; totals.completion_rate = totals.assigned ? Math.round((totals.completed / totals.assigned) * 100) : 0;
      const per = await dbModule.allAsync(`
        SELECT u.id as user_id, u.name,
               COUNT(t.id) AS assigned,
               SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id ${week_start ? 'AND t.week_start = ?' : ''}
        GROUP BY u.id, u.name
        ORDER BY u.name ASC
      `, params);
      perUser = per.map(r => ({ ...r, completion_rate: r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0 }));
    }

    res.json({ totals, perUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function adminListAllTasks(req, res) {
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
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        ORDER BY t.created_at DESC
      `);
      return res.json({ tasks: result.rows });
    } else {
      const rows = await dbModule.allAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        ORDER BY t.created_at DESC
      `);
      return res.json({ tasks: rows });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function getTaskDetails(req, res) {
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
      const result = await dbModule.query(`
        SELECT t.*, u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = $1
      `, [id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'not found' });
      return res.json({ task: result.rows[0] });
    } else {
      const row = await dbModule.getAsync(`
        SELECT t.*, u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
      `, [id]);
      if (!row) return res.status(404).json({ error: 'not found' });
      return res.json({ task: row });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function deleteTask(req, res) {
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
      await dbModule.query('DELETE FROM tasks WHERE id = $1', [id]);
    } else {
      await dbModule.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const requesterId = req.userId;
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'in_progress', 'completed'];
    if (!allowed.includes((status || '').toLowerCase())) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));
    // load task
    let task;
    if (isPostgres) {
      const t = await dbModule.query('SELECT id,user_id FROM tasks WHERE id = $1', [id]);
      task = t.rows[0];
    } else {
      task = await dbModule.getAsync('SELECT id,user_id FROM tasks WHERE id = ?', [id]);
    }
    if (!task) return res.status(404).json({ error: 'not found' });
    // Check if requester is admin, assistant, or the owner
    let userType = null;
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [requesterId]);
      userType = result.rows[0]?.user_type;
    } else {
      const u = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [requesterId]);
      userType = u?.user_type;
    }
    const isAdminOrAssistant = userType === 'admin' || userType === 'assistant';
    if (!isAdminOrAssistant && task.user_id !== Number(requesterId)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const lower = status.toLowerCase();
    if (isPostgres) {
      await dbModule.query('UPDATE tasks SET status = $1, completed_at = CASE WHEN $1 = $2 THEN NOW() ELSE NULL END WHERE id = $3', [lower, 'completed', id]);
      const r = await dbModule.query(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = $1
      `, [id]);
      return res.json({ task: r.rows[0] });
    } else if (isMySQL) {
      await dbModule.runAsync('UPDATE tasks SET status = ?, completed_at = CASE WHEN ? = "completed" THEN NOW() ELSE NULL END WHERE id = ?', [lower, lower, id]);
      const row = await dbModule.getAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
      `, [id]);
      return res.json({ task: row });
    } else {
      // sqlite lacks CASE with NOW(); use CURRENT_TIMESTAMP
      if (lower === 'completed') {
        await dbModule.runAsync('UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [lower, id]);
      } else {
        await dbModule.runAsync('UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?', [lower, id]);
      }
      const row = await dbModule.getAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
      `, [id]);
      return res.json({ task: row });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

// Update task details (title, description, week_start, priority, assigned user)
async function updateTask(req, res) {
  try {
    const requesterId = req.userId;
    const { id } = req.params;
    const { title, description, week_start, priority, user_id } = req.body;

    const isPostgres = process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'));
    const isMySQL = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://'));

    // Load task
    let task;
    if (isPostgres) {
      const t = await dbModule.query('SELECT id,user_id FROM tasks WHERE id = $1', [id]);
      task = t.rows[0];
    } else {
      task = await dbModule.getAsync('SELECT id,user_id FROM tasks WHERE id = ?', [id]);
    }
    if (!task) return res.status(404).json({ error: 'not found' });

    // Check permission: admin or assistant can edit any; owner can edit own
    let userType = null;
    if (isPostgres) {
      const result = await dbModule.query('SELECT user_type FROM users WHERE id = $1', [requesterId]);
      userType = result.rows[0]?.user_type;
    } else {
      const u = await dbModule.getAsync('SELECT user_type FROM users WHERE id = ?', [requesterId]);
      userType = u?.user_type;
    }
    const isAdminOrAssistant = userType === 'admin' || userType === 'assistant';
    if (!isAdminOrAssistant && task.user_id !== Number(requesterId)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Build dynamic update
    const newPriority = priority || null;
    const newWeekStart = week_start || null;
    const newTitle = typeof title === 'string' ? title : null;
    const newDescription = typeof description === 'string' ? description : null;
    const newUserId = user_id !== undefined ? Number(user_id) : null;

    if (isPostgres) {
      const fields = [];
      const params = [];
      let idx = 1;
      if (newTitle !== null) { fields.push(`title = $${idx++}`); params.push(newTitle); }
      if (newDescription !== null) { fields.push(`description = $${idx++}`); params.push(newDescription); }
      if (newWeekStart !== null) { fields.push(`week_start = $${idx++}`); params.push(newWeekStart); }
      if (newPriority !== null) { fields.push(`priority = $${idx++}`); params.push(newPriority); }
      if (newUserId !== null) { fields.push(`user_id = $${idx++}`); params.push(newUserId); }
      if (fields.length === 0) return res.status(400).json({ error: 'no fields to update' });
      params.push(id);
      await dbModule.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`, params);
      const r = await dbModule.query(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = $1
      `, [id]);
      return res.json({ task: r.rows[0] });
    } else if (isMySQL) {
      const sets = [];
      const params = [];
      if (newTitle !== null) { sets.push('title = ?'); params.push(newTitle); }
      if (newDescription !== null) { sets.push('description = ?'); params.push(newDescription); }
      if (newWeekStart !== null) { sets.push('week_start = ?'); params.push(newWeekStart); }
      if (newPriority !== null) { sets.push('priority = ?'); params.push(newPriority); }
      if (newUserId !== null) { sets.push('user_id = ?'); params.push(newUserId); }
      if (sets.length === 0) return res.status(400).json({ error: 'no fields to update' });
      params.push(id);
      await dbModule.runAsync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
      const row = await dbModule.getAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
      `, [id]);
      return res.json({ task: row });
    } else {
      const sets = [];
      const params = [];
      if (newTitle !== null) { sets.push('title = ?'); params.push(newTitle); }
      if (newDescription !== null) { sets.push('description = ?'); params.push(newDescription); }
      if (newWeekStart !== null) { sets.push('week_start = ?'); params.push(newWeekStart); }
      if (newPriority !== null) { sets.push('priority = ?'); params.push(newPriority); }
      if (newUserId !== null) { sets.push('user_id = ?'); params.push(newUserId); }
      if (sets.length === 0) return res.status(400).json({ error: 'no fields to update' });
      params.push(id);
      await dbModule.runAsync(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
      const row = await dbModule.getAsync(`
        SELECT t.id, t.user_id, t.title, t.description, t.status, t.week_start, t.assigned_by, t.priority, t.created_at, t.completed_at,
               u.name AS user_name, u.email AS user_email,
               a.name AS assigned_by_name, a.email AS assigned_by_email
        FROM tasks t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN users a ON a.id = t.assigned_by
        WHERE t.id = ?
      `, [id]);
      return res.json({ task: row });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

module.exports = { listTasks, createTask, assignTaskToUser, completeTask, getTaskAnalytics, adminListAllTasks, getTaskDetails, deleteTask, updateTaskStatus, updateTask };
