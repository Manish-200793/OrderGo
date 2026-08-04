const express = require('express');
const router = express.Router();
const { getStaffOrders, updateStaffOrderStatus, getStaffStats } = require('../controllers/staffController');
const { authenticate, isStaff } = require('../middleware/auth');

// All staff routes require authentication + staff role
router.use(authenticate, isStaff);

router.get('/orders', getStaffOrders);
router.put('/orders/:id/status', updateStaffOrderStatus);
router.get('/stats', getStaffStats);

module.exports = router;
