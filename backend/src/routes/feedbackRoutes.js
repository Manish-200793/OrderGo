const express = require('express');
const router = express.Router();
const { submitFeedback, getItemFeedback } = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, submitFeedback);
router.get('/item/:itemId', getItemFeedback);

module.exports = router;
