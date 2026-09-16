const { getDb } = require('../config/database');
const NodeCache = require('node-cache');

const menuCache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes

/**
 * GET /api/menu — List all menu items with optional filters
 */
async function getMenuItems(req, res) {
  const db = getDb();
  const { category, search, available } = req.query;

  const cacheKey = `menu_${category || 'all'}_${search || 'none'}_${available !== undefined ? available : 'all'}`;
  const cachedData = menuCache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  let query = 'SELECT * FROM menu_items WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (available !== undefined) {
    query += ' AND is_available = ?';
    params.push(available === 'true' ? 1 : 0);
  }

  query += ' ORDER BY is_daily_special DESC, category, name';

  try {
    const [items] = await db.query(query, params);

    // Attach average ratings
    const [ratings] = await db.query(`
      SELECT item_id, AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM feedback GROUP BY item_id
    `);
    
    const ratingMap = {};
    ratings.forEach(r => {
      ratingMap[r.item_id] = { avg_rating: Math.round(r.avg_rating * 10) / 10, review_count: r.review_count };
    });

    const result = items.map(item => ({
      ...item,
      is_available: !!item.is_available,
      is_daily_special: !!item.is_daily_special,
      avg_rating: ratingMap[item.item_id]?.avg_rating || 0,
      review_count: ratingMap[item.item_id]?.review_count || 0,
    }));

    menuCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/menu/:id — Single item with feedback
 */
async function getMenuItem(req, res) {
  const db = getDb();
  
  try {
    const [items] = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [req.params.id]);
    const item = items[0];
    
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const [feedback] = await db.query(`
      SELECT f.*, COALESCE(s.name, a.name, st.name) as user_name 
      FROM feedback f 
      JOIN users u ON f.user_id = u.user_id 
      LEFT JOIN students s ON u.user_id = s.student_id
      LEFT JOIN admins a ON u.user_id = a.admin_id
      LEFT JOIN staff st ON u.user_id = st.staff_id
      WHERE f.item_id = ? ORDER BY f.created_at DESC LIMIT 10
    `, [req.params.id]);

    const [statsRows] = await db.query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM feedback WHERE item_id = ?
    `, [req.params.id]);
    
    const stats = statsRows[0];

    res.json({
      ...item,
      is_available: !!item.is_available,
      is_daily_special: !!item.is_daily_special,
      avg_rating: stats && stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
      review_count: (stats && stats.review_count) || 0,
      feedback,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/menu/specials — Daily specials
 */
async function getDailySpecials(req, res) {
  const db = getDb();
  try {
    const [specials] = await db.query('SELECT * FROM menu_items WHERE is_daily_special = 1 AND is_available = 1');
    res.json(specials.map(s => ({ ...s, is_available: true, is_daily_special: true })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/menu/recommendations — AI recommendations based on popularity & sales
 */
async function getRecommendations(req, res) {
  const db = getDb();
  try {
    const [items] = await db.query(`
      SELECT mi.*, 
        COALESCE(order_stats.total_ordered, 0) as total_ordered,
        COALESCE(rating_stats.avg_rating, 0) as avg_rating,
        COALESCE(rating_stats.review_count, 0) as review_count,
        (COALESCE(order_stats.total_ordered, 0) * 2 + COALESCE(rating_stats.avg_rating, 0) * 3 + mi.is_daily_special * 5) as popularity_score
      FROM menu_items mi
      LEFT JOIN (
        SELECT item_id, SUM(quantity) as total_ordered
        FROM order_items GROUP BY item_id
      ) order_stats ON mi.item_id = order_stats.item_id
      LEFT JOIN (
        SELECT item_id, AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM feedback GROUP BY item_id
      ) rating_stats ON mi.item_id = rating_stats.item_id
      WHERE mi.is_available = 1
      ORDER BY popularity_score DESC
      LIMIT 6
    `);

    res.json(items.map(item => ({
      ...item,
      is_available: true,
      is_daily_special: !!item.is_daily_special,
      avg_rating: item.avg_rating ? Math.round(item.avg_rating * 10) / 10 : 0,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getMenuItems, getMenuItem, getDailySpecials, getRecommendations };
