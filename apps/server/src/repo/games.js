import { supabase } from '../supabase.js';

// Assumed Supabase schema (not provisioned by this scaffold — create it in
// your Supabase project):
//
// create table games (
//   id uuid primary key default gen_random_uuid(),
//   code text unique not null,
//   host_id uuid not null,
//   status text not null default 'lobby', -- 'lobby' | 'active' | 'finished'
//   version integer not null default 1,
//   state jsonb not null,
//   created_at timestamptz not null default now()
// );
//
// Enable Realtime on this table (Database > Replication) and an RLS
// SELECT policy allowing players to read their own games, so apps/web can
// subscribe to state updates directly via Supabase instead of a server
// broadcasting them over a socket.

export class VersionConflictError extends Error {
  constructor(gameId) {
    super(`Version conflict saving game ${gameId}`);
    this.name = 'VersionConflictError';
    this.gameId = gameId;
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** @returns {string} a random 6-character join code */
export function generateJoinCode() {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * @param {string} hostId
 * @param {object} initialState
 * @returns {Promise<object>} the created game row
 */
export async function createGame(hostId, initialState) {
  const code = generateJoinCode();

  const { data, error } = await supabase
    .from('games')
    .insert({ code, host_id: hostId, status: 'lobby', version: 1, state: initialState })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} gameId
 * @returns {Promise<object|null>}
 */
export async function loadGame(gameId) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function loadGameByCode(code) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Optimistic-locking save: only succeeds if the row's current version
 * still matches expectedVersion, in which case version is bumped by one.
 * @param {string} gameId
 * @param {object} nextState
 * @param {number} expectedVersion
 * @returns {Promise<object>} the updated game row
 * @throws {VersionConflictError} if no row matched (stale version)
 */
export async function saveGame(gameId, nextState, expectedVersion) {
  const { data, error } = await supabase
    .from('games')
    .update({ state: nextState, version: expectedVersion + 1 })
    .eq('id', gameId)
    .eq('version', expectedVersion)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new VersionConflictError(gameId);
  return data;
}

/**
 * @param {string} gameId
 * @param {Partial<{status: string, state: object}>} fields
 */
export async function updateGameFields(gameId, fields) {
  const { data, error } = await supabase
    .from('games')
    .update(fields)
    .eq('id', gameId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}
