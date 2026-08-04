const { getDb } = require('../config/database');

/**
 * POST /api/admin/menu — Add menu item
 */
function addMenuItem(req, res) {
  const db = getDb();
  const { name, description, category, price, stock, is_daily_special } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category, and price are required.' });
  }

  const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || null;

  const result = db.prepare(`
    INSERT INTO menu_items (name, description, category, price, stock, image_url, is_available, is_daily_special)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(name, description || '', category, price, stock || 50, image_url, is_daily_special ? 1 : 0);

  const item = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Menu item added.', item });
}

/**
 * PUT /api/admin/menu/:id — Update menu item
 */
function updateMenuItem(req, res) {
  const db = getDb();
  const { id } = req.params;
  const { name, description, category, price, stock, is_available, is_daily_special } = req.body;

  const item = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url !== undefined ? req.body.image_url : item.image_url);

  db.prepare(`
    UPDATE menu_items SET 
      name = COALESCE(?, name), description = COALESCE(?, description),
      category = COALESCE(?, category), price = COALESCE(?, price),
      stock = COALESCE(?, stock), image_url = COALESCE(?, image_url),
      is_available = COALESCE(?, is_available), is_daily_special = COALESCE(?, is_daily_special)
    WHERE item_id = ?
  `).run(
    name || null, description !== undefined ? description : null,
    category || null, price || null, stock !== undefined ? stock : null,
    image_url, is_available !== undefined ? (is_available ? 1 : 0) : null,
    is_daily_special !== undefined ? (is_daily_special ? 1 : 0) : null, id
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(id);
  res.json({ message: 'Menu item updated.', item: updated });
}

/**
 * DELETE /api/admin/menu/:id — Delete menu item
 */
function deleteMenuItem(req, res) {
  const db = getDb();
  const item = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found.' });

  db.prepare('DELETE FROM menu_items WHERE item_id = ?').run(req.params.id);
  res.json({ message: 'Menu item deleted.' });
}

/**
 * GET /api/admin/orders — All orders with filters
 */
function getAllOrders(req, res) {
  const db = getDb();
  const { status, date } = req.query;

  let query = `
    SELECT o.*, u.email as user_email,
           COALESCE(s.name, a.name, st.name) as user_name
    FROM orders o 
    JOIN users u ON o.user_id = u.user_id
    LEFT JOIN students s ON u.user_id = s.student_id
    LEFT JOIN admins a ON u.user_id = a.admin_id
    LEFT JOIN staff st ON u.user_id = st.staff_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }

  if (date) {
    query += ' AND DATE(o.created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);

  const result = orders.map(order => ({
    ...order,
    items: db.prepare(`
      SELECT oi.*, mi.name, mi.image_url
      FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id = ?
    `).all(order.order_id),
  }));

  res.json(result);
}

/**
 * GET /api/admin/analytics — Dashboard analytics
 */
function getAnalytics(req, res) {
  const db = getDb();
  const { period } = req.query;

  let dateFilter = '';
  if (period === 'today') dateFilter = "AND DATE(o.created_at) = DATE('now')";
  else if (period === 'week') dateFilter = "AND o.created_at >= DATE('now', '-7 days')";
  else if (period === 'month') dateFilter = "AND o.created_at >= DATE('now', '-30 days')";

  const summary = db.prepare(`
    SELECT COUNT(*) as total_orders,
      COALESCE(SUM(total_price), 0) as total_revenue,
      COALESCE(AVG(total_price), 0) as avg_order_value
    FROM orders o WHERE status != 'cancelled' ${dateFilter}
  `).get();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM orders o WHERE 1=1 ${dateFilter}
    GROUP BY status
  `).all();

  const dailyRevenue = db.prepare(`
    SELECT DATE(created_at) as date, 
      COUNT(*) as orders, 
      SUM(total_price) as revenue
    FROM orders WHERE status != 'cancelled' AND created_at >= DATE('now', '-7 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all();

  const userCount = db.prepare("SELECT COUNT(*) as count FROM students").get();

  res.json({
    summary: {
      total_orders: (summary && summary.total_orders) || 0,
      total_revenue: (summary && summary.total_revenue) || 0,
      avg_order_value: summary ? Math.round((summary.avg_order_value || 0) * 100) / 100 : 0,
      total_users: (userCount && userCount.count) || 0,
    },
    by_status: byStatus,
    daily_revenue: dailyRevenue,
  });
}

/**
 * GET /api/admin/analytics/popular — Most popular items
 */
function getPopularItems(req, res) {
  const db = getDb();
  const items = db.prepare(`
    SELECT mi.item_id, mi.name, mi.category, mi.price, mi.image_url,
      SUM(oi.quantity) as total_sold,
      COALESCE(AVG(f.rating), 0) as avg_rating
    FROM order_items oi
    JOIN menu_items mi ON oi.item_id = mi.item_id
    LEFT JOIN feedback f ON mi.item_id = f.item_id
    GROUP BY mi.item_id
    ORDER BY total_sold DESC
    LIMIT 10
  `).all();

  res.json(items.map(i => ({ ...i, avg_rating: Math.round(i.avg_rating * 10) / 10 })));
}

/**
 * GET /api/admin/analytics/peak-hours — Peak ordering hours
 */
function getPeakHours(req, res) {
  const db = getDb();
  const hours = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as order_count
    FROM orders WHERE status != 'cancelled'
    GROUP BY hour ORDER BY hour
  `).all();

  res.json(hours);
}

module.exports = { addMenuItem, updateMenuItem, deleteMenuItem, getAllOrders, getAnalytics, getPopularItems, getPeakHours };
