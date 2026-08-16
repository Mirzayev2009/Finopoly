import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function AuthCallback() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // supabase-js v2 automatically parses the OAuth redirect (PKCE / hash
    // fragment) and stores the session; we just need to wait for it.
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setFailed(true);
      }
      setReady(true);
    });
  }, []);

  if (!ready) return <p>Signing in…</p>;
  if (failed) return <Navigate to="/login" replace />;
  return <Navigate to="/lobby" replace />;
}
