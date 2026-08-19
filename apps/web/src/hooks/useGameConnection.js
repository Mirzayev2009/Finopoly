import { useCallback, useEffect, useReducer } from 'react';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame } from '../lib/realtime.js';
import { submitAction } from '../lib/gameActions.js';
import { useAuth } from '../context/AuthContext.jsx';
import { gameConnectionReducer, initialConnectionState } from '../reducer/gameConnectionReducer.js';

/**
 * Loads a game by its short join code and keeps it in sync via the existing
 * Supabase Realtime subscription — server state replaces wholesale on every
 * push, no client-side merging or game-logic computation. Actions are sent
 * through the existing generic /api/games/action endpoint; the resulting
 * state arrives back via the subscription, not the response.
 * @param {string} code
 */
export function useGameConnection(code) {
  const { session } = useAuth();
  const [connection, dispatch] = useReducer(gameConnectionReducer, initialConnectionState);

  useEffect(() => {
    if (!code) return undefined;
    let cancelled = false;
    let unsubscribe = () => {};

    dispatch({ type: 'LOADING' });

    supabase
      .from('games')
      .select('*')
      .eq('code', code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          dispatch({ type: 'ERROR', error: error?.message || 'GAME_NOT_FOUND' });
          return;
        }
        dispatch({ type: 'STATE_RECEIVED', row: data });
        unsubscribe = subscribeToGame(data.id, (row) => {
          if (!cancelled) dispatch({ type: 'STATE_RECEIVED', row });
        });
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [code]);

  const dispatchAction = useCallback(
    (type, payload = {}) => {
      if (!connection.gameId || !session) return Promise.reject(new Error('NOT_CONNECTED'));
      return submitAction(connection.gameId, session.access_token, { type, payload });
    },
    [connection.gameId, session],
  );

  return { connection, dispatchAction };
}
