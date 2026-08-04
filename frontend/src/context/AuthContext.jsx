import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ordergo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ordergo_token'));
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  useEffect(() => {
    if (token && !user) {
      authAPI.getProfile()
        .then(res => {
          setUser(res.data);
          localStorage.setItem('ordergo_user', JSON.stringify(res.data));
        })
        .catch(() => logout());
    }
  }, [token]);

  async function login(email, password) {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('ordergo_token', newToken);
      localStorage.setItem('ordergo_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  }

  async function register(data) {
    setLoading(true);
    try {
      const res = await authAPI.register(data);
      const { token: newToken, user: userData } = res.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('ordergo_token', newToken);
      localStorage.setItem('ordergo_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ordergo_token');
    localStorage.removeItem('ordergo_user');
  }

  async function updateProfile(data) {
    try {
      const res = await authAPI.updateProfile(data);
      setUser(res.data.user);
      localStorage.setItem('ordergo_user', JSON.stringify(res.data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Update failed.' };
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isAdmin, isStaff, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
