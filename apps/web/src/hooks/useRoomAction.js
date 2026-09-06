import { useState } from 'react';
import { callRoomAction } from '../lib/roomActions.js';

/**
 * The busy/try-catch-alert wrapper around callRoomAction shared by every
 * page that fires room actions (Host Control, and now the Board too).
 * Resolves true/false so a caller that needs to do something only on
 * success (e.g. clear a draft field) can check it, without re-throwing.
 * @param {string} slug
 * @param {string|undefined} accessToken
 * @returns {{ busy: boolean, act: (actionType: string, payload?: object) => Promise<boolean> }}
 */
export function useRoomAction(slug, accessToken) {
  const [busy, setBusy] = useState(false);

  async function act(actionType, payload) {
    setBusy(true);
    try {
      await callRoomAction(slug, accessToken, actionType, payload);
      return true;
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, act };
}
