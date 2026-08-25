import { useEffect, useReducer } from 'react';
import { fetchRoomSnapshot } from '../lib/roomActions.js';
import { subscribeToRoomChannel } from '../lib/roomRealtime.js';
import { roomReducer, initialRoomState } from '../reducer/roomReducer.js';

/**
 * Projector Board + team phones: snapshot-then-subscribe to the
 * room-audience channel (stripped card fronts only). Wholesale state
 * replacement on every push, never merged.
 *
 * Broadcast is fire-and-forget — a message sent while this device's screen
 * was locked, its tab was asleep, or its socket had dropped is gone for
 * good, not replayed on reconnect. So besides the initial mount, this
 * re-fetches a fresh snapshot whenever the tab becomes visible again or the
 * network comes back, which is how a cold reconnect actually recovers here.
 * @param {string} slug
 * @param {string} accessToken
 */
export function useRoomConnection(slug, accessToken) {
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);

  useEffect(() => {
    if (!slug || !accessToken) return undefined;
    let cancelled = false;

    const refresh = () => {
      fetchRoomSnapshot(slug, accessToken)
        .then((payload) => {
          if (!cancelled) dispatch({ type: 'STATE_RECEIVED', payload });
        })
        .catch((error) => {
          if (!cancelled) dispatch({ type: 'ERROR', error: error.message });
        });
    };

    refresh();

    const unsubscribe = subscribeToRoomChannel(slug, (payload) => {
      dispatch({ type: 'STATE_RECEIVED', payload });
    });

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [slug, accessToken]);

  return state;
}
