import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Envelope, GithubLogo, GoogleLogo, LockKey, WarningCircle } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import TextField from '../components/TextField.jsx';
import Logo from '../components/Logo.jsx';
import styles from './Login.module.css';

const BOARD_CELLS = 36;
const LIT_CELL = 16;

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

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
    setOauthLoading(provider);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setOauthLoading(null);
      setError(oauthError.message);
    }
  }

  const oauthBusy = Boolean(oauthLoading);

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <Logo size="lg" />
          <p className={styles.tagline}>Trade blocks, build an empire, and outlast everyone else at the table.</p>
        </div>

        <div className={styles.board} aria-hidden="true">
          {Array.from({ length: BOARD_CELLS }).map((_, i) => (
            <div key={i} className={i === LIT_CELL ? `${styles.boardCell} ${styles.lit}` : styles.boardCell} />
          ))}
        </div>

        <p className={styles.footerNote}>© {new Date().getFullYear()} Estate</p>
      </aside>

      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.mobileLogo}>
            <Logo size="md" />
          </div>

          <div>
            <h1 className={styles.heading}>Sign in</h1>
            <p className={styles.subheading}>Welcome back to the table.</p>
          </div>

          <form className={styles.form} onSubmit={handlePasswordLogin} noValidate>
            <TextField
              label="Email"
              type="email"
              icon={Envelope}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              icon={LockKey}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={submitting} disabled={oauthBusy}>
              Continue
            </Button>
          </form>

          <div className={styles.divider}>or continue with</div>

          <div className={styles.oauthGroup}>
            <Button
              variant="secondary"
              fullWidth
              icon={GoogleLogo}
              loading={oauthLoading === 'google'}
              disabled={submitting || (oauthBusy && oauthLoading !== 'google')}
              onClick={() => handleOAuth('google')}
            >
              Google
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={GithubLogo}
              loading={oauthLoading === 'github'}
              disabled={submitting || (oauthBusy && oauthLoading !== 'github')}
              onClick={() => handleOAuth('github')}
            >
              GitHub
            </Button>
          </div>

          {error ? (
            <div className={styles.errorBanner} role="alert">
              <WarningCircle size={18} weight="fill" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
