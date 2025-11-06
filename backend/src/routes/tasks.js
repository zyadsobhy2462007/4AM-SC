const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { listTasks, createTask, assignTaskToUser, completeTask, getTaskAnalytics, adminListAllTasks, getTaskDetails, deleteTask, updateTaskStatus } = require('../controllers/tasksController');
const { validateTask } = require('../middleware/validation');

router.get('/', authMiddleware, listTasks);
router.post('/', authMiddleware, validateTask, createTask);
router.post('/assign', authMiddleware, validateTask, assignTaskToUser);
router.patch('/:id/complete', authMiddleware, completeTask);
router.get('/analytics', authMiddleware, getTaskAnalytics);
router.get('/all', authMiddleware, adminListAllTasks);
router.get('/:id', authMiddleware, getTaskDetails);
router.delete('/:id', authMiddleware, deleteTask);
router.patch('/:id/status', authMiddleware, updateTaskStatus);

module.exports = router;
