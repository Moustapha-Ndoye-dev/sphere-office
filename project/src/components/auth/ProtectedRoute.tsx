import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/auth';

export function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const user = getCurrentUser();

  if (!user) {
    // Pas connecté
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Rôle insuffisant
    return <Navigate to="/unauthorized" replace />;
  }

  // Autorisé
  return <>{children}</>;
}