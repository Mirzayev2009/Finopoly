import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

describe('ROLL', () => {
  it('a team cannot roll twice in the same MARKET_EVENTS phase', () => {
    let state = makeGame();
    state = advancePhase(state, 4); // -> MARKET_EVENTS

    // dice sum 3 -> space 3, a 'bonus' space (no card), so ROLL pops the
    // team from eventQueue immediately.
    const first = act(state, 'risk-a', 'ROLL', { dice: [3, 0] });
    expect(first.error).toBeNull();
    expect(first.state.eventQueue[0]).toBe('team-b');

    const second = act(first.state, 'risk-a', 'ROLL', { dice: [1, 1] });
    expect(second.error).toBe('NOT_TEAM_TURN');
  });

  it('a team with a pending card cannot roll again even if still head of queue', () => {
    let state = makeGame();
    state = advancePhase(state, 4);

    // dice sum 1 -> space 1, a 'card' space: draws a card, stays at head of queue.
    const first = act(state, 'risk-a', 'ROLL', { dice: [1, 0] });
    expect(first.error).toBeNull();
    expect(first.state.eventQueue[0]).toBe('team-a');
    expect(first.state.teams.find((t) => t.id === 'team-a').pendingCard).not.toBeNull();

    const second = act(first.state, 'risk-a', 'ROLL', { dice: [1, 1] });
    expect(second.error).toBe('PENDING_CARD_UNRESOLVED');
  });

  it('WRONG_ROLE for non-risk-manager attempting to ROLL', () => {
    let state = makeGame();
    state = advancePhase(state, 4);
    const result = act(state, 'strategist-a', 'ROLL', { dice: [1, 1] });
    expect(result.error).toBe('WRONG_ROLE');
  });
});
