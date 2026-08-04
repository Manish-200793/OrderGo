const express = require('express');
const router = express.Router();
const { initiatePayment, getPaymentStatus } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.post('/initiate', authenticate, initiatePayment);
router.get('/:orderId', authenticate, getPaymentStatus);

module.exports = router;
