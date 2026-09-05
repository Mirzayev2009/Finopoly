import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import PageLoader from './PageLoader.jsx';

/**
 * Player-facing counterpart to ProtectedRoute: players never register, so
 * instead of bouncing an unauthenticated device to /login, this silently
 * signs it in anonymously (requires "Anonymous sign-ins" enabled in the
 * Supabase project's Auth settings). A device that already has a real
 * session (e.g. a host previewing /join on their own laptop) keeps it —
 * this only fires when there is truly no session at all.
 */
export default function AnonymousRoute({ children }) {
  const { session, loading } = useAuth();
  const [error, setError] = useState(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || session || attempted.current) return;
    attempted.current = true;
    supabase.auth.signInAnonymously().then(({ error: signInError }) => {
      if (signInError) setError(signInError.message);
    });
  }, [loading, session]);

  if (error) return <div role="alert">{error}</div>;
  if (loading || !session) return <PageLoader label="Loading…" />;

  return children;
}
