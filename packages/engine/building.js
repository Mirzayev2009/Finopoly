import { COLOR_GROUPS, SPACES } from './board-data.js';

/**
 * @param {object} ownership
 * @param {number[]} colorGroupIds
 * @returns {number[]} house count (0-5, 5 = hotel) per lot in the group
 */
export function housesInGroup(ownership, colorGroupIds) {
  return colorGroupIds.map((id) => ownership[id]?.houses ?? 0);
}

/**
 * Validates whether playerId may build one house (or upgrade to a hotel)
 * on spaceId right now. Pure — does not mutate state.
 * @returns {{ ok: boolean, error: string|null, becomingHotel?: boolean }}
 */
export function canBuildHouse(state, spaceId, playerId) {
  const spaceData = SPACES[spaceId];
  if (!spaceData || spaceData.type !== 'property') return { ok: false, error: 'NOT_A_PROPERTY' };

  const entry = state.ownership[spaceId];
  if (!entry || entry.owner !== playerId) return { ok: false, error: 'NOT_OWNER' };
  if (entry.mortgaged) return { ok: false, error: 'MORTGAGED' };

  const groupIds = COLOR_GROUPS[spaceData.color] || [];
  const ownsFullSet = groupIds.every((id) => state.ownership[id]?.owner === playerId);
  if (!ownsFullSet) return { ok: false, error: 'NOT_MONOPOLY' };

  const anyMortgagedInSet = groupIds.some((id) => state.ownership[id]?.mortgaged);
  if (anyMortgagedInSet) return { ok: false, error: 'SET_HAS_MORTGAGED_PROPERTY' };

  if (entry.houses >= 5) return { ok: false, error: 'ALREADY_HOTEL' };

  const minHouses = Math.min(...housesInGroup(state.ownership, groupIds));
  if (entry.houses > minHouses) return { ok: false, error: 'UNEVEN_BUILD' };

  const becomingHotel = entry.houses + 1 === 5;
  if (becomingHotel && state.bank.hotels < 1) return { ok: false, error: 'NO_HOTELS_AVAILABLE' };
  if (!becomingHotel && state.bank.houses < 1) return { ok: false, error: 'NO_HOUSES_AVAILABLE' };

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.cash < spaceData.houseCost) return { ok: false, error: 'INSUFFICIENT_FUNDS' };

  return { ok: true, error: null, becomingHotel };
}

/**
 * Validates whether playerId may sell one house-level (hotel counts as
 * level 5) off spaceId right now. Pure — does not mutate state.
 * @returns {{ ok: boolean, error: string|null, losingHotel?: boolean }}
 */
export function canSellHouse(state, spaceId, playerId) {
  const spaceData = SPACES[spaceId];
  if (!spaceData || spaceData.type !== 'property') return { ok: false, error: 'NOT_A_PROPERTY' };

  const entry = state.ownership[spaceId];
  if (!entry || entry.owner !== playerId) return { ok: false, error: 'NOT_OWNER' };
  if (entry.houses <= 0) return { ok: false, error: 'NO_HOUSES_TO_SELL' };

  const groupIds = COLOR_GROUPS[spaceData.color] || [];
  const maxHouses = Math.max(...housesInGroup(state.ownership, groupIds));
  if (entry.houses < maxHouses) return { ok: false, error: 'UNEVEN_SELL' };

  const losingHotel = entry.houses === 5;
  if (losingHotel && state.bank.houses < 4) return { ok: false, error: 'NOT_ENOUGH_HOUSES_IN_BANK' };

  return { ok: true, error: null, losingHotel };
}
