const { getDb } = require('../config/database');

/**
 * POST /api/payments/initiate — Simulate payment initiation
 */
function initiatePayment(req, res) {
  const db = getDb();
  const { order_id, payment_method } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const gatewayRef = 'PAY-' + Date.now().toString(36).toUpperCase();

  if (payment_method === 'cash') {
    res.json({
      status: 'pending',
      message: 'Cash payment — pay at counter upon pickup.',
      gateway_ref: gatewayRef,
    });
  } else {
    db.prepare('UPDATE orders SET payment_status = ? WHERE order_id = ?')
      .run('success', order_id);
    db.prepare('UPDATE transactions SET status = ?, gateway_ref = ? WHERE order_id = ?')
      .run('success', gatewayRef, order_id);

    res.json({
      status: 'success',
      message: `${payment_method.toUpperCase()} payment successful!`,
      gateway_ref: gatewayRef,
    });
  }
}

/**
 * GET /api/payments/:orderId — Get payment status
 */
function getPaymentStatus(req, res) {
  const db = getDb();
  const txn = db.prepare('SELECT * FROM transactions WHERE order_id = ?').get(req.params.orderId);
  if (!txn) return res.status(404).json({ error: 'Transaction not found.' });

  res.json(txn);
}

module.exports = { initiatePayment, getPaymentStatus };
