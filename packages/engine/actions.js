/**
 * Action type constants. Every action has the shape:
 *   { type: ACTION_TYPE, payload: object, at: number }
 * `payload.dice` (when relevant) and `at` (a timestamp) are supplied by
 * the caller (the server) — the engine never generates either itself.
 */
export const ROLL_DICE = 'ROLL_DICE';
export const BUY_PROPERTY = 'BUY_PROPERTY';
export const DECLINE_PROPERTY = 'DECLINE_PROPERTY';
export const PAY_RENT = 'PAY_RENT';
export const BUILD_HOUSE = 'BUILD_HOUSE';
export const SELL_HOUSE = 'SELL_HOUSE';
export const MORTGAGE_PROPERTY = 'MORTGAGE_PROPERTY';
export const UNMORTGAGE_PROPERTY = 'UNMORTGAGE_PROPERTY';
export const DRAW_CHANCE = 'DRAW_CHANCE';
export const DRAW_CHEST = 'DRAW_CHEST';
export const PAY_TAX = 'PAY_TAX';
export const GO_TO_JAIL = 'GO_TO_JAIL';
export const PAY_JAIL_FINE = 'PAY_JAIL_FINE';
export const USE_JAIL_CARD = 'USE_JAIL_CARD';
export const PROPOSE_TRADE = 'PROPOSE_TRADE';
export const RESPOND_TRADE = 'RESPOND_TRADE';
export const START_AUCTION = 'START_AUCTION';
export const PLACE_BID = 'PLACE_BID';
export const DECLARE_BANKRUPTCY = 'DECLARE_BANKRUPTCY';
export const END_TURN = 'END_TURN';

export const ACTION_TYPES = Object.freeze([
  ROLL_DICE,
  BUY_PROPERTY,
  DECLINE_PROPERTY,
  PAY_RENT,
  BUILD_HOUSE,
  SELL_HOUSE,
  MORTGAGE_PROPERTY,
  UNMORTGAGE_PROPERTY,
  DRAW_CHANCE,
  DRAW_CHEST,
  PAY_TAX,
  GO_TO_JAIL,
  PAY_JAIL_FINE,
  USE_JAIL_CARD,
  PROPOSE_TRADE,
  RESPOND_TRADE,
  START_AUCTION,
  PLACE_BID,
  DECLARE_BANKRUPTCY,
  END_TURN,
]);

/**
 * Structural validation only — no rules enforcement. Deliberately not
 * zod-based so the engine keeps zero dependencies; apps/server may layer
 * zod schemas on top of this at the transport boundary.
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
