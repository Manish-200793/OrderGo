const express = require('express');
const router = express.Router();
const { addMenuItem, updateMenuItem, deleteMenuItem, getAllOrders, getAnalytics, getPopularItems, getPeakHours } = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All admin routes require authentication + admin role
router.use(authenticate, isAdmin);

// Menu management
router.post('/menu', upload.single('image'), addMenuItem);
router.put('/menu/:id', upload.single('image'), updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

// Order management
router.get('/orders', getAllOrders);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/analytics/popular', getPopularItems);
router.get('/analytics/peak-hours', getPeakHours);

module.exports = router;
