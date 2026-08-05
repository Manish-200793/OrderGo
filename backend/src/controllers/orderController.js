const { getDb } = require('../config/database');

/**
 * POST /api/orders — Create a new order
 */
async function createOrder(req, res) {
  const db = getDb();
  const { items, payment_method, pickup_type } = req.body;
  const userId = req.user.userId;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  if (!payment_method || !['upi'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const [menuItems] = await connection.query('SELECT * FROM menu_items WHERE item_id = ?', [item.item_id]);
      const menuItem = menuItems[0];
      
      if (!menuItem) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Item with ID ${item.item_id} not found.` });
      }
      if (!menuItem.is_available) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `"${menuItem.name}" is currently unavailable.` });
      }
      if (menuItem.stock < item.quantity) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: `Not enough stock for "${menuItem.name}". Available: ${menuItem.stock}` });
      }

      const lineTotal = parseFloat(menuItem.price) * item.quantity;
      totalPrice += lineTotal;
      orderItems.push({
        item_id: menuItem.item_id,
        quantity: item.quantity,
        price_at_order: menuItem.price,
      });
    }

    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    const qrCode = `ORDERGO:${orderId}:${userId}:${totalPrice}`;
    const paymentStatus = 'pending';

    await connection.query(`
      INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, 'pickup')
    `, [orderId, userId, totalPrice, payment_method, paymentStatus, qrCode]);

    for (const oi of orderItems) {
      await connection.query('INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)', [orderId, oi.item_id, oi.quantity, oi.price_at_order]);
      await connection.query('UPDATE menu_items SET stock = stock - ? WHERE item_id = ?', [oi.quantity, oi.item_id]);
      await connection.query('UPDATE menu_items SET is_available = 0 WHERE item_id = ? AND stock <= 0', [oi.item_id]);
    }

    const txnId = 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
    await connection.query('INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)', [txnId, orderId, payment_method, totalPrice, paymentStatus]);

    await connection.commit();
    connection.release();

    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    const [createdItems] = await db.query(`
      SELECT oi.*, mi.name, mi.image_url, mi.category
      FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id = ?
    `, [orderId]);

    res.status(201).json({
      message: 'Order placed successfully!',
      order: { ...orders[0], items: createdItems },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/orders — User's orders
 */
async function getUserOrders(req, res) {
  const db = getDb();
  const userId = req.user.userId;
  const { status } = req.query;

  let query = 'SELECT * FROM orders WHERE user_id = ?';
  const params = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

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
 * GET /api/orders/:id — Single order detail
 */
async function getOrderDetail(req, res) {
  const db = getDb();
  
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    const order = orders[0];
    
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (req.user.role !== 'admin' && req.user.role !== 'staff' && order.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'You can only view your own orders.' });
    }

    const [items] = await db.query(`
      SELECT oi.*, mi.name, mi.image_url, mi.category, mi.description
      FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    const [transactions] = await db.query('SELECT * FROM transactions WHERE order_id = ?', [req.params.id]);
    const transaction = transactions[0] || null;

    const [userBaseRows] = await db.query('SELECT role, email FROM users WHERE user_id = ?', [order.user_id]);
    const userBase = userBaseRows[0];
    
    let userDetails = {};
    if (userBase?.role === 'student') {
      const [rows] = await db.query('SELECT name, phone FROM students WHERE student_id = ?', [order.user_id]);
      userDetails = rows[0] || {};
    } else if (userBase?.role === 'admin') {
      const [rows] = await db.query('SELECT name, phone FROM admins WHERE admin_id = ?', [order.user_id]);
      userDetails = rows[0] || {};
    } else if (userBase?.role === 'staff') {
      const [rows] = await db.query('SELECT name, phone FROM staff WHERE staff_id = ?', [order.user_id]);
      userDetails = rows[0] || {};
    }
    
    const user = { 
      name: userDetails?.name || 'Unknown', 
      email: userBase?.email, 
      phone: userDetails?.phone 
    };

    res.json({ ...order, items, transaction, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/orders/:id/status — Update order status (admin)
 */
async function updateOrderStatus(req, res) {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found.' });

    await db.query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', [status, req.params.id]);

    if (status === 'cancelled') {
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items) {
        await db.query('UPDATE menu_items SET stock = stock + ?, is_available = 1 WHERE item_id = ?', [item.quantity, item.item_id]);
      }
    }

    res.json({ message: `Order status updated to "${status}".` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/orders/:id/verify — Verify pickup via QR code
 */
async function verifyPickup(req, res) {
  const db = getDb();
  const { qr_data } = req.body;
  
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    const order = orders[0];

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.qr_code !== qr_data) {
      return res.status(400).json({ error: 'QR code verification failed.' });
    }

    if (order.status !== 'ready') {
      return res.status(400).json({ error: `Order is not ready for pickup. Current status: ${order.status}` });
    }

    await db.query('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', ['completed', req.params.id]);

    res.json({ message: 'Pickup verified! Order completed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/orders/:id/pay — Confirm payment for an order
 */
async function confirmPayment(req, res) {
  const db = getDb();
  
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    const order = orders[0];

    if (!order) return res.status(404).json({ error: 'Order not found.' });
    
    if (order.user_id !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Unauthorized to confirm payment for this order.' });
    }

    await db.query('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?', ['success', req.params.id]);
    await db.query('UPDATE transactions SET status = ? WHERE order_id = ?', ['success', req.params.id]);

    res.json({ message: 'Payment confirmed successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createOrder, getUserOrders, getOrderDetail, updateOrderStatus, verifyPickup, confirmPayment };
