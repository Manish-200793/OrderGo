import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      // Role-based redirect
      const userData = JSON.parse(localStorage.getItem('ordergo_user'));
      if (userData?.role === 'staff') {
        navigate('/staff');
      } else if (userData?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/menu');
      }
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-container animate-scale-in">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your OrderGo account</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-icon-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input input-with-icon"
                  placeholder="your@college.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-link-wrapper">
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Create one</Link></p>
          </div>

          <div className="auth-demo">
            <p className="auth-demo-title">Demo Accounts</p>
            <button className="auth-demo-btn" onClick={() => { setEmail('admin@ordergo.com'); setPassword('admin123'); }}>
              👨‍💼 Admin
            </button>
            <button className="auth-demo-btn" onClick={() => { setEmail('staff@ordergo.com'); setPassword('staff123'); }}>
              🍳 Staff
            </button>
            <button className="auth-demo-btn" onClick={() => { setEmail('rahul@college.edu'); setPassword('student123'); }}>
              🎓 Student
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

