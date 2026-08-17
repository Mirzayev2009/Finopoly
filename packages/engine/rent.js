import { COLOR_GROUPS, RAILROAD_IDS, SPACES, UTILITY_IDS } from './board-data.js';

/**
 * Mortgaged properties still count toward owning the full color set for
 * the rent-doubling rule — this only checks ownership, not mortgage state.
 * @param {object} ownership
 * @param {number} spaceId
 * @param {string} ownerId
 * @returns {boolean}
 */
export function ownsMonopoly(ownership, spaceId, ownerId) {
  const spaceData = SPACES[spaceId];
  if (!spaceData || spaceData.type !== 'property') return false;
  const groupIds = COLOR_GROUPS[spaceData.color] || [];
  return groupIds.length > 0 && groupIds.every((id) => ownership[id]?.owner === ownerId);
}

/**
 * Computes the rent owed for landing on spaceId. Caller is responsible for
 * deciding WHETHER rent is owed at all (self-owned, mortgaged, owner in
 * jail all mean "don't call this") — this only computes the magnitude.
 * @param {object} ownership
 * @param {number} spaceId
 * @param {number} diceSum current roll's dice total, used for utilities
 * @returns {number}
 */
export function calculateRent(ownership, spaceId, diceSum) {
  const spaceData = SPACES[spaceId];
  const entry = ownership[spaceId];
  if (!spaceData || !entry || !entry.owner) return 0;

  if (spaceData.type === 'property') {
    if (entry.houses > 0) return spaceData.rent[entry.houses];
    const monopoly = ownsMonopoly(ownership, spaceId, entry.owner);
    return monopoly ? spaceData.rent[0] * 2 : spaceData.rent[0];
  }

  if (spaceData.type === 'railroad') {
    const count = RAILROAD_IDS.filter((id) => ownership[id]?.owner === entry.owner).length;
    return spaceData.rent[Math.max(0, count - 1)];
  }

  if (spaceData.type === 'utility') {
    const count = UTILITY_IDS.filter((id) => ownership[id]?.owner === entry.owner).length;
    const multiplier = spaceData.rent[Math.max(0, count - 1)];
    return multiplier * diceSum;
  }

  return 0;
}
