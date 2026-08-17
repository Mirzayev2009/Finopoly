/**
 * Action type constants. Every action has the shape:
 *   { type: ACTION_TYPE, payload: object, at: number }
 * `payload.dice` (for ROLL) and `at` (a timestamp) are supplied by the
 * caller (the server) — the engine never generates either itself.
 */
export const ROLL = 'ROLL';
export const BUY = 'BUY';
export const DECLINE = 'DECLINE';
export const BUILD_HOUSE = 'BUILD_HOUSE';
export const SELL_HOUSE = 'SELL_HOUSE';
export const MORTGAGE = 'MORTGAGE';
export const UNMORTGAGE = 'UNMORTGAGE';
export const PAY_JAIL_FINE = 'PAY_JAIL_FINE';
export const USE_JAIL_CARD = 'USE_JAIL_CARD';
export const RESOLVE_DEBT = 'RESOLVE_DEBT';
export const BANKRUPT = 'BANKRUPT';
export const END_TURN = 'END_TURN';

export const ACTION_TYPES = Object.freeze([
  ROLL,
  BUY,
  DECLINE,
  BUILD_HOUSE,
  SELL_HOUSE,
  MORTGAGE,
  UNMORTGAGE,
  PAY_JAIL_FINE,
  USE_JAIL_CARD,
  RESOLVE_DEBT,
  BANKRUPT,
  END_TURN,
]);

/**
 * Structural validation only — no rules enforcement. Deliberately not
 * zod-based so the engine keeps zero dependencies.
 * @param {unknown} action
 * @returns {boolean}
 */
export function isValidActionShape(action) {
  if (typeof action !== 'object' || action === null) return false;
  if (typeof action.type !== 'string') return false;
  if (!ACTION_TYPES.includes(action.type)) return false;
  if (typeof action.payload !== 'object' || action.payload === null) return false;
  if (typeof action.at !== 'number') return false;
  return true;
}
