import { useState } from 'react';
import { User, Mail, Phone, Hash, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    roll_number: user?.roll_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const result = await updateProfile(form);
    setMessage(result.success ? 'Profile updated!' : result.error);
    setSaving(false);
  }

  return (
    <div className="profile-page page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account details</p>
        </div>

        <div className="profile-grid">
          <div className="glass-card profile-card animate-fade-in-up">
            <div className="profile-avatar">
              <User size={40} />
            </div>
            <h2>{user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
            <span className={`badge ${user?.role === 'admin' ? 'badge-special' : 'badge-preparing'}`}>
              {user?.role === 'admin' ? '👨‍💼 Admin' : '🎓 Student'}
            </span>
          </div>

          <div className="glass-card profile-form-card animate-fade-in-up">
            <h2 className="section-heading">Edit Profile</h2>
            {message && (
              <div className={`auth-${message.includes('updated') ? 'success' : 'error'}`} style={{
                background: message.includes('updated') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${message.includes('updated') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: message.includes('updated') ? 'var(--status-ready)' : 'var(--status-cancelled)',
                borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem', fontSize: 'var(--font-size-sm)', marginBottom: '1rem'
              }}>
                {message}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-icon-wrapper">
                  <User size={18} className="input-icon" />
                  <input name="name" type="text" className="form-input input-with-icon" value={form.name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input type="email" className="form-input input-with-icon" value={user?.email} disabled style={{ opacity: 0.5 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <div className="input-icon-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input name="phone" type="tel" className="form-input input-with-icon" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <div className="input-icon-wrapper">
                  <Hash size={18} className="input-icon" />
                  <input name="roll_number" type="text" className="form-input input-with-icon" value={form.roll_number} onChange={handleChange} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
