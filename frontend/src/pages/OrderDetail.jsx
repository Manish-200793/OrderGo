import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { orderAPI, feedbackAPI } from '../services/api';
import StatusTracker from '../components/StatusTracker';
import StarRating from '../components/StarRating';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPrice, formatDateTime, STATUS_CONFIG, CATEGORY_CONFIG } from '../utils/formatters';
import './OrderDetail.css';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackItem, setFeedbackItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState({});

  useEffect(() => {
    loadOrder();
    
    // Determine polling interval based on status
    let pollInterval = 15000;
    if (order?.status === 'ready') {
      pollInterval = 5000; // Poll faster when ready so the handover feels instant
    } else if (order?.status === 'completed' || order?.status === 'cancelled') {
      pollInterval = 0; // Stop polling
    }

    if (pollInterval > 0) {
      const interval = setInterval(loadOrder, pollInterval);
      return () => clearInterval(interval);
    }
  }, [id, order?.status]);

  async function loadOrder() {
    try {
      const res = await orderAPI.getById(id);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(itemId) {
    if (!rating) return;
    try {
      await feedbackAPI.submit({ item_id: itemId, order_id: id, rating, comment });
      setFeedbackSent(prev => ({ ...prev, [itemId]: true }));
      setFeedbackItem(null);
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Feedback error:', err);
    }
  }

  if (loading) return <LoadingSpinner text="Loading order..." />;
  if (!order) return <div className="page container"><h2>Order not found</h2></div>;

  const statusInfo = STATUS_CONFIG[order.status];

  return (
    <div className="order-detail-page page">
      <div className="container">
        <Link to="/orders" className="back-link"><ArrowLeft size={18} /> Back to Orders</Link>

        <div className="order-detail-header animate-fade-in">
          <div>
            <h1 className="page-title">Order {order.order_id}</h1>
            <p className="page-subtitle">{formatDateTime(order.created_at)}</p>
          </div>
          <span className={`badge badge-${statusInfo.color}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>

        {/* Status Tracker */}
        <div className="glass-card order-section animate-fade-in-up">
          <h2 className="section-heading">Order Status</h2>
          <StatusTracker status={order.status} />
        </div>

        <div className="order-detail-grid">
          {/* Items */}
          <div className="glass-card order-section animate-fade-in-up">
            <h2 className="section-heading">Items</h2>
            <div className="order-items-list">
              {order.items?.map(item => (
                <div key={item.id} className="order-detail-item">
                  <div className="order-detail-item-icon">
                    {CATEGORY_CONFIG[item.category]?.emoji || '🍽️'}
                  </div>
                  <div className="order-detail-item-info">
                    <strong>{item.name}</strong>
                    <span>× {item.quantity}</span>
                  </div>
                  <span className="order-detail-item-price">{formatPrice(item.price_at_order * item.quantity)}</span>

                  {/* Feedback button for completed orders */}
                  {order.status === 'completed' && !feedbackSent[item.item_id] && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFeedbackItem(feedbackItem === item.item_id ? null : item.item_id)}
                    >
                      ⭐ Rate
                    </button>
                  )}
                  {feedbackSent[item.item_id] && <span className="feedback-done">✅ Rated</span>}

                  {feedbackItem === item.item_id && (
                    <div className="feedback-form animate-scale-in">
                      <StarRating rating={rating} onRate={setRating} />
                      <textarea
                        className="form-input"
                        placeholder="Optional comment..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        rows={2}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleFeedback(item.item_id)}>
                        Submit Rating
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="order-detail-total">
              <span>Total</span>
              <span>{formatPrice(order.total_price)}</span>
            </div>
          </div>

          {/* QR Code & Payment Info */}
          <div className="order-side">
            {['pending', 'preparing', 'ready'].includes(order.status) && order.qr_code && (
              <div className="glass-card order-section qr-section animate-fade-in-up">
                <h2 className="section-heading"><QrCode size={18} /> Pickup QR Code</h2>
                <div className="qr-wrapper" style={{ padding: '1rem', background: '#ffffff', borderRadius: '12px', display: 'inline-block' }}>
                  <QRCodeSVG value={order.qr_code} size={180} bgColor="#ffffff" fgColor="#000000" level="H" />
                </div>
                <p className="qr-note">Show this QR code at the counter for pickup</p>
              </div>
            )}

            <div className="glass-card order-section animate-fade-in-up">
              <h2 className="section-heading">Payment Details</h2>
              <div className="payment-details">
                <div className="payment-row">
                  <span>Method</span>
                  <span className="payment-method-tag">{order.payment_method?.toUpperCase()}</span>
                </div>
                <div className="payment-row">
                  <span>Status</span>
                  <span className={`badge badge-${order.payment_status === 'success' ? 'ready' : 'pending'}`}>
                    {order.payment_status === 'success' ? '✅ Paid' : '⏳ Pending'}
                  </span>
                </div>
                <div className="payment-row">
                  <span>Amount</span>
                  <strong style={{ color: 'var(--accent-primary)' }}>{formatPrice(order.total_price)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
