import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ordergo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ordergo_token');
      localStorage.removeItem('ordergo_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email, code) => api.post('/auth/verify-reset-code', { email, code }),
  resetPassword: (email, code, newPassword) => api.post('/auth/reset-password', { email, code, newPassword }),
};

// --- Menu ---
export const menuAPI = {
  getItems: (params) => api.get('/menu', { params }),
  getItem: (id) => api.get(`/menu/${id}`),
  getSpecials: () => api.get('/menu/specials'),
  getRecommendations: () => api.get('/menu/recommendations'),
};

// --- Orders ---
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  verifyPickup: (id, qr_data) => api.post(`/orders/${id}/verify`, { qr_data }),
  confirmPayment: (id) => api.post(`/orders/${id}/pay`),
};

// --- Feedback ---
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  getForItem: (itemId) => api.get(`/feedback/item/${itemId}`),
};

// --- Admin ---
export const adminAPI = {
  addMenuItem: (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    return api.post('/admin/menu', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMenuItem: (id, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    return api.put(`/admin/menu/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMenuItem: (id) => api.delete(`/admin/menu/${id}`),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getPopularItems: () => api.get('/admin/analytics/popular'),
  getPeakHours: () => api.get('/admin/analytics/peak-hours'),
};

// --- Staff ---
export const staffAPI = {
  getOrders: (params) => api.get('/staff/orders', { params }),
  updateStatus: (id, status) => api.put(`/staff/orders/${id}/status`, { status }),
  getStats: () => api.get('/staff/stats'),
};

// --- Payments ---
export const paymentAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  getStatus: (orderId) => api.get(`/payments/${orderId}`),
};

export default api;

