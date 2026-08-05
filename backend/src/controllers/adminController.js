const { getDb } = require('../config/database');

/**
 * POST /api/admin/menu — Add menu item
 */
async function addMenuItem(req, res) {
  const db = getDb();
  const { name, description, category, price, stock, is_daily_special } = req.body;

  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category, and price are required.' });
  }

  const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url || null;

  try {
    const [result] = await db.query(`
      INSERT INTO menu_items (name, description, category, price, stock, image_url, is_available, is_daily_special)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `, [name, description || '', category, price, stock || 50, image_url, is_daily_special ? 1 : 0]);

    const [items] = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [result.insertId]);
    res.status(201).json({ message: 'Menu item added.', item: items[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/admin/menu/:id — Update menu item
 */
async function updateMenuItem(req, res) {
  const db = getDb();
  const { id } = req.params;
  const { name, description, category, price, stock, is_available, is_daily_special } = req.body;

  try {
    const [items] = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [id]);
    const item = items[0];
    if (!item) return res.status(404).json({ error: 'Item not found.' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url !== undefined ? req.body.image_url : item.image_url);

    await db.query(`
      UPDATE menu_items SET 
        name = COALESCE(?, name), description = COALESCE(?, description),
        category = COALESCE(?, category), price = COALESCE(?, price),
        stock = COALESCE(?, stock), image_url = COALESCE(?, image_url),
        is_available = COALESCE(?, is_available), is_daily_special = COALESCE(?, is_daily_special)
      WHERE item_id = ?
    `, [
      name || null, description !== undefined ? description : null,
      category || null, price || null, stock !== undefined ? stock : null,
      image_url, is_available !== undefined ? (is_available ? 1 : 0) : null,
      is_daily_special !== undefined ? (is_daily_special ? 1 : 0) : null, id
    ]);

    const [updatedItems] = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [id]);
    res.json({ message: 'Menu item updated.', item: updatedItems[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/admin/menu/:id — Delete menu item
 */
async function deleteMenuItem(req, res) {
  const db = getDb();
  
  try {
    const [items] = await db.query('SELECT * FROM menu_items WHERE item_id = ?', [req.params.id]);
    if (items.length === 0) return res.status(404).json({ error: 'Item not found.' });

    await db.query('DELETE FROM menu_items WHERE item_id = ?', [req.params.id]);
    res.json({ message: 'Menu item deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/orders — All orders with filters
 */
async function getAllOrders(req, res) {
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

  try {
    const [orders] = await db.query(query, params);

    const result = await Promise.all(orders.map(async (order) => {
      const [items] = await db.query(`
        SELECT oi.*, mi.name, mi.image_url
        FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
        WHERE oi.order_id = ?
      `, [order.order_id]);
      
      return {
        ...order,
        items
      };
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/analytics — Dashboard analytics
 */
async function getAnalytics(req, res) {
  const db = getDb();
  const { period } = req.query;

  let dateFilter = '';
  if (period === 'today') dateFilter = "AND DATE(o.created_at) = CURDATE()";
  else if (period === 'week') dateFilter = "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
  else if (period === 'month') dateFilter = "AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

  try {
    const [summaryRows] = await db.query(`
      SELECT COUNT(*) as total_orders,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(AVG(total_price), 0) as avg_order_value
      FROM orders o WHERE status != 'cancelled' ${dateFilter}
    `);
    const summary = summaryRows[0];

    const [byStatus] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM orders o WHERE 1=1 ${dateFilter}
      GROUP BY status
    `);

    const [dailyRevenue] = await db.query(`
      SELECT DATE(created_at) as date, 
        COUNT(*) as orders, 
        SUM(total_price) as revenue
      FROM orders WHERE status != 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const [userCountRows] = await db.query("SELECT COUNT(*) as count FROM students");
    const userCount = userCountRows[0];

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/analytics/popular — Most popular items
 */
async function getPopularItems(req, res) {
  const db = getDb();
  
  try {
    const [items] = await db.query(`
      SELECT mi.item_id, mi.name, mi.category, mi.price, mi.image_url,
        SUM(oi.quantity) as total_sold,
        COALESCE(AVG(f.rating), 0) as avg_rating
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      LEFT JOIN feedback f ON mi.item_id = f.item_id
      GROUP BY mi.item_id, mi.name, mi.category, mi.price, mi.image_url
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    res.json(items.map(i => ({ ...i, avg_rating: Math.round(i.avg_rating * 10) / 10 })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/analytics/peak-hours — Peak ordering hours
 */
async function getPeakHours(req, res) {
  const db = getDb();
  
  try {
    const [hours] = await db.query(`
      SELECT HOUR(created_at) as hour,
        COUNT(*) as order_count
      FROM orders WHERE status != 'cancelled'
      GROUP BY HOUR(created_at) ORDER BY hour
    `);

    res.json(hours);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { addMenuItem, updateMenuItem, deleteMenuItem, getAllOrders, getAnalytics, getPopularItems, getPeakHours };
