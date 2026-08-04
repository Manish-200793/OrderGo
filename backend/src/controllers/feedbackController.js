const { getDb } = require('../config/database');

/**
 * POST /api/feedback — Submit feedback for a menu item
 */
function submitFeedback(req, res) {
  const db = getDb();
  const { item_id, order_id, rating, comment } = req.body;
  const userId = req.user.userId;

  if (!item_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Item ID and rating (1-5) are required.' });
  }

  const item = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Menu item not found.' });

  // Check if user already reviewed this item for this order
  if (order_id) {
    const existing = db.prepare('SELECT * FROM feedback WHERE user_id = ? AND item_id = ? AND order_id = ?')
      .get(userId, item_id, order_id);
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this item for this order.' });
    }
  }

  db.prepare('INSERT INTO feedback (user_id, item_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
    .run(userId, item_id, order_id || null, rating, comment || null);

  res.status(201).json({ message: 'Thank you for your feedback!' });
}

/**
 * GET /api/feedback/item/:itemId — Get feedback for a menu item
 */
function getItemFeedback(req, res) {
  const db = getDb();
  const { itemId } = req.params;

  const feedback = db.prepare(`
    SELECT f.*, u.name as user_name
    FROM feedback f JOIN users u ON f.user_id = u.user_id
    WHERE f.item_id = ? ORDER BY f.created_at DESC
  `).all(itemId);

  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
    FROM feedback WHERE item_id = ?
  `).get(itemId);

  res.json({
    stats: {
      avg_rating: stats && stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
      total_reviews: (stats && stats.total_reviews) || 0,
      distribution: {
        5: (stats && stats.five_star) || 0,
        4: (stats && stats.four_star) || 0,
        3: (stats && stats.three_star) || 0,
        2: (stats && stats.two_star) || 0,
        1: (stats && stats.one_star) || 0,
      },
    },
    reviews: feedback,
  });
}

module.exports = { submitFeedback, getItemFeedback };
