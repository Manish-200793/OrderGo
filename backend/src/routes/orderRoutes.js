const express = require('express');
const router = express.Router();
const { createOrder, getUserOrders, getOrderDetail, updateOrderStatus, verifyPickup, confirmPayment } = require('../controllers/orderController');
const { authenticate, isAdmin, isStaff } = require('../middleware/auth');

router.post('/', authenticate, createOrder);
router.get('/', authenticate, getUserOrders);
router.get('/:id', authenticate, getOrderDetail);
router.put('/:id/status', authenticate, isAdmin, updateOrderStatus);
router.post('/:id/verify', authenticate, isStaff, verifyPickup);
router.post('/:id/pay', authenticate, confirmPayment);

module.exports = router;
