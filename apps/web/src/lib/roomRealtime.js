import { supabase } from './supabase.js';

/**
 * Subscribes to a private Realtime broadcast topic. Same pattern already
 * proven in presence.js, plus `private: true` so the server's RLS policies
 * on realtime.messages gate who can subscribe (see apps/server/schema.sql).
 * @param {string} topic
 * @param {string} event
 * @param {(payload: object) => void} onMessage
 * @returns {() => void} unsubscribe
 */
function subscribeToTopic(topic, event, onMessage) {
  const channel = supabase.channel(topic, { config: { private: true } });
  channel.on('broadcast', { event }, ({ payload }) => onMessage(payload));
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

/** Projector Board + team phones: room:{slug}, stripped card fronts only. */
export function subscribeToRoomChannel(slug, onState) {
  return subscribeToTopic(`room:${slug}`, 'state', onState);
}

/** Host Control only: host:{slug}, full card percentages. */
export function subscribeToHostChannel(slug, onState) {
  return subscribeToTopic(`host:${slug}`, 'state', onState);
}

/** /leaderboard: cross-room standings delta. */
export function subscribeToGlobalChannel(onStandings) {
  return subscribeToTopic('global', 'standings', onStandings);
}
