const { getDb } = require('../config/database');

/**
 * GET /api/staff/orders — Get orders for staff dashboard
 * Returns active orders with customer info (name, roll_number) and items
 */
async function getStaffOrders(req, res) {
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

  try {
    const [orders] = await db.query(query, params);

    const result = await Promise.all(orders.map(async (order) => {
      const [items] = await db.query(`
        SELECT oi.*, mi.name, mi.image_url, mi.category
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
 * PUT /api/staff/orders/:id/status — Update order status (staff)
 * Enforces valid status transitions:
 *   pending → preparing → ready → completed
 *   Any active status → cancelled
 */
async function updateStaffOrderStatus(req, res) {
  const db = getDb();
  const { status } = req.body;
  const orderId = req.params.id;

  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    const order = orders[0];
    
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

    await db.query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [status, orderId]);

    // If cancelled, restore stock
    if (status === 'cancelled') {
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await db.query('UPDATE menu_items SET stock = stock + ?, is_available = 1 WHERE item_id = ?', [item.quantity, item.item_id]);
      }
    }

    // Fetch updated order with customer info
    const [updatedRows] = await db.query(`
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
    `, [orderId]);
    
    const updated = updatedRows[0];

    const [items] = await db.query(`
      SELECT oi.*, mi.name, mi.image_url, mi.category
      FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.json({
      message: `Order status updated to "${status}".`,
      order: { ...updated, items },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/staff/stats — Dashboard summary stats
 */
async function getStaffStats(req, res) {
  const db = getDb();

  try {
    const [pendingRows] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    const pending = pendingRows[0];
    
    const [preparingRows] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'preparing'");
    const preparing = preparingRows[0];
    
    const [readyRows] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'");
    const ready = readyRows[0];
    
    const [completedTodayRows] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed' AND DATE(updated_at) = CURDATE()");
    const completedToday = completedTodayRows[0];
    
    const [cancelledTodayRows] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled' AND DATE(updated_at) = CURDATE()");
    const cancelledToday = cancelledTodayRows[0];

    res.json({
      pending: (pending && pending.count) || 0,
      preparing: (preparing && preparing.count) || 0,
      ready: (ready && ready.count) || 0,
      completed_today: (completedToday && completedToday.count) || 0,
      cancelled_today: (cancelledToday && cancelledToday.count) || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getStaffOrders, updateStaffOrderStatus, getStaffStats };
