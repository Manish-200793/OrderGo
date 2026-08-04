import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { orderAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatPrice, formatDateTime, STATUS_CONFIG } from '../utils/formatters';
import './Orders.css';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try {
      const res = await orderAPI.getAll();
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = orders.filter(o => {
    if (tab === 'active') return ['pending', 'preparing', 'ready'].includes(o.status);
    if (tab === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  if (loading) return <LoadingSpinner text="Loading orders..." />;

  return (
    <div className="orders-page page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track and manage your orders</p>
        </div>

        <div className="order-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`order-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="orders-list">
            {filtered.map((order, idx) => {
              const statusInfo = STATUS_CONFIG[order.status];
              return (
                <Link to={`/orders/${order.order_id}`} key={order.order_id} className={`order-card glass-card animate-fade-in-up stagger-${Math.min(idx + 1, 6)}`}>
                  <div className="order-card-header">
                    <span className="order-id">#{order.order_id}</span>
                    <span className={`badge badge-${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                  </div>
                  <div className="order-card-items">
                    {order.items?.slice(0, 3).map(item => (
                      <span key={item.id} className="order-item-tag">{item.name} × {item.quantity}</span>
                    ))}
                    {(order.items?.length || 0) > 3 && <span className="order-item-more">+{order.items.length - 3} more</span>}
                  </div>
                  <div className="order-card-footer">
                    <span className="order-total">{formatPrice(order.total_price)}</span>
                    <span className="order-date">{formatDateTime(order.created_at)}</span>
                    <ChevronRight size={18} className="order-arrow" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state animate-scale-in">
            <Package size={64} />
            <h3>No {tab !== 'all' ? tab : ''} orders</h3>
            <p>Your orders will appear here</p>
            <Link to="/menu" className="btn btn-primary mt-lg">Browse Menu</Link>
          </div>
        )}
      </div>
    </div>
  );
}
