/**
 * Game state shape (plain JSON-serializable object — this is what gets
 * persisted as the `state` jsonb column server-side, and broadcast to
 * clients verbatim):
 *
 * {
 *   players: [
 *     {
 *       id: string,            // matches the auth userId
 *       name: string,
 *       cash: number,
 *       position: number,      // 0-39, index into packages/board BOARD
 *       properties: number[],  // board space ids owned by this player
 *       inJail: boolean,
 *       jailTurns: number,     // consecutive turns spent in jail so far
 *       bankrupt: boolean,
 *     },
 *     ...
 *   ],
 *   turn: {
 *     currentPlayerId: string,
 *     phase: string,           // e.g. 'ROLL' | 'ACTION' | 'END' — not enforced yet
 *   },
 *   pendingAuction: null,      // reserved for future auction flow, not implemented
 *   pendingTrades: [],         // reserved for future trade flow, not implemented
 *   log: [],                  // append-only list of { type, payload, at } events
 * }
 *
 * NOTE: `version` (used for optimistic-locking persistence) is NOT part of
 * this state shape. Versioning is a server/database concern owned by
 * apps/server/src/repo/games.js, not the pure engine.
 */

/**
 * @param {{id: string, name: string}[]} players
 * @returns {object} initial game state
 */
export function createInitialState(players) {
  return {
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      cash: 1500,
      position: 0,
      properties: [],
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
    })),
    turn: {
      currentPlayerId: players[0]?.id ?? null,
      phase: 'ROLL',
    },
    pendingAuction: null,
    pendingTrades: [],
    log: [],
  };
}

/**
 * @param {object} state
 * @param {string} playerId
 * @returns {object|undefined}
 */
export function getPlayer(state, playerId) {
  return state.players.find((p) => p.id === playerId);
}

/**
 * Cash + face value of owned properties (no house/hotel valuation yet —
 * that requires board price lookups the engine intentionally doesn't own).
 * @param {object} state
 * @param {string} playerId
 * @returns {number}
 */
export function netWorth(state, playerId) {
  const player = getPlayer(state, playerId);
  if (!player) return 0;
  return player.cash;
}

/**
 * @param {object} state
 * @returns {object|undefined} the player whose turn it currently is
 */
export function getCurrentPlayer(state) {
  return getPlayer(state, state.turn.currentPlayerId);
}

/**
 * @param {object} state
 * @param {string} playerId
 * @returns {string|null} the next non-bankrupt player's id after playerId, or null if none
 */
export function getNextPlayerId(state, playerId) {
  const ids = state.players.map((p) => p.id);
  const startIndex = ids.indexOf(playerId);
  if (startIndex === -1) return null;

  for (let offset = 1; offset <= ids.length; offset += 1) {
    const candidate = state.players[(startIndex + offset) % ids.length];
    if (!candidate.bankrupt) return candidate.id;
  }
  return null;
}
