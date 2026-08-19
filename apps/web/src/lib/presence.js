import { supabase } from './supabase.js';

/**
 * Tracks this client's presence on a per-game Presence channel (ephemeral,
 * not persisted to games.state) and reports the full online set whenever it
 * changes. Powers the host console's "who's connected" column.
 * @param {string} gameCode
 * @param {string} userId
 * @param {object} meta e.g. { name, role, teamId }
 * @param {(state: Record<string, object[]>) => void} onSync
 * @returns {() => void} unsubscribe
 */
export function subscribeToPresence(gameCode, userId, meta, onSync) {
  const channel = supabase.channel(`presence:${gameCode}`, {
    config: { presence: { key: userId } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    onSync(channel.presenceState());
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(meta);
    }
  });

  return () => supabase.removeChannel(channel);
}

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
