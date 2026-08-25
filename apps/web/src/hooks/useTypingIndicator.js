import { useEffect, useRef, useState } from 'react';
import { subscribeToTyping } from '../lib/presence.js';

const CLEAR_AFTER_MS = 2500;

/**
 * Quiet "Aziz is typing" line for the shared research notes — an ephemeral,
 * client-to-client broadcast (presence.js), entirely separate from the
 * persisted notes value itself. Never touches the server/database.
 * @param {string} roomSlug
 * @param {string} syndicateId
 * @param {string} myName
 * @returns {{ typingName: string|null, notifyTyping: () => void }}
 */
export function useTypingIndicator(roomSlug, syndicateId, myName) {
  const [typingName, setTypingName] = useState(null);
  const clearTimerRef = useRef(null);
  const senderRef = useRef(null);

  useEffect(() => {
    if (!roomSlug || !syndicateId) return undefined;

    const { send, unsubscribe } = subscribeToTyping(roomSlug, syndicateId, ({ name }) => {
      if (name === myName) return; // don't show your own typing back to yourself
      setTypingName(name);
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setTypingName(null), CLEAR_AFTER_MS);
    });
    senderRef.current = send;

    return () => {
      clearTimeout(clearTimerRef.current);
      senderRef.current = null;
      unsubscribe();
    };
  }, [roomSlug, syndicateId, myName]);

  const notifyTyping = () => senderRef.current?.({ name: myName });

  return { typingName, notifyTyping };
}
