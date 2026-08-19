import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Minus, Pause, Play, Plus, SkipForward, SmileySad } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { useGameConnection } from '../hooks/useGameConnection.js';
import { subscribeToPresence } from '../lib/presence.js';
import TopBar from '../components/TopBar.jsx';
import PageLoader from '../components/PageLoader.jsx';
import Button from '../components/Button.jsx';
import Countdown from '../components/game/Countdown.jsx';
import ConnectionGrid from '../components/game/ConnectionGrid.jsx';
import styles from './GameHost.module.css';

const NEXT_PHASE_LABEL = {
  LOBBY: 'Briefing',
  BRIEFING: 'Research',
  RESEARCH: 'Allocation',
  ALLOCATION: 'Market Events',
  MARKET_EVENTS: 'Resolution',
  RESOLUTION: 'Resolve Round',
};

const START_DURATION_MS = 25 * 60 * 1000;
const NUDGE_MS = 5 * 60 * 1000;

export default function GameHost() {
  const { code } = useParams();
  const { session } = useAuth();
  const { connection, dispatchAction } = useGameConnection(code);
  const { state } = connection;

  const [online, setOnline] = useState({});
  const [paused, setPaused] = useState(false);
  const [pausedRemainingMs, setPausedRemainingMs] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!code || !userId) return undefined;
    return subscribeToPresence(code, userId, { name: 'Host', role: 'host' }, setOnline);
  }, [code, userId]);

  if (connection.status === 'loading') {
    return (
      <div className={styles.page}>
        <TopBar />
        <PageLoader label="Loading game..." fullScreen={false} />
      </div>
    );
  }

  if (connection.status === 'error' || !state) {
    return (
      <div className={styles.page}>
        <TopBar />
        <div className={styles.notFound}>
          <SmileySad size={32} aria-hidden="true" />
          <p>This game code doesn't match anything.</p>
          <Link to="/lobby" className={styles.notFoundLink}>
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  const myMember = state.members.find((m) => m.userId === userId);
  if (!myMember || myMember.role !== 'host') {
    return <Navigate to={`/game/${code}`} replace />;
  }

  const onlineUserIds = new Set(Object.keys(online));

  async function handleAdvance() {
    setAdvancing(true);
    try {
      if (state.phase === 'RESOLUTION') {
        await dispatchAction('RESOLVE_ROUND', {});
      } else {
        await dispatchAction('HOST_ADVANCE_PHASE', {});
      }
    } finally {
      setAdvancing(false);
    }
  }

  function handleStart() {
    setPaused(false);
    dispatchAction('HOST_SET_DEADLINE', { epochMs: Date.now() + START_DURATION_MS });
  }

  function handleNudge(deltaMs) {
    const base = state.deadline ?? Date.now();
    dispatchAction('HOST_SET_DEADLINE', { epochMs: Math.max(Date.now(), base + deltaMs) });
  }

  function handlePauseToggle() {
    if (paused) {
      dispatchAction('HOST_SET_DEADLINE', { epochMs: Date.now() + (pausedRemainingMs ?? 0) });
      setPaused(false);
      setPausedRemainingMs(null);
    } else if (state.deadline) {
      setPausedRemainingMs(Math.max(0, state.deadline - Date.now()));
      setPaused(true);
    }
  }

  const isGameOver = state.phase === 'GAME_OVER';

  return (
    <div className={styles.page}>
      <TopBar />

      <main className={styles.main}>
        <section className={styles.phaseCard}>
          <span className={styles.phaseLabel}>Current phase</span>
          <span className={styles.phaseName}>{state.phase.replace('_', ' ')}</span>
          <span className={styles.roundLabel}>Round {state.round} of 4</span>

          {!isGameOver ? (
            <Button size="lg" loading={advancing} onClick={handleAdvance} className={styles.advanceButton}>
              Advance to {NEXT_PHASE_LABEL[state.phase] ?? '—'}
            </Button>
          ) : null}
        </section>

        <section className={styles.timerCard}>
          <span className={styles.cardLabel}>Timer</span>
          <div className={styles.timerDisplay}>
            {paused ? (
              <span className={styles.pausedClock}>
                Paused — {Math.floor((pausedRemainingMs ?? 0) / 60000)}:
                {String(Math.floor(((pausedRemainingMs ?? 0) % 60000) / 1000)).padStart(2, '0')}
              </span>
            ) : (
              <Countdown deadline={state.deadline} size="lg" />
            )}
          </div>
          <div className={styles.timerControls}>
            <Button variant="secondary" onClick={handleStart}>
              Start 25:00
            </Button>
            <Button variant="secondary" icon={Plus} onClick={() => handleNudge(NUDGE_MS)}>
              5 min
            </Button>
            <Button variant="secondary" icon={Minus} onClick={() => handleNudge(-NUDGE_MS)}>
              5 min
            </Button>
            <Button variant="secondary" icon={paused ? Play : Pause} onClick={handlePauseToggle}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="secondary" icon={SkipForward} onClick={handleAdvance}>
              Skip
            </Button>
          </div>
        </section>

        <section className={styles.gridCard}>
          <span className={styles.cardLabel}>Teams</span>
          <ConnectionGrid
            teams={state.teams}
            members={state.members}
            onlineUserIds={onlineUserIds}
            eventQueue={state.eventQueue}
          />
        </section>
      </main>
    </div>
  );
}
