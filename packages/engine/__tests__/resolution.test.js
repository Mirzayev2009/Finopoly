import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

describe('RESOLVE_ROUND — 1929', () => {
  it('wipes an all-in banking position to $15,000 (-85%, confirmed)', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION, round 1
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { banking: 100000 } }).state;
    state = advancePhase(state, 2); // -> MARKET_EVENTS -> RESOLUTION

    const result = act(state, 'host-1', 'RESOLVE_ROUND', {});
    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.banking).toBeCloseTo(15000, 5);
  });

  it('grows an all-in gold position to $130,000 (+30%, confirmed)', () => {
    let state = makeGame();
    state = advancePhase(state, 3);
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { gold: 100000 } }).state;
    state = advancePhase(state, 2);

    const result = act(state, 'host-1', 'RESOLVE_ROUND', {});
    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.gold).toBeCloseTo(130000, 5);
  });

  it('appends a {round, startValue, endValue, delta} entry to history', () => {
    let state = makeGame();
    state = advancePhase(state, 3);
    state = act(state, 'strategist-a', 'SET_ALLOCATION', { alloc: { gold: 100000 } }).state;
    state = advancePhase(state, 2);

    const result = act(state, 'host-1', 'RESOLVE_ROUND', {});
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.history).toEqual([
      { round: 1, startValue: 100000, endValue: 130000, delta: 30000 },
    ]);
  });
});

describe('RESOLVE_ROUND — 1997', () => {
  it('grows an all-in cash position to $130,000 despite being cash (+30%, confirmed, counterintuitive)', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION, round 1
    // team-a stays default all-cash for round 1 (cash return is 0% that round)
    state = advancePhase(state, 2); // -> MARKET_EVENTS -> RESOLUTION
    state = act(state, 'host-1', 'RESOLVE_ROUND', {}).state; // round 1 resolved -> BRIEFING, round 2
    state = advancePhase(state, 2); // -> RESEARCH -> ALLOCATION (round 2)
    state = advancePhase(state, 2); // -> MARKET_EVENTS -> RESOLUTION

    const result = act(state, 'host-1', 'RESOLVE_ROUND', {}); // resolves round 2 (1997)
    expect(result.error).toBeNull();
    const team = result.state.teams.find((t) => t.id === 'team-a');
    expect(team.holdings.cash).toBeCloseTo(130000, 5);
  });
});
