import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle, Envelope, LockKey, User, WarningCircle } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import TextField from '../components/TextField.jsx';
import Logo from '../components/Logo.jsx';
import styles from './Login.module.css';

const BOARD_CELLS = 36;
const LIT_CELL = 16;

export default function Signup() {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (session) return <Navigate to="/lobby" replace />;

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // If the project requires email confirmation, signUp() succeeds without
    // returning a session — show a "check your inbox" state instead of
    // navigating, since there's nowhere signed-in to go yet.
    if (!data.session) {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
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
            <CheckCircle size={40} weight="fill" />
            <div>
              <h1 className={styles.heading}>Check your inbox</h1>
              <p className={styles.subheading}>We sent a confirmation link to {email}. Confirm it to sign in.</p>
            </div>
            <Link to="/login">
              <Button variant="secondary" fullWidth>
                Back to sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className={styles.heading}>Create an account</h1>
            <p className={styles.subheading}>Join the table.</p>
          </div>

          <form className={styles.form} onSubmit={handleSignup} noValidate>
            <TextField
              label="Name"
              type="text"
              icon={User}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth loading={submitting}>
              Create account
            </Button>
          </form>

          <p className={styles.subheading}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

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
