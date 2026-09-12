import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import MenuPage from './pages/Menu';
import CartPage from './pages/Cart';
import OrdersPage from './pages/Orders';
import OrderDetailPage from './pages/OrderDetail';
import PaymentPage from './pages/PaymentPage';
import ProfilePage from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import MenuManager from './pages/admin/MenuManager';
import OrderManager from './pages/admin/OrderManager';
import Analytics from './pages/admin/Analytics';
import StaffDashboard from './pages/staff/StaffDashboard';
import OrderQueue from './pages/staff/OrderQueue';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'menu', element: <MenuPage /> },
      {
        path: 'cart',
        element: <ProtectedRoute><CartPage /></ProtectedRoute>,
      },
      {
        path: 'orders',
        element: <ProtectedRoute><OrdersPage /></ProtectedRoute>,
      },
      {
        path: 'orders/:id',
        element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute>,
      },
      {
        path: 'payment/:id',
        element: <ProtectedRoute><PaymentPage /></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
      },
      {
        path: 'admin',
        element: <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'menu', element: <MenuManager /> },
          { path: 'orders', element: <OrderManager /> },
          { path: 'analytics', element: <Analytics /> },
        ],
      },
      {
        path: 'staff',
        element: <ProtectedRoute staffOnly><StaffDashboard /></ProtectedRoute>,
      },
    ],
  },
  {
    path: '/queue',
    element: <ProtectedRoute staffOnly><OrderQueue /></ProtectedRoute>,
  },
]);
