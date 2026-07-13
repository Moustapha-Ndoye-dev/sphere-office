import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: 'superadmin' | 'admin' | 'cashier';
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
};

export function ProtectedRoute({ children, requiredRole, requireAdmin = false, requireSuperAdmin = false }: ProtectedRouteProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const effectiveRole = requireSuperAdmin ? 'superadmin' : requireAdmin ? 'admin' : requiredRole;

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Verification de la session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (effectiveRole === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/admin/pos" replace />;
  }

  if (effectiveRole && effectiveRole !== 'admin' && user.role !== effectiveRole) {
    return <Navigate to="/admin/pos" replace />;
  }

  return <>{children}</>;
}
