import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

/** Generic page-shaped placeholder for the brief window while auth resolves
 *  (e.g. a hard refresh on /account/*) — every route behind this guard uses
 *  the same `container max-w-2xl py-8` shell with a title above its content,
 *  so one shape covers all of them until the real page takes over. */
function AccountPageSkeleton() {
  return (
    <div className="container max-w-2xl py-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <AccountPageSkeleton />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
