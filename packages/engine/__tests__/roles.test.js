import { describe, expect, it } from 'vitest';
import { createInitialState } from '../index.js';
import { act, advancePhase, makeGame } from './helpers.js';

describe('role enforcement', () => {
  it('strategist can SUBMIT_ALLOCATION', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION
    const result = act(state, 'strategist-a', 'SUBMIT_ALLOCATION', {});
    expect(result.error).toBeNull();
    expect(result.state.teams.find((t) => t.id === 'team-a').allocationSubmitted).toBe(true);
  });

  it('analyst cannot SUBMIT_ALLOCATION', () => {
    let state = makeGame();
    state = advancePhase(state, 3);
    const result = act(state, 'analyst-a', 'SUBMIT_ALLOCATION', {});
    expect(result.error).toBe('WRONG_ROLE');
  });

  it('non-host cannot HOST_ADVANCE_PHASE', () => {
    const state = makeGame();
    const result = act(state, 'analyst-a', 'HOST_ADVANCE_PHASE', {});
    expect(result.error).toBe('WRONG_ROLE');
  });

  it('any team member may UPDATE_NOTES when no analyst is assigned to their team', () => {
    const teams = [{ id: 'team-a', name: 'Team A', color: 'red' }];
    const members = [
      { userId: 'host-1', teamId: null, role: 'host' },
      { userId: 'strategist-a', teamId: 'team-a', role: 'strategist' },
    ];
    let state = createInitialState(teams, members, 0);
    state = advancePhase(state, 2); // -> RESEARCH
    const result = act(state, 'strategist-a', 'UPDATE_NOTES', { text: 'no analyst here' });
    expect(result.error).toBeNull();
    expect(result.state.teams[0].notes).toBe('no analyst here');
  });

  it('non-analyst cannot UPDATE_NOTES when an analyst IS assigned to the team', () => {
    let state = makeGame();
    state = advancePhase(state, 2); // -> RESEARCH
    const result = act(state, 'strategist-a', 'UPDATE_NOTES', { text: 'nope' });
    expect(result.error).toBe('WRONG_ROLE');
  });
});
