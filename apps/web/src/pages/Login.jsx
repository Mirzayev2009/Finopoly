import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/lobby" replace />;

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  async function handleOAuth(provider) {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Estate</h1>

        <form className={styles.form} onSubmit={handlePasswordLogin}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className={styles.primaryButton} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.divider}>or</p>

        <button className={styles.oauthButton} type="button" onClick={() => handleOAuth('google')}>
          Continue with Google
        </button>
        <button className={styles.oauthButton} type="button" onClick={() => handleOAuth('github')}>
          Continue with GitHub
        </button>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </div>
  );
}
