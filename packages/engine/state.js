import { SECTORS } from '@estate/content';
import { initDeck } from './deck.js';

export const PHASES = ['LOBBY', 'BRIEFING', 'RESEARCH', 'ALLOCATION', 'MARKET_EVENTS', 'RESOLUTION', 'GAME_OVER'];

export const LOG_LIMIT = 50;

const STARTING_CAPITAL = 100000;

function makeAllCashHoldings() {
  const holdings = {};
  for (const sector of SECTORS) {
    holdings[sector.id] = 0;
  }
  holdings.cash = STARTING_CAPITAL;
  return holdings;
}

/**
 * @param {{id: string, name: string, color: string}[]} teams
 * @param {{userId: string, teamId: string|null, role: string}[]} members
 * @param {number} [seed=0] deterministic seed for card-deck shuffling
 * @returns {object} initial game state
 */
export function createInitialState(teams, members, seed = 0) {
  return {
    phase: 'LOBBY',
    round: 0,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      cash: STARTING_CAPITAL,
      position: 0,
      holdings: makeAllCashHoldings(),
      allocationSubmitted: false,
      history: [],
      revealedSectors: [],
      pendingCard: null,
      // Not in the spec's state-shape sketch, but UPDATE_NOTES needs
      // somewhere to write to.
      notes: '',
    })),
    members: members.map((m) => ({ userId: m.userId, teamId: m.teamId ?? null, role: m.role })),
    deadline: null,
    eventQueue: [],
    decks: initDeck(seed),
    log: [],
  };
}

/**
 * @param {object} state
 * @param {string} teamId
 * @returns {object|undefined}
 */
export function getTeam(state, teamId) {
  return state.teams.find((t) => t.id === teamId);
}

/**
 * @param {object} team
 * @returns {number} sum of all sector holdings (the team's current portfolio value)
 */
export function totalPortfolioValue(team) {
  return Object.values(team.holdings).reduce((a, b) => a + b, 0);
}
