import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ERA_BRIEFINGS } from '@estate/content/client';
import { useAuth } from '../context/AuthContext.jsx';
import { createRoom } from '../lib/roomActions.js';
import PageLoader from '../components/PageLoader.jsx';
import TextField from '../components/TextField.jsx';
import Button from '../components/Button.jsx';
import TopBar from '../components/TopBar.jsx';
import styles from './NewRoom.module.css';

const MIN_TEAMS = 1;
const MAX_TEAMS = 8;
const DEFAULT_STARTING_CASH = 2000;

function resizeTeamNames(current, count) {
  const next = current.slice(0, count);
  while (next.length < count) next.push(`Team ${next.length + 1}`);
  return next;
}

export default function NewRoom() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [eraSequenceDraft, setEraSequenceDraft] = useState([]);
  const [startingCash, setStartingCash] = useState(String(DEFAULT_STARTING_CASH));
  const [teamCount, setTeamCount] = useState(4);
  const [teamNames, setTeamNames] = useState(resizeTeamNames([], 4));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (profile === null) return <PageLoader label="Checking access…" />;
  if (!['host', 'admin'].includes(profile.app_role)) return <Navigate to="/team" replace />;

  function toggleEra(eraId) {
    setEraSequenceDraft((current) => (
      current.includes(eraId) ? current.filter((id) => id !== eraId) : [...current, eraId]
    ));
  }

  function changeTeamCount(count) {
    const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, count));
    setTeamCount(clamped);
    setTeamNames((current) => resizeTeamNames(current, clamped));
  }

  function changeTeamName(index, value) {
    setTeamNames((current) => current.map((n, i) => (i === index ? value : n)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const amount = Number(startingCash);
    if (!name.trim()) { setError('Give the game a name.'); return; }
    if (eraSequenceDraft.length === 0) { setError('Pick at least one period.'); return; }
    if (!amount || amount <= 0) { setError('Starting cash must be a positive number.'); return; }
    if (teamNames.some((n) => !n.trim())) { setError('Every team needs a name.'); return; }

    setSubmitting(true);
    try {
      const slug = await createRoom(session.access_token, {
        name: name.trim(),
        eraSequence: eraSequenceDraft,
        startingCash: amount,
        teamNames: teamNames.map((n) => n.trim()),
      });
      navigate(`/room/${slug}/host`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.center}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <h1 className={styles.heading}>New game</h1>
          <p className={styles.subheading}>Pick the period, the number of teams, and their names.</p>

          <TextField
            label="Game name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Room A — Morning Session"
            required
          />

          <div className={styles.field}>
            <span className={styles.label}>
              Period{eraSequenceDraft.length > 1 ? 's' : ''} ({eraSequenceDraft.length} selected, click to toggle/order)
            </span>
            <div className={styles.eraPicker}>
              {ERA_BRIEFINGS.map((e) => {
                const order = eraSequenceDraft.indexOf(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={order >= 0 ? styles.eraChipSelected : styles.eraChipOption}
                    onClick={() => toggleEra(e.id)}
                  >
                    {order >= 0 && <span className={styles.eraOrder}>{order + 1}</span>}
                    {e.title}
                  </button>
                );
              })}
            </div>
          </div>

          <TextField
            label="Starting cash"
            type="number"
            min={1}
            value={startingCash}
            onChange={(e) => setStartingCash(e.target.value)}
            required
          />

          <div className={styles.field}>
            <span className={styles.label}>Number of teams</span>
            <div className={styles.stepper}>
              <button type="button" onClick={() => changeTeamCount(teamCount - 1)} disabled={teamCount <= MIN_TEAMS}>−</button>
              <span className={styles.stepperValue}>{teamCount}</span>
              <button type="button" onClick={() => changeTeamCount(teamCount + 1)} disabled={teamCount >= MAX_TEAMS}>+</button>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Team names</span>
            <div className={styles.teamNames}>
              {teamNames.map((teamName, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <input
                  key={i}
                  className={styles.teamNameInput}
                  value={teamName}
                  onChange={(e) => changeTeamName(i, e.target.value)}
                  placeholder={`Team ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth loading={submitting}>
            Create game
          </Button>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
