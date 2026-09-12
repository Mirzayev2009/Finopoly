import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ERA_BRIEFINGS } from '@estate/content/client';
import { useAuth } from '../context/AuthContext.jsx';
import { useMyBinding } from '../hooks/useMyBinding.js';
import { useRoomConnection } from '../hooks/useRoomConnection.js';
import PageLoader from '../components/PageLoader.jsx';
import BriefingPhase from '../components/team/BriefingPhase.jsx';
import ResearchPhase from '../components/team/ResearchPhase.jsx';
import NotYourTurnPhase from '../components/team/NotYourTurnPhase.jsx';
import YourTurnPhase from '../components/team/YourTurnPhase.jsx';
import ResolutionPhase from '../components/team/ResolutionPhase.jsx';
import FinishedPhase from '../components/team/FinishedPhase.jsx';
import styles from './Team.module.css';

/**
 * The one team screen, adapting to the game phase. Room phase ('briefing' |
 * 'research' | anything else) comes straight from the host's SET_PHASE; the
 * remaining three phases (NOT_YOUR_TURN / YOUR_TURN / RESOLUTION) are
 * derived client-side from whose turn it is and whether a fresh resolution
 * just landed in the transaction feed.
 */
export default function Team() {
  const { session, profile } = useAuth();
  const accessToken = session?.access_token;
  const { binding, refresh: refreshBinding } = useMyBinding(accessToken);
  const roomSlug = binding?.roomSlug;
  const state = useRoomConnection(roomSlug, accessToken);

  const [resolvedTx, setResolvedTx] = useState(null);
  const lastSeenTxId = useRef(undefined);

  const mySyndicate = state.syndicates.find((s) => s.id === binding?.syndicateId) ?? null;

  // Detect a freshly-resolved INVESTMENT for my own syndicate by watching
  // for a new transaction id — never on the very first snapshot after
  // mount, so reopening the app mid-game doesn't replay an old resolution.
  //
  // Scans every transaction newer than the last one we saw (not just the
  // single newest one): a device that was backgrounded/offline through more
  // than one resolved turn re-syncs via the visibility/online refetch in
  // useRoomConnection, which can land several new rows at once, and this
  // team's own resolution could be buried under someone else's later one.
  // Checking only transactions[0] would silently skip straight past it.
  useEffect(() => {
    if (!mySyndicate || state.transactions.length === 0) return;
    const latest = state.transactions[0];
    if (lastSeenTxId.current === undefined) {
      lastSeenTxId.current = latest.id;
      return;
    }
    if (latest.id === lastSeenTxId.current) return;

    const seenIndex = state.transactions.findIndex((t) => t.id === lastSeenTxId.current);
    const freshSinceLastSeen = seenIndex === -1 ? state.transactions : state.transactions.slice(0, seenIndex);
    lastSeenTxId.current = latest.id;

    const myResolution = freshSinceLastSeen.find(
      (t) => t.syndicateId === mySyndicate.id && t.actionType === 'INVESTMENT'
    );
    if (myResolution) setResolvedTx(myResolution);
  }, [state.transactions, mySyndicate]);

  if (binding === null) return <PageLoader label="Loading…" />;
  if (!binding.roomSlug) return <Navigate to="/join" replace />;
  if (state.status === 'loading') return <PageLoader label="Loading your team…" />;
  if (state.status === 'error') return <div className={styles.error}>{state.error}</div>;
  if (!mySyndicate) return <PageLoader label="Syncing your syndicate…" />;

  const era = ERA_BRIEFINGS.find((e) => e.id === state.game?.eraId) ?? null;
  const myPendingTurn = state.pendingTurn?.syndicateId === mySyndicate.id ? state.pendingTurn : null;
  const turnSyndicate = state.syndicates[state.room.turnIndex] ?? null;

  let phase;
  if (resolvedTx) phase = 'RESOLUTION';
  else if (state.game?.status === 'finished') phase = 'FINISHED';
  else if (state.room.phase === 'briefing') phase = 'BRIEFING';
  else if (state.room.phase === 'research') phase = 'RESEARCH';
  else if (myPendingTurn?.stage === 'awaiting_pick') phase = 'YOUR_TURN';
  else phase = 'NOT_YOUR_TURN';

  return (
    <div className={styles.page} style={{ '--syndicate-color': mySyndicate.color }}>
      <header className={styles.header}>
        <span className={styles.chip} style={{ background: mySyndicate.color }} />
        <span className={styles.syndicateName}>{mySyndicate.name}</span>
      </header>

      {phase === 'RESOLUTION' && (
        <ResolutionPhase
          transaction={resolvedTx}
          era={era}
          cash={mySyndicate.cash}
          onContinue={() => setResolvedTx(null)}
        />
      )}
      {phase === 'FINISHED' && <FinishedPhase mySyndicate={mySyndicate} syndicates={state.syndicates} />}
      {phase === 'BRIEFING' && <BriefingPhase era={era} />}
      {phase === 'RESEARCH' && (
        <ResearchPhase
          era={era}
          room={state.room}
          syndicate={mySyndicate}
          roomSlug={roomSlug}
          accessToken={accessToken}
          myName={profile?.display_name || profile?.email?.split('@')[0] || 'Someone'}
        />
      )}
      {phase === 'NOT_YOUR_TURN' && (
        <NotYourTurnPhase
          mySyndicate={mySyndicate}
          syndicates={state.syndicates}
          pendingTurn={state.pendingTurn}
          turnSyndicate={turnSyndicate}
        />
      )}
      {phase === 'YOUR_TURN' && (
        <YourTurnPhase
          pendingTurn={myPendingTurn}
          syndicate={mySyndicate}
          isActor={binding.isActor}
          actorName={binding.actorName}
          roomSlug={roomSlug}
          accessToken={accessToken}
          onClaimed={refreshBinding}
        />
      )}
    </div>
  );
}
