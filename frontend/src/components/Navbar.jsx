import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, UtensilsCrossed, Menu, X, ChefHat, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, isAdmin, isStaff, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
    setMenuOpen(false);
  }

  // Determine destination based on user role
  const logoHref = !isAuthenticated ? '/' : isAdmin ? '/admin' : isStaff ? '/staff' : '/';
  const isCustomer = isAuthenticated && !isAdmin && !isStaff;

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to={logoHref} className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <UtensilsCrossed size={28} />
          <span>Order<strong>Go</strong></span>
        </Link>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {/* Guest Links */}
          {!isAuthenticated && (
            <>
              <Link to="/menu" className="nav-link" onClick={() => setMenuOpen(false)}>Menu</Link>
              <div className="nav-auth">
                <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </div>
            </>
          )}

          {/* Customer / Student Links (Menu, My Orders, Cart) */}
          {isCustomer && (
            <>
              <Link to="/menu" className="nav-link" onClick={() => setMenuOpen(false)}>Menu</Link>
              <Link to="/orders" className="nav-link" onClick={() => setMenuOpen(false)}>My Orders</Link>
              <Link to="/cart" className="nav-link cart-link" onClick={() => setMenuOpen(false)}>
                <ShoppingCart size={20} />
                Cart
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </Link>
            </>
          )}

          {/* Staff Panel Link (Exclusively for staff, no customer links) */}
          {isAuthenticated && isStaff && !isAdmin && (
            <Link to="/staff" className="nav-link nav-link-admin" onClick={() => setMenuOpen(false)}>
              <ChefHat size={16} />
              Staff Panel
            </Link>
          )}

          {/* Admin Dashboard Link (Exclusively for admin, no customer links) */}
          {isAuthenticated && isAdmin && (
            <Link to="/admin" className="nav-link nav-link-admin" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}

          {/* User Profile & Logout (For all logged-in roles) */}
          {isAuthenticated && (
            <div className="nav-user">
              <Link to="/profile" className="nav-link user-link" onClick={() => setMenuOpen(false)}>
                <User size={18} />
                <span className="user-name">{user?.name?.split(' ')[0]}</span>
              </Link>
              <button className="nav-link logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
                <LogOut size={18} />
              </button>
            </div>
          )}
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px', display: 'none' }} className="theme-divider"></div>
          <button className="nav-link" onClick={toggleTheme} title="Toggle Theme" aria-label="Toggle Theme" style={{ display: 'flex', justifyContent: 'center' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

