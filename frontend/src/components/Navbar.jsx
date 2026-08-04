import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, UtensilsCrossed, Menu, X, ChefHat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, isAdmin, isStaff, user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
    setMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <UtensilsCrossed size={28} />
          <span>Order<strong>Go</strong></span>
        </Link>

        <button className="navbar-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/menu" className="nav-link" onClick={() => setMenuOpen(false)}>Menu</Link>

          {isAuthenticated ? (
            <>
              <Link to="/orders" className="nav-link" onClick={() => setMenuOpen(false)}>My Orders</Link>
              {isStaff && (
                <Link to="/staff" className="nav-link nav-link-admin" onClick={() => setMenuOpen(false)}>
                  <ChefHat size={16} />
                  Staff Panel
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="nav-link nav-link-admin" onClick={() => setMenuOpen(false)}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}
              <Link to="/cart" className="nav-link cart-link" onClick={() => setMenuOpen(false)}>
                <ShoppingCart size={20} />
                Cart
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </Link>
              <div className="nav-user">
                <Link to="/profile" className="nav-link user-link" onClick={() => setMenuOpen(false)}>
                  <User size={18} />
                  <span className="user-name">{user?.name?.split(' ')[0]}</span>
                </Link>
                <button className="nav-link logout-btn" onClick={handleLogout}>
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

