const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;
