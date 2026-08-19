import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

describe('SET_ALLOCATION', () => {
  it('rejects an allocation that does not sum to the team total value with ALLOCATION_MISMATCH', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION
    const result = act(state, 'strategist-a', 'SET_ALLOCATION', {
      alloc: { cash: 50000, gold: 40000 }, // sums to 90,000, not 100,000
    });
    expect(result.error).toBe('ALLOCATION_MISMATCH');
  });

  it('accepts an allocation that sums exactly to the team total value', () => {
    let state = makeGame();
    state = advancePhase(state, 3);
    const result = act(state, 'strategist-a', 'SET_ALLOCATION', {
      alloc: { banking: 60000, cash: 40000 },
    });
    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.banking).toBe(60000);
    expect(team.holdings.cash).toBe(40000);
    expect(team.holdings.gold).toBe(0);
  });

  it('is overwritable until SUBMIT_ALLOCATION', () => {
    let state = makeGame();
    state = advancePhase(state, 3);
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { cash: 100000 } }).state;
    const result = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { gold: 100000 } });
    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.gold).toBe(100000);
    expect(team.holdings.cash).toBe(0);
  });
});
