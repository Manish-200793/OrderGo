import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', roll_number: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    const result = await register({
      name: form.name,
      email: form.email,
      phone: form.phone,
      roll_number: form.roll_number,
      password: form.password,
    });

    if (result.success) {
      navigate('/menu');
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-container animate-scale-in">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join OrderGo and skip the queue</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-icon-wrapper">
                <User size={18} className="input-icon" />
                <input id="register-name" name="name" type="text" className="form-input input-with-icon" placeholder="Your full name" value={form.name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">College Email</label>
              <div className="input-icon-wrapper">
                <Mail size={18} className="input-icon" />
                <input id="register-email" name="email" type="email" className="form-input input-with-icon" placeholder="your@college.edu" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <div className="input-icon-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input id="register-phone" name="phone" type="tel" className="form-input input-with-icon" placeholder="9876543210" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <div className="input-icon-wrapper">
                  <Hash size={18} className="input-icon" />
                  <input id="register-roll" name="roll_number" type="text" className="form-input input-with-icon" placeholder="CS2024001" value={form.roll_number} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-icon-wrapper">
                <Lock size={18} className="input-icon" />
                <input id="register-password" name="password" type="password" className="form-input input-with-icon" placeholder="Min 6 characters" value={form.password} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-icon-wrapper">
                <Lock size={18} className="input-icon" />
                <input id="register-confirm" name="confirmPassword" type="password" className="form-input input-with-icon" placeholder="Confirm your password" value={form.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
