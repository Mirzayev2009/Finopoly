import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useMyBinding } from '../hooks/useMyBinding.js';
import { callRoomAction, resolveJoinCode } from '../lib/roomActions.js';
import { ROLE_STORAGE_KEY } from '../lib/teamRole.js';
import PageLoader from '../components/PageLoader.jsx';
import styles from './Join.module.css';

const ROLES = [
  { id: 'analyst', label: 'Market Analyst' },
  { id: 'strategist', label: 'Investment Strategist' },
  { id: 'risk_manager', label: 'Risk Manager' },
];

export default function Join() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const { binding, refresh } = useMyBinding(accessToken);
  const [code, setCode] = useState('');
  const [role, setRole] = useState('analyst');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (binding === null) return <PageLoader label="Checking your team…" />;
  if (binding?.roomSlug) return <Navigate to="/team" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const roomSlug = await resolveJoinCode(code, accessToken);
      await callRoomAction(roomSlug, accessToken, 'JOIN_SYNDICATE', { joinCode: code, role });
      localStorage.setItem(ROLE_STORAGE_KEY, role);
      await refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.heading}>Join your team</h1>

        <label className={styles.label} htmlFor="join-code">Join code</label>
        <input
          id="join-code"
          className={styles.codeInput}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus
          required
        />

        <label className={styles.label} htmlFor="role">Your role</label>
        <div className={styles.roleGroup} role="radiogroup" aria-label="Role">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={role === r.id}
              className={`${styles.roleOption} ${role === r.id ? styles.roleSelected : ''}`}
              onClick={() => setRole(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button type="submit" className={styles.primaryButton} disabled={submitting || !code}>
          {submitting ? 'Joining…' : 'Join'}
        </button>

        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </div>
  );
}
