import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';
import { orderAPI } from '../services/api';
import { formatPrice } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';
import './PaymentPage.css';

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      const res = await orderAPI.getById(id);
      if (res.data.payment_status === 'success') {
        navigate(`/orders/${id}`);
      } else {
        setOrder(res.data);
      }
    } catch (err) {
      setError('Failed to load order for payment.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPayment() {
    setConfirming(true);
    try {
      await orderAPI.confirmPayment(id);
      navigate(`/orders/${id}`);
    } catch (err) {
      setError('Failed to confirm payment.');
      setConfirming(false);
    }
  }

  function handleOpenApp() {
    if (order) {
      const upiUrl = `upi://pay?pa=manishsagar9441-1@oksbi&pn=Manish%20Sagar&cu=INR&am=${order.total_price}`;
      window.location.href = upiUrl;
    }
  }

  if (loading) return <LoadingSpinner text="Loading payment gateway..." />;
  if (error || !order) return <div className="page container"><div className="auth-error">{error || 'Order not found'}</div></div>;

  const upiUrl = `upi://pay?pa=manishsagar9441-1@oksbi&pn=Manish%20Sagar&cu=INR&am=${order.total_price}`;

  return (
    <div className="payment-page page">
      <div className="container">
        <Link to={`/orders/${id}`} className="back-link"><ArrowLeft size={18} /> Back to Order</Link>
        <div className="payment-container glass-card animate-scale-in">
          <div className="payment-header">
            <h2>Complete Your Payment</h2>
            <p>Scan the QR code with any UPI app</p>
          </div>
          
          <div className="payment-amount">
            <span>Amount to Pay</span>
            <strong>{formatPrice(order.total_price)}</strong>
          </div>

          <div className="payment-qr-section">
            <div className="qr-wrapper">
              <QRCodeSVG value={upiUrl} size={240} bgColor="#ffffff" fgColor="#000000" level="L" includeMargin={true} />
            </div>
            <div className="upi-details">
              <p>UPI ID: <strong>manishsagar9441-1@oksbi</strong></p>
              <p>Name: <strong>Manish Sagar</strong></p>
            </div>
          </div>

          <div className="payment-actions">
            <button className="btn btn-secondary w-full" onClick={handleOpenApp}>
              <Smartphone size={18} /> Open UPI App
            </button>
            <button 
              className="btn btn-primary w-full" 
              onClick={handleConfirmPayment}
              disabled={confirming}
            >
              <CheckCircle size={18} /> {confirming ? 'Confirming...' : 'I have completed payment'}
            </button>
          </div>
          
          <p className="payment-note">This is a simulated payment gateway. Click "I have completed payment" to continue.</p>
        </div>
      </div>
    </div>
  );
}
