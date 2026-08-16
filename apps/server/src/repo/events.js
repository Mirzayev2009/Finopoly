import { supabase } from '../supabase.js';

// Assumed Supabase schema (not provisioned by this scaffold):
//
// create table events (
//   id uuid primary key default gen_random_uuid(),
//   game_id uuid not null references games(id),
//   seq integer not null,
//   player_id uuid not null,
//   action jsonb not null,
//   created_at timestamptz not null default now()
// );

/**
 * Appends one entry to the append-only event log for a game.
 * @param {string} gameId
 * @param {number} seq
 * @param {string} playerId
 * @param {object} action
 */
export async function appendEvent(gameId, seq, playerId, action) {
  const { error } = await supabase
    .from('events')
    .insert({ game_id: gameId, seq, player_id: playerId, action });

  if (error) throw error;
}
