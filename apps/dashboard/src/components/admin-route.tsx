import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

/** Client-side mirror of the backend's @Roles('ADMIN') guard on /users — the
 *  API is the real enforcement, this just avoids showing a broken page. */
export function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
