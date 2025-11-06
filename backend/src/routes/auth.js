const express = require('express');
const router = express.Router();
const { register, login, me, getAllUsers, getUserStats } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authMiddleware, me);
router.get('/users', authMiddleware, getAllUsers);
router.get('/stats', authMiddleware, getUserStats);

module.exports = router;
