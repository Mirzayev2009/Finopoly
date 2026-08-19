import { describe, expect, it } from 'vitest';
import { ROUNDS } from '@estate/content';
import { act, advancePhase, makeGame } from './helpers.js';

describe('four-round compounding', () => {
  it('an all-in gold position compounds correctly through all four rounds', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION, round 1
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { gold: 100000 } }).state;

    for (let i = 0; i < 4; i += 1) {
      state = advancePhase(state, 2); // ALLOCATION -> MARKET_EVENTS -> RESOLUTION
      const resolved = act(state, 'host-1', 'RESOLVE_ROUND', {});
      expect(resolved.error).toBeNull();
      state = resolved.state;
      if (state.phase !== 'GAME_OVER') {
        state = advancePhase(state, 2); // BRIEFING -> RESEARCH -> ALLOCATION
      }
    }

    expect(state.phase).toBe('GAME_OVER');
    expect(state.round).toBe(4);

    // Computed from the shipped content data itself, not a hardcoded number,
    // so this doesn't drift when placeholder returns are replaced with real
    // historical data. Gold is chosen because none of the 4 rounds' gold
    // returns are negative enough to interact with the $0 floor.
    const expectedGold = ROUNDS.reduce((value, r) => value * (1 + r.returns.gold), 100000);
    const team = state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.gold).toBeCloseTo(expectedGold, 5);
    expect(team.history).toHaveLength(4);
  });
});
