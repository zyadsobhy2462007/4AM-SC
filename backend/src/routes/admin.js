const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAdminProfile, 
  getAllSubAdmins, 
  createSubAdmin, 
  updateSubAdmin, 
  deleteSubAdmin,
  getAllManagers
} = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const { requireMainAdmin, requireSubAdmin, enforceSubAdminAccess, preventSubAdminMainAdminInteraction } = require('../middleware/rbac');

// Public routes
router.post('/login', adminLogin);

// Protected routes - require authentication
router.get('/profile', authMiddleware, getAdminProfile);

// Sub-admin routes - can access their own profile and see siblings
router.get('/sub-admins', authMiddleware, getAllSubAdmins);

// Manager routes - get all managers for task assignment
router.get('/managers', authMiddleware, getAllManagers);

// Manager task routes
const { assignTaskToManager, getManagerTasks, updateManagerTaskStatus } = require('../controllers/taskControllerMongo');
router.post('/tasks/assign', authMiddleware, assignTaskToManager);
router.get('/tasks', authMiddleware, getManagerTasks);
router.patch('/tasks/:id/status', authMiddleware, updateManagerTaskStatus);

// Main admin only routes
router.post('/sub-admins', authMiddleware, requireMainAdmin, createSubAdmin);
router.put('/sub-admins/:id', authMiddleware, enforceSubAdminAccess, preventSubAdminMainAdminInteraction, updateSubAdmin);
router.delete('/sub-admins/:id', authMiddleware, requireMainAdmin, deleteSubAdmin);

module.exports = router;

