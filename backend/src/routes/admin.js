const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAdminProfile, 
  getAllSubAdmins, 
  createSubAdmin, 
  updateSubAdmin, 
  deleteSubAdmin 
} = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const { requireMainAdmin, requireSubAdmin, enforceSubAdminAccess } = require('../middleware/rbac');

// Public routes
router.post('/login', adminLogin);

// Protected routes - require authentication
router.get('/profile', authMiddleware, getAdminProfile);

// Sub-admin routes - can access their own profile
router.get('/sub-admins', authMiddleware, getAllSubAdmins);

// Main admin only routes
router.post('/sub-admins', authMiddleware, requireMainAdmin, createSubAdmin);
router.put('/sub-admins/:id', authMiddleware, enforceSubAdminAccess, updateSubAdmin);
router.delete('/sub-admins/:id', authMiddleware, requireMainAdmin, deleteSubAdmin);

module.exports = router;

