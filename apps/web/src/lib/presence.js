import { supabase } from './supabase.js';

/**
 * Ephemeral typing-indicator broadcast, scoped per team so only teammates
 * see it. Not persisted — a UI nicety only, separate from the DB-backed
 * game-state channel.
 * @param {string} gameCode
 * @param {string} teamId
 * @param {(payload: object) => void} onTyping
 * @returns {{ send: (payload: object) => void, unsubscribe: () => void }}
 */
export function subscribeToTyping(gameCode, teamId, onTyping) {
  const channel = supabase.channel(`typing:${gameCode}:${teamId}`);

  channel.on('broadcast', { event: 'typing' }, ({ payload }) => onTyping(payload));
  channel.subscribe();

  return {
    send: (payload) => channel.send({ type: 'broadcast', event: 'typing', payload }),
    unsubscribe: () => supabase.removeChannel(channel),
  };
}
