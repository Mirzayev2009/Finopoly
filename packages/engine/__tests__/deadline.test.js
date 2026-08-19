import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

describe('missed ALLOCATION deadline', () => {
  it('round 1: an unsubmitted team defaults to 100% cash and gets auto-submitted', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION, round 1
    // team-a never calls SET_ALLOCATION or SUBMIT_ALLOCATION
    state = advancePhase(state, 1); // ALLOCATION -> MARKET_EVENTS triggers the sweep

    const team = state.teams.find((t) => t.id === 'team-a');
    expect(team.allocationSubmitted).toBe(true);
    expect(team.holdings.cash).toBe(100000);
    expect(team.holdings.banking).toBe(0);
  });

  it('round 2+: an unsubmitted team keeps its prior post-resolution holdings', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION, round 1
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { banking: 100000 } }).state;
    state = act(state, 'strategist-a', 'SUBMIT_ALLOCATION', {}).state;
    state = advancePhase(state, 2); // -> MARKET_EVENTS -> RESOLUTION
    state = act(state, 'host-1', 'RESOLVE_ROUND', {}).state; // round 1: banking -85% -> $15,000

    const postRound1 = state.teams.find((t) => t.id === 'team-a').holdings.banking;
    expect(postRound1).toBeCloseTo(15000, 5);

    state = advancePhase(state, 2); // -> RESEARCH -> ALLOCATION (round 2)
    // team-a never reallocates this round
    state = advancePhase(state, 1); // ALLOCATION -> MARKET_EVENTS triggers the sweep

    const team = state.teams.find((t) => t.id === 'team-a');
    expect(team.allocationSubmitted).toBe(true);
    expect(team.holdings.banking).toBeCloseTo(15000, 5);
  });
});
