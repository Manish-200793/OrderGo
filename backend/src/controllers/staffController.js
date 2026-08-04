const { getDb } = require('../config/database');

/**
 * GET /api/staff/orders — Get orders for staff dashboard
 * Returns active orders with customer info (name, roll_number) and items
 */
function getStaffOrders(req, res) {
  const db = getDb();
  const { status } = req.query;

  let query = `
    SELECT o.*, u.email as customer_email,
           COALESCE(s.name, a.name, st.name) as customer_name,
           s.roll_number as customer_roll_number,
           COALESCE(s.phone, a.phone, st.phone) as customer_phone
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
  } else {
    // By default show active orders (not completed or cancelled)
    query += " AND o.status IN ('pending', 'preparing', 'ready')";
  }

  query += ' ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);

  const result = orders.map(order => ({
    ...order,
    items: db.prepare(`
      SELECT oi.*, mi.name, mi.image_url, mi.category
      FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id = ?
    `).all(order.order_id),
  }));

  res.json(result);
}

/**
 * PUT /api/staff/orders/:id/status — Update order status (staff)
 * Enforces valid status transitions:
 *   pending → preparing → ready → completed
 *   Any active status → cancelled
 */
function updateStaffOrderStatus(req, res) {
  const db = getDb();
  const { status } = req.body;
  const orderId = req.params.id;

  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Enforce valid status flow
  const validTransitions = {
    pending: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['completed', 'cancelled'],
  };

  const allowed = validTransitions[order.status];
  if (!allowed || !allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot change status from "${order.status}" to "${status}".`,
    });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
    .run(status, orderId);

  // If cancelled, restore stock
  if (status === 'cancelled') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    for (const item of items) {
      db.prepare('UPDATE menu_items SET stock = stock + ?, is_available = 1 WHERE item_id = ?')
        .run(item.quantity, item.item_id);
    }
  }

  // Fetch updated order with customer info
  const updated = db.prepare(`
    SELECT o.*, u.email as customer_email,
           COALESCE(s.name, a.name, st.name) as customer_name,
           s.roll_number as customer_roll_number,
           COALESCE(s.phone, a.phone, st.phone) as customer_phone
    FROM orders o 
    JOIN users u ON o.user_id = u.user_id
    LEFT JOIN students s ON u.user_id = s.student_id
    LEFT JOIN admins a ON u.user_id = a.admin_id
    LEFT JOIN staff st ON u.user_id = st.staff_id
    WHERE o.order_id = ?
  `).get(orderId);

  const items = db.prepare(`
    SELECT oi.*, mi.name, mi.image_url, mi.category
    FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE oi.order_id = ?
  `).all(orderId);

  res.json({
    message: `Order status updated to "${status}".`,
    order: { ...updated, items },
  });
}

/**
 * GET /api/staff/stats — Dashboard summary stats
 */
function getStaffStats(req, res) {
  const db = getDb();

  const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get();
  const preparing = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'").get();
  const ready = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'").get();
  const completedToday = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND DATE(updated_at) = DATE('now')"
  ).get();
  const cancelledToday = db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled' AND DATE(updated_at) = DATE('now')"
  ).get();

  res.json({
    pending: (pending && pending.count) || 0,
    preparing: (preparing && preparing.count) || 0,
    ready: (ready && ready.count) || 0,
    completed_today: (completedToday && completedToday.count) || 0,
    cancelled_today: (cancelledToday && cancelledToday.count) || 0,
  });
}

module.exports = { getStaffOrders, updateStaffOrderStatus, getStaffStats };
