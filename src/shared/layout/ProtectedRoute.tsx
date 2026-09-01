import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { canManage } from '@/shared/lib/roles';
import { Spinner } from '@/shared/ui';

export function ProtectedRoute({
  management = false,
}: {
  management?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Spinner label="Checking session…" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (management && !canManage(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
