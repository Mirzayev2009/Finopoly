import { mulberry32, shuffle } from './rng.js';
import { CHANCE_CARDS, CHEST_CARDS, SPACES } from './board-data.js';

/**
 * Game state shape (plain JSON-serializable object):
 *
 * {
 *   phase: 'ROLL'|'AWAIT_BUY'|'DEBT'|'MANAGE'|'GAME_OVER',
 *   turn: { playerId, doublesCount: 0, hasRolled: false, dice: null },
 *   players: [{
 *     id, name, cash: 1500, position: 0, inJail: false, jailTurns: 0,
 *     jailCards: 0, bankrupt: false, properties: [spaceId],
 *   }],
 *   order: [playerId],           // seat order, immutable
 *   ownership: { [spaceId]: { owner, houses: 0, mortgaged: false } | null },
 *   decks: { chance: [cardIndex...], chest: [cardIndex...] },
 *   bank: { houses: 32, hotels: 12 },
 *   debt: null | { debtorId, creditorId: string|null, amount, reason },
 *   pendingAuction: null,        // reserved, not implemented
 *   pendingTrades: [],           // reserved, not implemented
 *   winnerId: null,
 *   log: [],                     // last 50 events only
 * }
 */

const LOG_LIMIT = 50;

/**
 * @param {{id: string, name: string}[]} players
 * @param {number} [seed] deterministic seed for deck shuffling. Defaults to
 *   a fixed literal (not Date.now()) so the engine stays pure — callers
 *   that care about real randomness must supply their own seed.
 * @returns {object} initial game state
 */
export function createInitialState(players, seed = 0) {
  const order = players.map((p) => p.id);
  const rng = mulberry32(seed);

  const chance = shuffle(
    CHANCE_CARDS.map((_, i) => i),
    rng,
  );
  const chest = shuffle(
    CHEST_CARDS.map((_, i) => i),
    rng,
  );

  return {
    phase: 'ROLL',
    turn: {
      playerId: order[0] ?? null,
      doublesCount: 0,
      hasRolled: false,
      dice: null,
    },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      cash: 1500,
      position: 0,
      inJail: false,
      jailTurns: 0,
      jailCards: 0,
      bankrupt: false,
      properties: [],
    })),
    order,
    ownership: {},
    decks: { chance, chest },
    bank: { houses: 32, hotels: 12 },
    debt: null,
    pendingAuction: null,
    pendingTrades: [],
    winnerId: null,
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
 * @param {object} state
 * @returns {object|undefined} the player whose turn it currently is
 */
export function getCurrentPlayer(state) {
  return getPlayer(state, state.turn.playerId);
}

/**
 * @param {object} state
 * @param {string} playerId
 * @returns {string|null} the next non-bankrupt player's id after playerId
 *   in seat order, or null if none (or playerId isn't seated)
 */
export function getNextPlayerId(state, playerId) {
  const startIndex = state.order.indexOf(playerId);
  if (startIndex === -1) return null;

  for (let offset = 1; offset <= state.order.length; offset += 1) {
    const candidateId = state.order[(startIndex + offset) % state.order.length];
    const candidate = getPlayer(state, candidateId);
    if (candidate && !candidate.bankrupt) return candidateId;
  }
  return null;
}

/**
 * Cash plus a rough face value of owned properties (unmortgaged: price;
 * mortgaged: mortgage value already banked, so just cash covers it).
 * @param {object} state
 * @param {string} playerId
 * @returns {number}
 */
export function netWorth(state, playerId) {
  const player = getPlayer(state, playerId);
  if (!player) return 0;

  const propertyValue = player.properties.reduce((total, spaceId) => {
    const entry = state.ownership[spaceId];
    const spaceData = SPACES[spaceId];
    if (!entry || !spaceData) return total;
    if (entry.mortgaged) return total;
    const houseValue = entry.houses > 0 ? entry.houses * (spaceData.houseCost ?? 0) : 0;
    return total + (spaceData.price ?? 0) + houseValue;
  }, 0);

  return player.cash + propertyValue;
}

export { LOG_LIMIT };
