import { Link } from 'react-router-dom';
import { Plus, Minus, Star, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice, CATEGORY_CONFIG } from '../utils/formatters';
import './MenuCard.css';

export default function MenuCard({ item }) {
  const { isAuthenticated } = useAuth();
  const { items: cartItems, addItem, updateQuantity } = useCart();
  const cartItem = cartItems.find(i => i.item_id === item.item_id);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className={`menu-card glass-card ${!item.is_available ? 'unavailable' : ''}`}>
      {item.is_daily_special && <span className="badge badge-special menu-card-badge">⭐ Today's Special</span>}

      <div className="menu-card-image">
        <div className="menu-card-image-placeholder">
          <span>{CATEGORY_CONFIG[item.category]?.emoji || '🍽️'}</span>
        </div>
        {!item.is_available && <div className="menu-card-sold-out">Sold Out</div>}
      </div>

      <div className="menu-card-content">
        <div className="menu-card-header">
          <h3 className="menu-card-name">{item.name}</h3>
          {isAuthenticated && <span className="menu-card-price">{formatPrice(item.price)}</span>}
        </div>

        <p className="menu-card-desc">{item.description}</p>

        <div className="menu-card-meta">
          <span className="menu-card-category">
            {CATEGORY_CONFIG[item.category]?.emoji} {CATEGORY_CONFIG[item.category]?.label}
          </span>
          {item.avg_rating > 0 && (
            <span className="menu-card-rating">
              <Star size={14} fill="var(--status-pending)" stroke="var(--status-pending)" />
              {item.avg_rating} <span className="rating-count">({item.review_count})</span>
            </span>
          )}
        </div>

        <div className="menu-card-actions">
          {isAuthenticated ? (
            item.is_available ? (
              quantity > 0 ? (
                <div className="quantity-control">
                  <button className="qty-btn" onClick={() => updateQuantity(item.item_id, quantity - 1)} aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button className="qty-btn" onClick={() => updateQuantity(item.item_id, quantity + 1)} aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary btn-sm w-full" onClick={() => addItem(item)}>
                  <Plus size={16} /> Add to Cart
                </button>
              )
            ) : (
              <button className="btn btn-secondary btn-sm w-full" disabled>Unavailable</button>
            )
          ) : (
            item.is_available ? (
              <Link to="/login" className="btn btn-secondary btn-sm w-full menu-card-login-btn">
                <LogIn size={15} /> Login to Order
              </Link>
            ) : (
              <button className="btn btn-secondary btn-sm w-full" disabled>Unavailable</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
