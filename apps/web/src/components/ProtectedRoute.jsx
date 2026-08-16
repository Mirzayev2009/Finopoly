import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageLoader from './PageLoader.jsx';

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <PageLoader label="Loading…" />;
  if (!session) return <Navigate to="/login" replace />;

  return children;
}
