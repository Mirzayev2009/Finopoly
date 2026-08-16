import { supabase } from '../supabase.js';

// Assumed Supabase schema (not provisioned by this scaffold — create it in
// your Supabase project). This table replaces the in-memory room/ready
// bookkeeping a persistent socket.io server would have held, since
// Vercel serverless functions have no shared memory between invocations:
//
// create table game_players (
//   id uuid primary key default gen_random_uuid(),
//   game_id uuid not null references games(id),
//   user_id uuid not null,
//   name text not null,
//   ready boolean not null default false,
//   joined_at timestamptz not null default now(),
//   unique (game_id, user_id)
// );
//
// Enable Realtime on this table (Database > Replication) so apps/web can
// subscribe to lobby changes directly via Supabase, with no server
// broadcast step required.

/**
 * Adds (or re-adds, idempotently) a player to a game's lobby.
 * @param {string} gameId
 * @param {string} userId
 * @param {string} name
 */
export async function joinGame(gameId, userId, name) {
  const { data, error } = await supabase
    .from('game_players')
    .upsert({ game_id: gameId, user_id: userId, name, ready: false }, { onConflict: 'game_id,user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} gameId
 * @returns {Promise<object[]>}
 */
export async function listPlayers(gameId) {
  const { data, error } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * @param {string} gameId
 * @param {string} userId
 * @param {boolean} ready
 */
export async function setReady(gameId, userId, ready) {
  const { data, error } = await supabase
    .from('game_players')
    .update({ ready })
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('PLAYER_NOT_IN_GAME');
  return data;
}
