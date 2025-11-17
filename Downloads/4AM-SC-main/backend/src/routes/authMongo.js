const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  me, 
  getAllAdmins, 
  getSubAdmins, 
  deleteAdmin 
} = require('../controllers/authControllerMongo');
const { authMiddleware } = require('../middleware/auth');
const { requireRole, preventSubAdminAccessToMainAdmin } = require('../middleware/rbac');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes - require authentication
router.get('/me', authMiddleware, me);

// Admin routes - require main_admin role
router.get('/admins', authMiddleware, requireRole('main_admin'), getAllAdmins);
router.get('/sub-admins', authMiddleware, requireRole(['main_admin', 'sub_admin']), getSubAdmins);
router.delete('/admins/:id', authMiddleware, requireRole('main_admin'), preventSubAdminAccessToMainAdmin, deleteAdmin);

module.exports = router;


