import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface GuestRouteProps {
  children: React.ReactNode;
}

/** Wraps auth pages (login, register). Redirects to discover/dashboard when already signed in. */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <span>Loading…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    const redirectTo = user?.userType === 'PROVIDER' ? '/provider/dashboard' : '/discover';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
