/**
 * The one place hidden card percentages get removed before anything reaches
 * a non-host audience. Pure, no imports. Used in exactly one place:
 * assemblePayload.js. Allow-list reconstruction (not delete-by-key), so a
 * future field added to an investment card's shape can't silently leak —
 * only fields explicitly named here ever survive for 'room'/'team' audiences.
 * @param {Array<object>} cards
 * @param {'host'|'room'|'team'} audience
 * @returns {Array<object>}
 */
export function stripCards(cards, audience) {
  if (!Array.isArray(cards)) return cards;
  if (audience === 'host') return cards;

  return cards.map(({ id, name, assetType, reason }) => ({ id, name, assetType, reason }));
}
