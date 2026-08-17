/**
 * Action type strings sent to POST /api/games/action. Mirrors
 * packages/engine/actions.js exactly (kept as plain string literals here
 * rather than a cross-package import, since apps/web has no dependency on
 * @estate/engine — it only ever sends { type, payload } intents, never
 * computes game logic).
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
