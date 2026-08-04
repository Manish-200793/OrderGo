import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, staffOnly = false }) {
  const { isAuthenticated, isAdmin, isStaff } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (staffOnly && !isStaff) {
    return <Navigate to="/" replace />;
  }

  return children;
}
