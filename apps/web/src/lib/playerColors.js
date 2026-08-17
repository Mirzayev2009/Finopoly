/**
 * Fixed per-seat colors (up to 4 players), used for tokens, owner dots,
 * and player panel accents. Distinct from the board's property color
 * groups and from --color-danger, so nothing gets misread as a warning.
 */
export const PLAYER_COLORS = ['#3EB878', '#E0A23D', '#4F9FE0', '#E0615A'];

/**
 * @param {object} state game state (has `order`, the immutable seat list)
 * @param {string} playerId
 * @returns {string} hex color
 */
export function getPlayerColor(state, playerId) {
  const seatIndex = state.order.indexOf(playerId);
  return PLAYER_COLORS[seatIndex] ?? PLAYER_COLORS[0];
}
