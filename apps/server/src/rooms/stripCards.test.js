import { describe, it, expect } from 'vitest';
import { ERAS } from '@estate/content';
import { stripCards } from './stripCards.js';

const ALL_REAL_CARDS = ERAS.flatMap((era) => era.investments);

function assertNoSecretKeys(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoSecretKeys(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (key === 'percentage' || key === 'type') {
        throw new Error(`Found secret key "${key}" at ${path}.${key}`);
      }
      assertNoSecretKeys(val, `${path}.${key}`);
    }
  }
}

describe('stripCards', () => {
  it('returns cards unmodified for the host audience', () => {
    expect(stripCards(ALL_REAL_CARDS, 'host')).toBe(ALL_REAL_CARDS);
  });

  it('strips every real card down to exactly {id,name,assetType,reason} for room audience', () => {
    const stripped = stripCards(ALL_REAL_CARDS, 'room');
    expect(stripped).toHaveLength(ALL_REAL_CARDS.length);
    for (const card of stripped) {
      expect(Object.keys(card).sort()).toEqual(['assetType', 'id', 'name', 'reason']);
    }
  });

  it('strips every real card down to exactly {id,name,assetType,reason} for team audience', () => {
    const stripped = stripCards(ALL_REAL_CARDS, 'team');
    expect(stripped).toHaveLength(ALL_REAL_CARDS.length);
    for (const card of stripped) {
      expect(Object.keys(card).sort()).toEqual(['assetType', 'id', 'name', 'reason']);
    }
  });

  it('never leaks a percentage or type key anywhere, for all 720 real cards (room)', () => {
    expect(() => assertNoSecretKeys(stripCards(ALL_REAL_CARDS, 'room'))).not.toThrow();
  });

  it('never leaks a percentage or type key anywhere, for all 720 real cards (team)', () => {
    expect(() => assertNoSecretKeys(stripCards(ALL_REAL_CARDS, 'team'))).not.toThrow();
  });

  it('preserves card order', () => {
    const stripped = stripCards(ALL_REAL_CARDS, 'room');
    stripped.forEach((card, i) => {
      expect(card.id).toBe(ALL_REAL_CARDS[i].id);
    });
  });

  it('handles an empty array for every audience', () => {
    expect(stripCards([], 'host')).toEqual([]);
    expect(stripCards([], 'room')).toEqual([]);
    expect(stripCards([], 'team')).toEqual([]);
  });

  it('preserves estimated/needsReview flags for host but strips them for room/team', () => {
    const flagged = ALL_REAL_CARDS.filter((c) => c.estimated || c.needsReview);
    expect(flagged.length).toBeGreaterThan(0); // sanity: eras.js does have flagged entries

    const hostView = stripCards(flagged, 'host');
    expect(hostView.some((c) => c.estimated || c.needsReview)).toBe(true);

    const roomView = stripCards(flagged, 'room');
    expect(roomView.every((c) => !('estimated' in c) && !('needsReview' in c))).toBe(true);
  });
});
