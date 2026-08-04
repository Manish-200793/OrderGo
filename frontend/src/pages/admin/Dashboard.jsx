import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Users, TrendingUp } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatPrice } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getAnalytics({ period: 'month' }),
      adminAPI.getPopularItems(),
    ]).then(([analyticsRes, popularRes]) => {
      setAnalytics(analyticsRes.data);
      setPopular(popularRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;

  const stats = analytics?.summary || {};

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Dashboard</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card animate-fade-in-up stagger-1">
          <div className="stat-icon"><ShoppingCart size={24} /></div>
          <div className="stat-value">{stats.total_orders || 0}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card glass-card animate-fade-in-up stagger-2">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-value">{formatPrice(stats.total_revenue || 0)}</div>
          <div className="stat-label">Revenue</div>
        </div>
        <div className="stat-card glass-card animate-fade-in-up stagger-3">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div className="stat-value">{formatPrice(stats.avg_order_value || 0)}</div>
          <div className="stat-label">Avg Order</div>
        </div>
        <div className="stat-card glass-card animate-fade-in-up stagger-4">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-value">{stats.total_users || 0}</div>
          <div className="stat-label">Students</div>
        </div>
      </div>

      {/* Orders by Status */}
      <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 className="section-heading">Orders by Status</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {(analytics?.by_status || []).map(s => (
            <div key={s.status} className={`badge badge-${s.status}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              {s.status}: {s.count}
            </div>
          ))}
        </div>
      </div>

      {/* Popular Items */}
      <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem' }}>
        <h2 className="section-heading">🔥 Most Popular Items</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {popular.map((item, idx) => (
            <div key={item.item_id} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.75rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)'
            }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-primary)', width: '30px' }}>#{idx + 1}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.total_sold} sold</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatPrice(item.price)}</span>
            </div>
          ))}
          {popular.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No data yet</p>}
        </div>
      </div>
    </div>
  );
}
