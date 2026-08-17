import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame } from '../lib/realtime.js';
import { submitAction } from '../lib/gameActions.js';
import { useAnimatedGameState } from '../hooks/useAnimatedGameState.js';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import PageLoader from '../components/PageLoader.jsx';
import Board from '../components/board/Board.jsx';
import PlayerPanel from '../components/game/PlayerPanel.jsx';
import Controls from '../components/game/Controls.jsx';
import Dice from '../components/game/Dice.jsx';
import EventLog from '../components/game/EventLog.jsx';
import styles from './Game.module.css';

export default function Game() {
  const { gameId } = useParams();
  const location = useLocation();
  const { session } = useAuth();

  const [highlightMode, setHighlightMode] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { displayState, isAnimating, replaceState } = useAnimatedGameState(location.state?.initialState ?? null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) replaceState(data.state);
      });

    const unsubscribe = subscribeToGame(gameId, (row) => {
      if (!cancelled) replaceState(row.state);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (!actionError) return undefined;
    const timer = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(timer);
  }, [actionError]);

  async function handleSubmit(type, payload) {
    setActionError(null);
    setHighlightMode(null);
    try {
      await submitAction(gameId, session.access_token, { type, payload });
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (!displayState) {
    return (
      <div className={styles.page}>
        <TopBar />
        <PageLoader label="Loading game..." fullScreen={false} />
      </div>
    );
  }

  const currentUserId = session?.user?.id;

  return (
    <div className={styles.page}>
      <TopBar />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {displayState.order.map((playerId) => {
            const player = displayState.players.find((p) => p.id === playerId);
            if (!player) return null;
            return (
              <PlayerPanel
                key={playerId}
                state={displayState}
                player={player}
                isCurrentTurn={displayState.turn.playerId === playerId}
                isYou={playerId === currentUserId}
              />
            );
          })}
        </aside>

        <Board
          state={displayState}
          currentUserId={currentUserId}
          highlightMode={highlightMode}
          onSubmit={handleSubmit}
          isAnimating={isAnimating}
        >
          <Dice state={displayState} />
          <EventLog state={displayState} />
          <Controls
            state={displayState}
            currentUserId={currentUserId}
            onSubmit={handleSubmit}
            isAnimating={isAnimating}
            highlightMode={highlightMode}
            onHighlightModeChange={setHighlightMode}
          />
        </Board>
      </div>

      {actionError ? (
        <div className={styles.toast} role="alert">
          <WarningCircle size={18} weight="fill" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      ) : null}
    </div>
  );
}
