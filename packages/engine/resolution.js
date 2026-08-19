import { totalPortfolioValue } from './state.js';

const EPSILON = 0.01;

/**
 * @param {{[sectorId: string]: number}} alloc
 * @param {object} team
 * @returns {boolean}
 */
export function validateAllocationSum(alloc, team) {
  const total = totalPortfolioValue(team);
  const sum = Object.values(alloc).reduce((a, b) => a + b, 0);
  return Math.abs(sum - total) < EPSILON;
}

/**
 * Applies a round's returns to a team's holdings. Losses are proportional
 * and floored at 0 (a team can never go negative). Throws loudly if a
 * held sector has no corresponding return, per spec ("if a sector is
 * missing, error loudly") — this is a content bug, not a runtime edge case.
 * @param {{[sectorId: string]: number}} holdings
 * @param {{[sectorId: string]: number}} returns
 * @returns {{[sectorId: string]: number}} new holdings
 */
export function applyReturns(holdings, returns) {
  const next = {};
  for (const sectorId of Object.keys(holdings)) {
    if (!(sectorId in returns)) {
      throw new Error(`Missing return for sector "${sectorId}"`);
    }
    next[sectorId] = Math.max(0, holdings[sectorId] * (1 + returns[sectorId]));
  }
  return next;
}
