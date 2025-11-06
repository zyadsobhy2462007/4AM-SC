const dbModule = require('../models/db');

async function getComprehensiveReports(req, res) {
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

    // Get task statistics
    let taskStats = {};
    if (isPostgres) {
      const totalTasks = await dbModule.query('SELECT COUNT(*)::int AS c FROM tasks');
      const completedTasks = await dbModule.query('SELECT COUNT(*)::int AS c FROM tasks WHERE status = $1', ['completed']);
      const pendingTasks = await dbModule.query('SELECT COUNT(*)::int AS c FROM tasks WHERE status IN ($1, $2, $3)', ['active', 'in_progress', 'pending']);
      const overdueTasks = await dbModule.query('SELECT COUNT(*)::int AS c FROM tasks WHERE status = $1', ['overdue']);
      
      const inProgressTasks = await dbModule.query('SELECT COUNT(*)::int AS c FROM tasks WHERE status = $1', ['in_progress']);
      taskStats = {
        total: totalTasks.rows[0].c,
        completed: completedTasks.rows[0].c,
        pending: pendingTasks.rows[0].c,
        overdue: overdueTasks.rows[0].c,
        inProgress: inProgressTasks.rows[0].c
      };
    } else {
      const totalTasks = await dbModule.getAsync('SELECT COUNT(*) AS c FROM tasks');
      const completedTasks = await dbModule.getAsync('SELECT COUNT(*) AS c FROM tasks WHERE status = ?', ['completed']);
      const pendingTasks = await dbModule.getAsync('SELECT COUNT(*) AS c FROM tasks WHERE status IN (?, ?, ?)', ['active', 'in_progress', 'pending']);
      const overdueTasks = await dbModule.getAsync('SELECT COUNT(*) AS c FROM tasks WHERE status = ?', ['overdue']);
      const inProgressTasks = await dbModule.getAsync('SELECT COUNT(*) AS c FROM tasks WHERE status = ?', ['in_progress']);
      
      taskStats = {
        total: totalTasks.c,
        completed: completedTasks.c,
        pending: pendingTasks.c,
        overdue: overdueTasks.c,
        inProgress: inProgressTasks.c
      };
    }

    // Get incentive statistics
    let incentiveStats = {};
    if (isPostgres) {
      const totalBonuses = await dbModule.query('SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0)::numeric AS total FROM incentives WHERE type = $1', ['bonus']);
      const totalDeductions = await dbModule.query('SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0)::numeric AS total FROM incentives WHERE type = $1', ['deduction']);
      
      incentiveStats = {
        bonuses: {
          count: totalBonuses.rows[0].c,
          total: parseFloat(totalBonuses.rows[0].total) || 0
        },
        deductions: {
          count: totalDeductions.rows[0].c,
          total: parseFloat(totalDeductions.rows[0].total) || 0
        },
        net: (parseFloat(totalBonuses.rows[0].total) || 0) - (parseFloat(totalDeductions.rows[0].total) || 0)
      };
    } else {
      const totalBonuses = await dbModule.getAsync('SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS total FROM incentives WHERE type = ?', ['bonus']);
      const totalDeductions = await dbModule.getAsync('SELECT COUNT(*) AS c, COALESCE(SUM(amount), 0) AS total FROM incentives WHERE type = ?', ['deduction']);
      
      incentiveStats = {
        bonuses: {
          count: totalBonuses.c,
          total: parseFloat(totalBonuses.total) || 0
        },
        deductions: {
          count: totalDeductions.c,
          total: parseFloat(totalDeductions.total) || 0
        },
        net: (parseFloat(totalBonuses.total) || 0) - (parseFloat(totalDeductions.total) || 0)
      };
    }

    // Get employee performance
    let employeePerformance = [];
    if (isPostgres) {
      const perf = await dbModule.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(t.id)::int AS total_tasks,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END)::int AS completed_tasks,
          SUM(CASE WHEN t.status IN ('active', 'in_progress', 'pending') THEN 1 ELSE 0 END)::int AS pending_tasks,
          COUNT(i.id)::int AS total_incentives,
          COALESCE(SUM(CASE WHEN i.type = 'bonus' THEN i.amount ELSE 0 END), 0)::numeric AS total_bonuses,
          COALESCE(SUM(CASE WHEN i.type = 'deduction' THEN i.amount ELSE 0 END), 0)::numeric AS total_deductions
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id
        LEFT JOIN incentives i ON i.user_id = u.id
        WHERE u.user_type = 'employee'
        GROUP BY u.id, u.name, u.email
        ORDER BY u.name ASC
      `);
      employeePerformance = perf.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        totalTasks: r.total_tasks,
        completedTasks: r.completed_tasks,
        pendingTasks: r.pending_tasks,
        completionRate: r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0,
        totalIncentives: r.total_incentives,
        totalBonuses: parseFloat(r.total_bonuses) || 0,
        totalDeductions: parseFloat(r.total_deductions) || 0,
        netIncentives: (parseFloat(r.total_bonuses) || 0) - (parseFloat(r.total_deductions) || 0)
      }));
    } else {
      const perf = await dbModule.allAsync(`
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(t.id) AS total_tasks,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
          SUM(CASE WHEN t.status IN ('active', 'in_progress', 'pending') THEN 1 ELSE 0 END) AS pending_tasks,
          COUNT(i.id) AS total_incentives,
          COALESCE(SUM(CASE WHEN i.type = 'bonus' THEN i.amount ELSE 0 END), 0) AS total_bonuses,
          COALESCE(SUM(CASE WHEN i.type = 'deduction' THEN i.amount ELSE 0 END), 0) AS total_deductions
        FROM users u
        LEFT JOIN tasks t ON t.user_id = u.id
        LEFT JOIN incentives i ON i.user_id = u.id
        WHERE u.user_type = 'employee'
        GROUP BY u.id, u.name, u.email
        ORDER BY u.name ASC
      `);
      employeePerformance = perf.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        totalTasks: r.total_tasks,
        completedTasks: r.completed_tasks,
        pendingTasks: r.pending_tasks,
        completionRate: r.total_tasks > 0 ? Math.round((r.completed_tasks / r.total_tasks) * 100) : 0,
        totalIncentives: r.total_incentives,
        totalBonuses: parseFloat(r.total_bonuses) || 0,
        totalDeductions: parseFloat(r.total_deductions) || 0,
        netIncentives: (parseFloat(r.total_bonuses) || 0) - (parseFloat(r.total_deductions) || 0)
      }));
    }

    res.json({
      tasks: taskStats,
      incentives: incentiveStats,
      employeePerformance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}

module.exports = { getComprehensiveReports };

