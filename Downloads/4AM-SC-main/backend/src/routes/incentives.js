const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { listIncentives, createIncentive, adminListAllIncentives, deleteIncentive } = require('../controllers/incentivesController');

router.get('/', authMiddleware, listIncentives);
router.post('/', authMiddleware, createIncentive);
router.get('/all', authMiddleware, adminListAllIncentives);
router.delete('/:id', authMiddleware, deleteIncentive);

module.exports = router;

