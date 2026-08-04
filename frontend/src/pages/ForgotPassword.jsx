import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import { authAPI } from '../services/api';
import './Auth.css';
import './ForgotPassword.css';

const STEPS = { EMAIL: 'email', CODE: 'code', RESET: 'reset', DONE: 'done' };

export default function ForgotPassword() {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      setPreviewUrl(res.data.previewUrl || '');
      setStep(STEPS.CODE);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.verifyResetCode(email, code);
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email, code, newPassword);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page">
      <div className="auth-container animate-scale-in">
        <div className="auth-card glass-card">
          {/* Step indicator */}
          <div className="forgot-steps">
            {['Email', 'Verify', 'Reset'].map((label, idx) => {
              const stepKeys = [STEPS.EMAIL, STEPS.CODE, STEPS.RESET];
              const currentIdx = stepKeys.indexOf(step);
              const isActive = idx <= currentIdx || step === STEPS.DONE;
              const isCurrent = idx === currentIdx;
              return (
                <div key={label} className={`forgot-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="forgot-step-dot">{step === STEPS.DONE || idx < currentIdx ? '✓' : idx + 1}</div>
                  <span>{label}</span>
                  {idx < 2 && <div className={`forgot-step-line ${idx < currentIdx || step === STEPS.DONE ? 'filled' : ''}`} />}
                </div>
              );
            })}
          </div>

          {/* Step: Enter Email */}
          {step === STEPS.EMAIL && (
            <>
              <div className="auth-header">
                <h1 className="auth-title">Forgot Password?</h1>
                <p className="auth-subtitle">Enter your email and we'll send you a reset code</p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSendCode} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      className="form-input input-with-icon"
                      placeholder="your@college.edu"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
            </>
          )}

          {/* Step: Enter Code */}
          {step === STEPS.CODE && (
            <>
              <div className="auth-header">
                <h1 className="auth-title">Check Your Email</h1>
                <p className="auth-subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
              </div>

              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="preview-link">
                  <ExternalLink size={16} />
                  View email in browser (Ethereal Preview)
                </a>
              )}

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleVerifyCode} className="auth-form">
                <div className="form-group">
                  <label className="form-label">6-Digit Reset Code</label>
                  <div className="input-icon-wrapper">
                    <KeyRound size={18} className="input-icon" />
                    <input
                      id="forgot-code"
                      type="text"
                      className="form-input input-with-icon code-input"
                      placeholder="123456"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || code.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>

              <button className="btn btn-ghost btn-sm" style={{ marginTop: '1rem', width: '100%' }} onClick={() => { setStep(STEPS.EMAIL); setError(''); }}>
                Didn't receive it? Send again
              </button>
            </>
          )}

          {/* Step: Set New Password */}
          {step === STEPS.RESET && (
            <>
              <div className="auth-header">
                <h1 className="auth-title">Set New Password</h1>
                <p className="auth-subtitle">Choose a strong new password</p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="forgot-new-password"
                      type="password"
                      className="form-input input-with-icon"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="forgot-confirm-password"
                      type="password"
                      className="form-input input-with-icon"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === STEPS.DONE && (
            <div className="forgot-success animate-scale-in">
              <CheckCircle size={64} className="forgot-success-icon" />
              <h2>Password Reset!</h2>
              <p>Your password has been successfully reset. You can now log in with your new password.</p>
              <button className="btn btn-primary btn-lg w-full" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )}

          {/* Back to login */}
          {step !== STEPS.DONE && (
            <div className="auth-footer">
              <Link to="/login" className="back-link"><ArrowLeft size={14} /> Back to Login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
