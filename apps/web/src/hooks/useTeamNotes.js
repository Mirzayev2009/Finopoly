import { useEffect, useRef, useState } from 'react';
import { callRoomAction } from '../lib/roomActions.js';

const DEBOUNCE_MS = 400;

/**
 * Shared research notes: local edits win over incoming broadcasts until
 * they're flushed to the server, debounced 400ms. On reconnect (tab
 * visible again / network back), an unsaved edit is flushed immediately
 * instead of waiting out the debounce — "never lose a team's research to a
 * dropped socket."
 * @param {string} roomSlug
 * @param {string} accessToken
 * @param {string} serverNotes the syndicate's current notes from the room payload
 * @returns {{ text: string, setText: (text: string) => void }}
 */
export function useTeamNotes(roomSlug, accessToken, serverNotes) {
  const [text, setTextState] = useState(serverNotes ?? '');
  const dirtyRef = useRef(false);
  const debounceRef = useRef(null);
  const textRef = useRef(text);
  textRef.current = text;

  // Adopt an incoming server value only while there's no unsaved local edit.
  useEffect(() => {
    if (!dirtyRef.current) setTextState(serverNotes ?? '');
  }, [serverNotes]);

  const flush = () => {
    clearTimeout(debounceRef.current);
    if (!roomSlug || !accessToken) return;
    callRoomAction(roomSlug, accessToken, 'UPDATE_NOTES', { text: textRef.current }).catch(() => {});
    dirtyRef.current = false;
  };

  const setText = (next) => {
    setTextState(next);
    dirtyRef.current = true;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flush, DEBOUNCE_MS);
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && dirtyRef.current) flush();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      // Flush rather than just clearing the timer: an unmount mid-debounce
      // (host changes phase away from research, navigation, tab close) must
      // not silently drop the last <400ms of typing.
      if (dirtyRef.current) flush();
      else clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug, accessToken]);

  return { text, setText };
}
