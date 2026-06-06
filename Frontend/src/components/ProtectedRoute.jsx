import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → redirect to home
  if (!user) {
    if (location.pathname.includes('/checkout')) {
      return <Navigate to="/" state={{ openLogin: true, message: "Please log in as a buyer to check out." }} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Logged in but wrong role → redirect to their correct dashboard
  if (roles && !roles.includes(user.role)) {
    const correctPath =
      user.role === "admin" ? "/admin" :
      user.role === "seller" ? "/seller" :
      "/buyer";
    return <Navigate to={correctPath} replace />;
  }

  return children;
};

export default ProtectedRoute;