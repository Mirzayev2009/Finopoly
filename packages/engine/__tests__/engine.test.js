import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState } from '../index.js';

describe('engine smoke test', () => {
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];

  it('creates an initial state with the first player on the move', () => {
    const state = createInitialState(players);
    expect(state.turn.currentPlayerId).toBe('p1');
    expect(state.players).toHaveLength(2);
    expect(state.pendingAuction).toBeNull();
    expect(state.pendingTrades).toEqual([]);
  });

  it('END_TURN advances the turn to the next player', () => {
    const state = createInitialState(players);
    const result = applyAction(state, 'p1', { type: 'END_TURN', payload: {}, at: 1 });

    expect(result.error).toBeNull();
    expect(result.state.turn.currentPlayerId).toBe('p2');
    expect(result.events).toEqual([
      { type: 'TURN_ENDED', payload: { previousPlayerId: 'p1', nextPlayerId: 'p2' }, at: 1 },
    ]);
  });

  it('returns NOT_IMPLEMENTED for every other action type', () => {
    const state = createInitialState(players);
    const result = applyAction(state, 'p1', {
      type: 'ROLL_DICE',
      payload: { dice: [3, 4] },
      at: 1,
    });

    expect(result.error).toBe('NOT_IMPLEMENTED');
    expect(result.state).toBe(state);
  });
});
