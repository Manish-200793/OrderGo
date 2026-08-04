const express = require('express');
const router = express.Router();
const { getMenuItems, getMenuItem, getDailySpecials, getRecommendations } = require('../controllers/menuController');

router.get('/specials', getDailySpecials);
router.get('/recommendations', getRecommendations);
router.get('/', getMenuItems);
router.get('/:id', getMenuItem);

module.exports = router;
