import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // An admin-created account starts with mustChangePassword=true (see
  // users.service.ts's create()) — every route but /account is locked until
  // they actually set their own password (auth-context's updateUser, called
  // from useChangePassword's onSuccess, clears this the moment they do, no
  // reload needed). Logout still works regardless — it's in the sidebar,
  // outside the <Outlet/> this guards.
  if (user.mustChangePassword && location.pathname !== '/account') {
    return <Navigate to="/account" replace />;
  }
  return <Outlet />;
}
