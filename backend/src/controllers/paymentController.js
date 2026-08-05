const { getDb } = require('../config/database');

/**
 * POST /api/payments/initiate — Simulate payment initiation
 */
async function initiatePayment(req, res) {
  const db = getDb();
  const { order_id, payment_method } = req.body;

  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE order_id = ?', [order_id]);
    const order = orders[0];
    
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const gatewayRef = 'PAY-' + Date.now().toString(36).toUpperCase();

    if (payment_method === 'cash') {
      res.json({
        status: 'pending',
        message: 'Cash payment — pay at counter upon pickup.',
        gateway_ref: gatewayRef,
      });
    } else {
      await db.query('UPDATE orders SET payment_status = ? WHERE order_id = ?', ['success', order_id]);
      await db.query('UPDATE transactions SET status = ?, gateway_ref = ? WHERE order_id = ?', ['success', gatewayRef, order_id]);

      res.json({
        status: 'success',
        message: `${payment_method.toUpperCase()} payment successful!`,
        gateway_ref: gatewayRef,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/payments/:orderId — Get payment status
 */
async function getPaymentStatus(req, res) {
  const db = getDb();
  
  try {
    const [transactions] = await db.query('SELECT * FROM transactions WHERE order_id = ?', [req.params.orderId]);
    const txn = transactions[0];
    
    if (!txn) return res.status(404).json({ error: 'Transaction not found.' });

    res.json(txn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { initiatePayment, getPaymentStatus };
