import { useCallback, useEffect, useState } from 'react';
import { fetchMyBinding } from '../lib/roomActions.js';

/**
 * Which syndicate (if any) this device is bound to, globally — /join uses
 * it to redirect an already-bound device to /team; /team uses it to know
 * which room it's in, since the route carries no slug.
 * @param {string} accessToken
 */
export function useMyBinding(accessToken) {
  const [binding, setBinding] = useState(null); // null = still loading
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!accessToken) return Promise.resolve();
    return fetchMyBinding(accessToken)
      .then(setBinding)
      .catch((e) => setError(e.message));
  }, [accessToken]);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  return { binding, error, refresh };
}
