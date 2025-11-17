const { Task, Admin } = require('../models/mongodb');

/**
 * Assign task from one manager to another (MongoDB)
 */
async function assignTaskToManager(req, res) {
  try {
    const assignedBy = req.userId;
    const { assignedTo, title, description, week_start, priority } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ error: 'assignedTo (manager ID) is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Get the current admin (assigner)
    const assigner = await Admin.findById(assignedBy);
    if (!assigner) {
      return res.status(404).json({ error: 'Assigner not found' });
    }

    // Only managers and main_admin can assign tasks to managers
    if (assigner.role !== 'manager' && assigner.role !== 'main_admin') {
      return res.status(403).json({ error: 'forbidden - only managers and main admin can assign tasks to managers' });
    }

    // Get the target manager (assignee)
    const assignee = await Admin.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({ error: 'Target manager not found' });
    }

    // Only managers can be assigned tasks (for manager-to-manager assignments)
    if (assignee.role !== 'manager') {
      return res.status(400).json({ error: 'can only assign tasks to managers' });
    }

    // Create the task
    const task = new Task({
      title,
      description: description || null,
      assignedTo: assignee._id,
      assignedBy: assigner._id,
      status: 'pending',
      priority: priority || 'medium',
      week_start: week_start || null
    });

    await task.save();

    // Populate the task with admin details
    await task.populate('assignedTo', 'name email role');
    await task.populate('assignedBy', 'name email role');

    res.status(201).json({
      message: 'Task assigned successfully',
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        week_start: task.week_start,
        assignedTo: {
          id: assignee._id,
          name: assignee.name,
          email: assignee.email,
          role: assignee.role
        },
        assignedBy: {
          id: assigner._id,
          name: assigner.name,
          email: assigner.email,
          role: assigner.role
        },
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    });
  } catch (error) {
    console.error('Assign task to manager error:', error);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

/**
 * Get tasks assigned to or by the current manager
 */
async function getManagerTasks(req, res) {
  try {
    const managerId = req.userId;
    const { week_start } = req.query;

    const manager = await Admin.findById(managerId);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Only managers and main_admin can view manager tasks
    if (manager.role !== 'manager' && manager.role !== 'main_admin') {
      return res.status(403).json({ error: 'forbidden - manager or main admin access required' });
    }

    // Build query
    let query = {
      $or: [
        { assignedTo: managerId },
        { assignedBy: managerId }
      ]
    };

    if (week_start) {
      query.week_start = new Date(week_start);
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get manager tasks error:', error);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

/**
 * Update task status (for manager tasks)
 */
async function updateManagerTaskStatus(req, res) {
  try {
    const managerId = req.userId;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'in_progress', 'completed'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'invalid status. Must be: pending, in_progress, or completed' });
    }

    const manager = await Admin.findById(managerId);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only the assigned manager or the assigner can update the task
    if (task.assignedTo.toString() !== managerId.toString() && 
        task.assignedBy.toString() !== managerId.toString() &&
        manager.role !== 'main_admin') {
      return res.status(403).json({ error: 'forbidden - can only update tasks assigned to you or by you' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completed_at = new Date();
    } else {
      task.completed_at = null;
    }

    await task.save();

    await task.populate('assignedTo', 'name email role');
    await task.populate('assignedBy', 'name email role');

    res.json({
      message: 'Task status updated successfully',
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        week_start: task.week_start,
        completed_at: task.completed_at,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
        updatedAt: task.updatedAt
      }
    });
  } catch (error) {
    console.error('Update manager task status error:', error);
    res.status(500).json({ 
      error: 'server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

module.exports = {
  assignTaskToManager,
  getManagerTasks,
  updateManagerTaskStatus
};

