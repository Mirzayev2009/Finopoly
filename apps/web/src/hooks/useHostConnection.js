import { useEffect, useReducer } from 'react';
import { fetchRoomSnapshot } from '../lib/roomActions.js';
import { subscribeToHostChannel } from '../lib/roomRealtime.js';
import { roomReducer, initialRoomState } from '../reducer/roomReducer.js';

/**
 * Host Control: snapshot-then-subscribe to the host-audience channel (full
 * card percentages, join codes). The server derives audience from the
 * caller's own role, so a host caller's snapshot fetch already returns the
 * host view — no separate room-channel subscription needed, the host
 * payload is a superset of the room one. Re-fetches on tab-visible/online,
 * same reconnect reasoning as useRoomConnection.
 * @param {string} slug
 * @param {string} accessToken
 */
export function useHostConnection(slug, accessToken) {
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

    const unsubscribe = subscribeToHostChannel(slug, (payload) => {
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
