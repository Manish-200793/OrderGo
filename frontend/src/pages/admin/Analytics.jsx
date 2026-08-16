import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { adminAPI } from '../../services/api';
import { formatPrice } from '../../utils/formatters';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [popular, setPopular] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getAnalytics(),
      adminAPI.getPopularItems(),
      adminAPI.getPeakHours(),
    ]).then(([a, p, h]) => {
      setAnalytics(a.data);
      setPopular(p.data);
      setPeakHours(h.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading analytics..." />;

  const dailyData = analytics?.daily_revenue?.map(d => ({ ...d, revenue: Number(d.revenue) })) || [];
  const hourLabels = peakHours.map(h => ({ ...h, label: `${h.hour}:00` }));

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Analytics</h1>

      {/* Revenue Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 className="section-heading">📈 Daily Revenue (Last 7 Days)</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#475569" fontSize={12} />
              <YAxis stroke="#475569" fontSize={12} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}
                labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '4px' }}
                itemStyle={{ color: '#0F172A', fontWeight: 500 }}
                formatter={(value) => [`₹${value}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#ff6b35" strokeWidth={3} dot={{ fill: '#ff6b35', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Peak Hours */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 className="section-heading">⏰ Peak Ordering Hours</h2>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={hourLabels}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8 }}
                  labelStyle={{ color: '#475569', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ color: '#0F172A', fontWeight: 500 }}
                  formatter={(value) => [value, 'Orders']}
                />
                <Bar dataKey="order_count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b35" />
                    <stop offset="100%" stopColor="#ff3d7f" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Items */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 className="section-heading">🏆 Top Sellers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {popular.map((item, idx) => (
              <div key={item.item_id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)'
              }}>
                <span style={{ fontWeight: 800, color: idx < 3 ? 'var(--accent-primary)' : 'var(--text-muted)', width: 24 }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.total_sold} sold</span>
              </div>
            ))}
            {popular.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
