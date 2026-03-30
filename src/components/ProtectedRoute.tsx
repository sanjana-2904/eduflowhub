import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'instructor' | 'student')[];
}

const ADMIN_EMAIL = 'piyaadhikary91@gmail.com';

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  // Only the designated admin email can access admin routes
  if (allowedRoles?.includes('admin') && user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
