import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, ChefHat, CheckCircle2, XCircle, Package,
  User, Hash, Phone, RefreshCw, CookingPot,
  HandPlatter, CircleCheck, Ban, Flame, Timer, ScanLine, X
} from 'lucide-react';
import { staffAPI, orderAPI } from '../../services/api';
import QRScanner from '../../components/QRScanner';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Staff.css';

const REFRESH_INTERVAL = 15000; // 15 seconds

export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, completed_today: 0, cancelled_today: 0 });
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [scanError, setScanError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const isProcessingScan = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const params = {};
      if (filter !== 'active') {
        params.status = filter;
      }

      const [ordersRes, statsRes] = await Promise.all([
        staffAPI.getOrders(params),
        staffAPI.getStats(),
      ]);

      setOrders(ordersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch staff data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  // Initial fetch and filter changes
  useEffect(() => {
    // Use isRefresh = true if we've already loaded once (loading is false)
    // To access the current value of loading, we can just check if we have stats
    const hasLoaded = stats.completed_today !== undefined && stats.completed_today >= 0;
    fetchData(hasLoaded);
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleStatusUpdate(orderId, newStatus) {
    setUpdatingOrder(orderId);
    try {
      await staffAPI.updateStatus(orderId, newStatus);
      await fetchData(true);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.error || 'Failed to update order status.');
    } finally {
      setUpdatingOrder(null);
    }
  }

  // QR Scanning Handlers
  const handleScanSuccess = async (decodedText) => {
    if (isProcessingScan.current) return;
    
    // Expected format: ORDERGO:ORD-1234:USERID:AMOUNT
    if (decodedText.startsWith('ORDERGO:')) {
      const parts = decodedText.split(':');
      if (parts.length >= 2) {
        const orderId = parts[1];
        
        isProcessingScan.current = true;
        try {
          setScanError('');
          // Fetch all active orders to give accurate status errors
          const res = await staffAPI.getOrders();
          const order = res.data.find(o => o.order_id === orderId);
          
          if (order) {
            if (order.status !== 'ready') {
              setScanError(`Order is currently "${order.status}". Mark it ready first!`);
              setTimeout(() => { isProcessingScan.current = false; }, 3000);
            } else {
              setShowScanner(false);
              setScannedOrder({ order, rawQR: decodedText });
              isProcessingScan.current = false;
            }
          } else {
            setScanError(`Order ${orderId} not found or already completed.`);
            setTimeout(() => { isProcessingScan.current = false; }, 3000);
          }
        } catch (err) {
          setScanError('Failed to fetch order details.');
          setTimeout(() => { isProcessingScan.current = false; }, 3000);
        }
      } else {
        setScanError('Invalid QR format.');
        setTimeout(() => { isProcessingScan.current = false; }, 3000);
      }
    } else {
      setScanError('Unrecognized QR code.');
      setTimeout(() => { isProcessingScan.current = false; }, 3000);
    }
  };

  const handleVerifyPickup = async () => {
    if (!scannedOrder) return;
    setVerifying(true);
    try {
      await orderAPI.verifyPickup(scannedOrder.order.order_id, scannedOrder.rawQR);
      setScannedOrder(null);
      await fetchData(true);
      alert('Order successfully verified and handed over!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to verify pickup.');
    } finally {
      setVerifying(false);
    }
  };

  function getRelativeTime(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  function getNextAction(status) {
    switch (status) {
      case 'pending':
        return { label: 'Start Preparing', nextStatus: 'preparing', className: 'action-preparing', icon: <CookingPot size={14} /> };
      case 'preparing':
        return { label: 'Mark Ready', nextStatus: 'ready', className: 'action-ready', icon: <HandPlatter size={14} /> };
      default:
        return null;
    }
  }

  const FILTERS = [
    { key: 'active', label: 'All Active', count: stats.pending + stats.preparing + stats.ready },
    { key: 'pending', label: 'Pending', count: stats.pending, pulse: stats.pending > 0 },
    { key: 'preparing', label: 'Preparing', count: stats.preparing },
    { key: 'ready', label: 'Ready', count: stats.ready },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="staff-dashboard">
      {/* Header */}
      <div className="staff-header animate-fade-in">
        <div className="staff-header-left">
          <h1>Staff Dashboard</h1>
          <p>Manage incoming orders and track preparation status</p>
        </div>
        <div className="staff-header-actions">
          <button className="btn btn-primary" onClick={() => { 
            isProcessingScan.current = false; 
            setShowScanner(true); 
            setScannedOrder(null); 
            setScanError(''); 
          }}>
            <ScanLine size={18} /> Scan Pickup QR
          </button>
          <div className={`staff-refresh-indicator ${refreshing ? 'refreshing' : ''}`}>
            <RefreshCw size={14} />
            {refreshing ? 'Refreshing...' : 'Auto-refresh 15s'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="staff-stats-grid">
        <div className="staff-stat-card glass-card stat-pending animate-fade-in stagger-1">
          <div className="staff-stat-icon icon-pending"><Clock size={22} /></div>
          <div className="staff-stat-value val-pending">{stats.pending}</div>
          <div className="staff-stat-label">Pending</div>
        </div>
        <div className="staff-stat-card glass-card stat-preparing animate-fade-in stagger-2">
          <div className="staff-stat-icon icon-preparing"><ChefHat size={22} /></div>
          <div className="staff-stat-value val-preparing">{stats.preparing}</div>
          <div className="staff-stat-label">Preparing</div>
        </div>
        <div className="staff-stat-card glass-card stat-ready animate-fade-in stagger-3">
          <div className="staff-stat-icon icon-ready"><CheckCircle2 size={22} /></div>
          <div className="staff-stat-value val-ready">{stats.ready}</div>
          <div className="staff-stat-label">Ready</div>
        </div>
        <div className="staff-stat-card glass-card stat-completed animate-fade-in stagger-4">
          <div className="staff-stat-icon icon-completed"><Package size={22} /></div>
          <div className="staff-stat-value val-completed">{stats.completed_today}</div>
          <div className="staff-stat-label">Done Today</div>
        </div>
        <div className="staff-stat-card glass-card stat-cancelled animate-fade-in stagger-5">
          <div className="staff-stat-icon icon-cancelled"><XCircle size={22} /></div>
          <div className="staff-stat-value val-cancelled">{stats.cancelled_today}</div>
          <div className="staff-stat-label">Cancelled</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="staff-filters animate-fade-in">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`staff-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.pulse && <span className="staff-filter-pulse" />}
            {f.label}
            <span className="staff-filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Order Cards */}
      {orders.length === 0 ? (
        <div className="staff-empty glass-card animate-fade-in">
          <Flame size={56} />
          <h3>No orders here</h3>
          <p>
            {filter === 'active'
              ? 'All caught up! No active orders at the moment.'
              : `No "${filter}" orders right now.`}
          </p>
        </div>
      ) : (
        <div className="staff-orders-grid">
          {orders.map((order, i) => {
            const action = getNextAction(order.status);
            return (
              <div
                key={order.order_id}
                className={`staff-order-card glass-card order-${order.status}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Header */}
                <div className="staff-order-header">
                  <div>
                    <span className="staff-order-id">{order.order_id}</span>
                    <span className={`badge badge-${order.status}`} style={{ marginLeft: '8px' }}>
                      {order.status}
                    </span>
                  </div>
                  <div className="staff-order-time">
                    <Timer size={12} />
                    {getRelativeTime(order.created_at)}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="staff-customer-info">
                  <div className="staff-customer-row">
                    <User size={16} className="staff-customer-icon" />
                    <span className="staff-customer-name">{order.customer_name}</span>
                  </div>
                  {order.customer_roll_number && (
                    <div className="staff-customer-row">
                      <Hash size={14} className="staff-customer-icon" />
                      <span className="staff-customer-roll">{order.customer_roll_number}</span>
                    </div>
                  )}
                  {order.customer_phone && (
                    <div className="staff-customer-row">
                      <Phone size={13} className="staff-customer-icon" />
                      <span className="staff-customer-phone">{order.customer_phone}</span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="staff-order-items">
                  <div className="staff-order-items-title">Order Items</div>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="staff-item-row">
                      <div>
                        <span className="staff-item-name">{item.name}</span>
                        <span className="staff-item-qty">×{item.quantity}</span>
                      </div>
                      <span className="staff-item-price">₹{(item.price_at_order * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="staff-order-footer">
                  <div className="staff-order-meta">
                    <span className="staff-order-total">₹{order.total_price}</span>
                    <span className="staff-payment-badge">{order.payment_method}</span>
                  </div>
                  <div className="staff-order-actions">
                    {action && (
                      <button
                        className={`staff-action-btn ${action.className}`}
                        onClick={() => handleStatusUpdate(order.order_id, action.nextStatus)}
                        disabled={updatingOrder === order.order_id}
                      >
                        {updatingOrder === order.order_id ? (
                          <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          action.icon
                        )}
                        {action.label}
                      </button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <button
                        className="staff-action-btn action-cancel"
                        onClick={() => handleStatusUpdate(order.order_id, 'cancelled')}
                        disabled={updatingOrder === order.order_id}
                      >
                        <Ban size={13} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-card scanner-modal">
            <div className="modal-header">
              <h2>Scan Pickup QR</h2>
              <button className="btn-close" onClick={() => setShowScanner(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <QRScanner onScanSuccess={handleScanSuccess} onScanError={(err) => console.log('Scan err:', err)} />
              {scanError && <p className="auth-error" style={{ marginTop: '1rem' }}>{scanError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Scanned Order Modal */}
      {scannedOrder && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Verify Handover</h2>
              <button className="btn-close" onClick={() => setScannedOrder(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="staff-customer-info" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3>{scannedOrder.order.customer_name}</h3>
                <p>Order ID: <strong>{scannedOrder.order.order_id}</strong></p>
                {scannedOrder.order.customer_roll_number && <p>Roll No: {scannedOrder.order.customer_roll_number}</p>}
                <p>Total Bill: <strong style={{ color: 'var(--accent-primary)' }}>₹{scannedOrder.order.total_price}</strong></p>
              </div>
              <div className="staff-order-items" style={{ marginBottom: '1.5rem' }}>
                <div className="staff-order-items-title">Items to Handover</div>
                {scannedOrder.order.items?.map((item, idx) => (
                  <div key={idx} className="staff-item-row">
                    <div>
                      <span className="staff-item-name">{item.name}</span>
                    </div>
                    <span className="staff-item-qty" style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>×{item.quantity}</span>
                  </div>
                ))}
              </div>
              <button 
                className="btn btn-primary w-full" 
                onClick={handleVerifyPickup}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
