import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, BarChart3 } from 'lucide-react';
import './Admin.css';

const NAV_ITEMS = [
  { path: '/admin', icon: <LayoutDashboard size={18} />, label: 'Overview', exact: true },
  { path: '/admin/menu', icon: <UtensilsCrossed size={18} />, label: 'Menu' },
  { path: '/admin/orders', icon: <ClipboardList size={18} />, label: 'Orders' },
  { path: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="admin-layout page">
      <div className="admin-sidebar glass-card">
        <div className="admin-sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={`admin-nav-link ${isActive ? 'active' : ''}`}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
