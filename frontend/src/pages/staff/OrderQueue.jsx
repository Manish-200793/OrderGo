import { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../../services/api';
import './OrderQueue.css';

const REFRESH_INTERVAL = 10000; // 10 seconds

export default function OrderQueue() {
  const [orders, setOrders] = useState({ preparing: [], ready: [] });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await staffAPI.getOrders();
      // res.data contains all active orders
      const preparing = res.data.filter(o => o.status === 'preparing' || o.status === 'pending');
      const ready = res.data.filter(o => o.status === 'ready');
      setOrders({ preparing, ready });
    } catch (err) {
      console.error('Failed to fetch queue orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const formatId = (id) => id.replace('ORD-', '');

  return (
    <div className="queue-container">
      <header className="queue-header">
        <h1>OrderGo Queue</h1>
        <div className="queue-time">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>
      
      <div className="queue-grid">
        {/* Preparing Column */}
        <div className="queue-col col-preparing">
          <h2 className="queue-col-title">Preparing</h2>
          <div className="queue-list">
            {orders.preparing.map(order => (
              <div key={order.order_id} className="queue-card card-preparing animate-fade-in">
                <div className="queue-number">{formatId(order.order_id)}</div>
                <div className="queue-name">{order.customer_name || 'Guest'}</div>
              </div>
            ))}
            {orders.preparing.length === 0 && (
              <div className="queue-empty">No orders currently preparing</div>
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="queue-col col-ready">
          <h2 className="queue-col-title pulse-text">Please Collect</h2>
          <div className="queue-list">
            {orders.ready.map(order => (
              <div key={order.order_id} className="queue-card card-ready">
                <div className="queue-number">{formatId(order.order_id)}</div>
                <div className="queue-name">{order.customer_name || 'Guest'}</div>
              </div>
            ))}
            {orders.ready.length === 0 && (
              <div className="queue-empty">No orders waiting for collection</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
