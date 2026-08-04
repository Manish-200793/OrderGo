import { useState, useEffect } from 'react';
import { adminAPI, orderAPI } from '../../services/api';
import { formatPrice, formatDateTime, STATUS_CONFIG } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'completed'];

export default function OrderManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadOrders(); }, [filter]);

  async function loadOrders() {
    try {
      const params = filter ? { status: filter } : {};
      const res = await adminAPI.getOrders(params);
      setOrders(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingSpinner text="Loading orders..." />;

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Order Management</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['', 'pending', 'preparing', 'ready', 'completed', 'cancelled'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFilter(s); setLoading(true); }}>
            {s ? STATUS_CONFIG[s]?.icon + ' ' + STATUS_CONFIG[s]?.label : '📋 All'}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map(order => {
          const statusInfo = STATUS_CONFIG[order.status];
          return (
            <div key={order.order_id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{order.order_id}</strong>
                  <span style={{ marginLeft: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {order.user_name} • {formatDateTime(order.created_at)}
                  </span>
                </div>
                <span className={`badge badge-${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {order.items?.map(item => (
                  <span key={item.id} className="order-item-tag">{item.name} × {item.quantity}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatPrice(order.total_price)}</span>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="empty-state"><h3>No orders found</h3></div>
        )}
      </div>
    </div>
  );
}
