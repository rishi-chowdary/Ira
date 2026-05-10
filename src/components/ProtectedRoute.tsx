import { Navigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  mode: 'user' | 'college';
  roles?: string[];
}

export default function ProtectedRoute({ children, mode, roles = [] }: ProtectedRouteProps) {
  const { loading, isAuthenticated, sessionType, user } = useAuth();

  if (loading) {
    return <div className="page page--center">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={mode === 'college' ? '/college-portal' : '/login'} replace />;
  }

  if (mode === 'college' && sessionType !== 'college') {
    return <Navigate to="/college-portal" replace />;
  }

  if (mode === 'user' && sessionType !== 'user') {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
