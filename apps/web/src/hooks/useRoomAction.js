import { useState } from 'react';
import { callRoomAction } from '../lib/roomActions.js';

/**
 * The busy/try-catch wrapper around callRoomAction shared by every page that
 * fires room actions (Host Control, and now the Board too). Resolves
 * true/false so a caller that needs to do something only on success (e.g.
 * clear a draft field) can check it, without re-throwing. A failure's message
 * is kept in `error` (dismissible via `clearError`) instead of an `alert()`,
 * so it stays visible until the host reads it rather than needing a click to
 * even appear.
 * @param {string} slug
 * @param {string|undefined} accessToken
 * @returns {{ busy: boolean, error: string|null, clearError: () => void, act: (actionType: string, payload?: object) => Promise<boolean> }}
 */
export function useRoomAction(slug, accessToken) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function act(actionType, payload) {
    setBusy(true);
    setError(null);
    try {
      await callRoomAction(slug, accessToken, actionType, payload);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, clearError: () => setError(null), act };
}
