const { getDb } = require('../config/database');

/**
 * POST /api/orders — Create a new order
 */
function createOrder(req, res) {
  const db = getDb();
  const { items, payment_method, pickup_type } = req.body;
  const userId = req.user.userId;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Order must contain at least one item.' });
  }

  if (!payment_method || !['upi'].includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  // Validate items and calculate total
  let totalPrice = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = db.prepare('SELECT * FROM menu_items WHERE item_id = ?').get(item.item_id);
    if (!menuItem) {
      return res.status(400).json({ error: `Item with ID ${item.item_id} not found.` });
    }
    if (!menuItem.is_available) {
      return res.status(400).json({ error: `"${menuItem.name}" is currently unavailable.` });
    }
    if (menuItem.stock < item.quantity) {
      return res.status(400).json({ error: `Not enough stock for "${menuItem.name}". Available: ${menuItem.stock}` });
    }

    const lineTotal = menuItem.price * item.quantity;
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

  // Insert order
  db.prepare(`
    INSERT INTO orders (order_id, user_id, total_price, status, payment_method, payment_status, qr_code, pickup_type)
    VALUES (?, ?, ?, 'pending', ?, ?, ?, 'pickup')
  `).run(orderId, userId, totalPrice, payment_method, paymentStatus, qrCode);

  // Insert order items and update stock
  for (const oi of orderItems) {
    db.prepare('INSERT INTO order_items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)').run(orderId, oi.item_id, oi.quantity, oi.price_at_order);
    db.prepare('UPDATE menu_items SET stock = stock - ? WHERE item_id = ?').run(oi.quantity, oi.item_id);
    db.prepare('UPDATE menu_items SET is_available = 0 WHERE item_id = ? AND stock <= 0').run(oi.item_id);
  }

  // Create transaction record
  const txnId = 'TXN-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  db.prepare('INSERT INTO transactions (transaction_id, order_id, payment_method, amount, status) VALUES (?, ?, ?, ?, ?)').run(txnId, orderId, payment_method, totalPrice, paymentStatus);

  // Fetch created order with items
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  const createdItems = db.prepare(`
    SELECT oi.*, mi.name, mi.image_url, mi.category
    FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE oi.order_id = ?
  `).all(orderId);

  res.status(201).json({
    message: 'Order placed successfully!',
    order: { ...order, items: createdItems },
  });
}

/**
 * GET /api/orders — User's orders
 */
function getUserOrders(req, res) {
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

  const orders = db.prepare(query).all(...params);

  // Attach items to each order
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
 * GET /api/orders/:id — Single order detail
 */
function getOrderDetail(req, res) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Check ownership (unless admin or staff)
  if (req.user.role !== 'admin' && req.user.role !== 'staff' && order.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'You can only view your own orders.' });
  }

  const items = db.prepare(`
    SELECT oi.*, mi.name, mi.image_url, mi.category, mi.description
    FROM order_items oi JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE oi.order_id = ?
  `).all(req.params.id);

  const transaction = db.prepare('SELECT * FROM transactions WHERE order_id = ?').get(req.params.id);
  const userBase = db.prepare('SELECT role, email FROM users WHERE user_id = ?').get(order.user_id);
  let userDetails = {};
  if (userBase?.role === 'student') userDetails = db.prepare('SELECT name, phone FROM students WHERE student_id = ?').get(order.user_id);
  else if (userBase?.role === 'admin') userDetails = db.prepare('SELECT name, phone FROM admins WHERE admin_id = ?').get(order.user_id);
  else if (userBase?.role === 'staff') userDetails = db.prepare('SELECT name, phone FROM staff WHERE staff_id = ?').get(order.user_id);
  
  const user = { 
    name: userDetails?.name || 'Unknown', 
    email: userBase?.email, 
    phone: userDetails?.phone 
  };

  res.json({ ...order, items, transaction, user });
}

/**
 * PUT /api/orders/:id/status — Update order status (admin)
 */
function updateOrderStatus(req, res) {
  const db = getDb();
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
    .run(status, req.params.id);

  // If cancelled, restore stock
  if (status === 'cancelled') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    for (const item of items) {
      db.prepare('UPDATE menu_items SET stock = stock + ?, is_available = 1 WHERE item_id = ?').run(item.quantity, item.item_id);
    }
  }

  res.json({ message: `Order status updated to "${status}".` });
}

/**
 * POST /api/orders/:id/verify — Verify pickup via QR code
 */
function verifyPickup(req, res) {
  const db = getDb();
  const { qr_data } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.qr_code !== qr_data) {
    return res.status(400).json({ error: 'QR code verification failed.' });
  }

  if (order.status !== 'ready') {
    return res.status(400).json({ error: `Order is not ready for pickup. Current status: ${order.status}` });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
    .run('completed', req.params.id);

  res.json({ message: 'Pickup verified! Order completed.' });
}

/**
 * POST /api/orders/:id/pay — Confirm payment for an order
 */
function confirmPayment(req, res) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found.' });
  
  if (order.user_id !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Unauthorized to confirm payment for this order.' });
  }

  db.prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?')
    .run('success', req.params.id);
    
  db.prepare('UPDATE transactions SET status = ? WHERE order_id = ?')
    .run('success', req.params.id);

  res.json({ message: 'Payment confirmed successfully.' });
}

module.exports = { createOrder, getUserOrders, getOrderDetail, updateOrderStatus, verifyPickup, confirmPayment };
