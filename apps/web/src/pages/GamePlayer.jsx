import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SmileySad } from '@phosphor-icons/react';
import { ROUNDS } from '@estate/content';
import { useAuth } from '../context/AuthContext.jsx';
import { useGameConnection } from '../hooks/useGameConnection.js';
import { useResolutionReplay } from '../hooks/useResolutionReplay.js';
import { subscribeToPresence } from '../lib/presence.js';
import TopBar from '../components/TopBar.jsx';
import PageLoader from '../components/PageLoader.jsx';
import BriefingScreen from '../components/game-phases/BriefingScreen.jsx';
import ResearchScreen from '../components/game-phases/ResearchScreen.jsx';
import AllocationScreen from '../components/game-phases/AllocationScreen.jsx';
import MarketEventsScreen from '../components/game-phases/MarketEventsScreen.jsx';
import ResolutionScreen from '../components/game-phases/ResolutionScreen.jsx';
import GameOverScreen from '../components/game-phases/GameOverScreen.jsx';
import styles from './GamePlayer.module.css';

const noop = () => {};

export default function GamePlayer() {
  const { code } = useParams();
  const { session, profile } = useAuth();
  const { connection, dispatchAction } = useGameConnection(code);
  const { state } = connection;
  const replay = useResolutionReplay(state);

  const userId = session?.user?.id;
  const myMember = useMemo(() => state?.members.find((m) => m.userId === userId), [state, userId]);
  const myTeam = useMemo(
    () => (myMember?.teamId ? state?.teams.find((t) => t.id === myMember.teamId) : null),
    [state, myMember],
  );

  useEffect(() => {
    if (!code || !userId) return undefined;
    const unsubscribe = subscribeToPresence(
      code,
      userId,
      { name: profile?.display_name || 'Player', role: myMember?.role ?? null },
      noop,
    );
    return unsubscribe;
  }, [code, userId, profile?.display_name, myMember?.role]);

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

  const round = ROUNDS[state.round - 1];

  function renderPhase() {
    if (replay && myTeam) {
      const fromTeam = replay.fromTeams.find((t) => t.id === myTeam.id);
      const toTeam = replay.toTeams.find((t) => t.id === myTeam.id);
      return (
        <ResolutionScreen round={replay.round} fromTeam={fromTeam} toTeam={toTeam} toTeams={replay.toTeams} />
      );
    }

    switch (state.phase) {
      case 'LOBBY':
        return <div className={styles.waiting}>Waiting for the host to begin…</div>;
      case 'BRIEFING':
        return <BriefingScreen round={round} roundNumber={state.round} />;
      case 'RESEARCH':
        return myTeam ? (
          <ResearchScreen
            round={round}
            deadline={state.deadline}
            team={myTeam}
            isAnalyst={myMember?.role === 'analyst'}
            analystName={profile?.display_name || 'Analyst'}
            gameCode={code}
            dispatchAction={dispatchAction}
          />
        ) : (
          <div className={styles.waiting}>You're not assigned to a team.</div>
        );
      case 'ALLOCATION':
        return myTeam ? (
          <AllocationScreen
            team={myTeam}
            round={round}
            isStrategist={myMember?.role === 'strategist'}
            dispatchAction={dispatchAction}
          />
        ) : (
          <div className={styles.waiting}>You're not assigned to a team.</div>
        );
      case 'MARKET_EVENTS':
        return (
          <MarketEventsScreen
            state={state}
            team={myTeam}
            isRiskManager={myMember?.role === 'risk_manager'}
            dispatchAction={dispatchAction}
          />
        );
      case 'RESOLUTION':
        return <div className={styles.waiting}>Tallying the round…</div>;
      case 'GAME_OVER':
        return <GameOverScreen teams={state.teams} />;
      default:
        return null;
    }
  }

  return (
    <div className={styles.page}>
      <TopBar />
      <main className={styles.main}>
        <div key={replay ? `resolution-${replay.round}` : state.phase} className={styles.phaseTransition}>
          {renderPhase()}
        </div>
      </main>
    </div>
  );
}
