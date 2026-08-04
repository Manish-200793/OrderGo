import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Smartphone, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../services/api';
import { formatPrice, CATEGORY_CONFIG } from '../utils/formatters';
import './Cart.css';

const PAYMENT_METHODS = [
  { key: 'upi', label: 'UPI', icon: <Smartphone size={20} />, desc: 'Google Pay, PhonePe, Paytm' },
];

export default function CartPage() {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handlePlaceOrder() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setPlacing(true);
    setError('');

    try {
      const res = await orderAPI.create({
        items: items.map(i => ({ item_id: i.item_id, quantity: i.quantity })),
        payment_method: paymentMethod,
        pickup_type: 'pickup',
      });
      clearCart();
      navigate(`/payment/${res.data.order.order_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="cart-page page">
        <div className="container">
          <div className="empty-state animate-scale-in">
            <ShoppingBag size={64} />
            <h3>Your cart is empty</h3>
            <p>Add some delicious items from the menu</p>
            <Link to="/menu" className="btn btn-primary mt-lg">Browse Menu</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page page">
      <div className="container">
        <div className="page-header">
          <Link to="/menu" className="back-link"><ArrowLeft size={18} /> Back to Menu</Link>
          <h1 className="page-title">Your Cart</h1>
          <p className="page-subtitle">{items.length} item{items.length > 1 ? 's' : ''} in your cart</p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            {items.map((item, idx) => (
              <div key={item.item_id} className={`cart-item glass-card animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}>
                <div className="cart-item-image">
                  <span>{CATEGORY_CONFIG[item.category]?.emoji || '🍽️'}</span>
                </div>
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p className="cart-item-price">{formatPrice(item.price)} each</p>
                </div>
                <div className="cart-item-controls">
                  <div className="quantity-control">
                    <button className="qty-btn" onClick={() => updateQuantity(item.item_id, item.quantity - 1)}>
                      <Minus size={14} />
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.item_id, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="cart-item-total">{formatPrice(item.price * item.quantity)}</span>
                  <button className="cart-item-remove" onClick={() => removeItem(item.item_id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="cart-summary glass-card animate-slide-in">
            <h2 className="summary-title">Order Summary</h2>

            <div className="summary-items">
              {items.map(item => (
                <div key={item.item_id} className="summary-line">
                  <span>{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            <div className="summary-line summary-total">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="summary-divider" />

            {/* Payment Method */}
            <h3 className="payment-title">Payment Method</h3>
            <div className="payment-methods">
              {PAYMENT_METHODS.map(pm => (
                <button
                  key={pm.key}
                  className={`payment-option ${paymentMethod === pm.key ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(pm.key)}
                >
                  {pm.icon}
                  <div>
                    <strong>{pm.label}</strong>
                    <small>{pm.desc}</small>
                  </div>
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handlePlaceOrder}
              disabled={placing}
            >
              {placing ? 'Placing Order...' : `Place Order • ${formatPrice(totalPrice)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
