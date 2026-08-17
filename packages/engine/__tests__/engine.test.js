import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState } from '../index.js';

describe('engine smoke test', () => {
  const players = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ];

  it('creates an initial state with the first player on the move', () => {
    const state = createInitialState(players);
    expect(state.turn.playerId).toBe('p1');
    expect(state.phase).toBe('ROLL');
    expect(state.players).toHaveLength(2);
    expect(state.players[0].cash).toBe(1500);
    expect(state.pendingAuction).toBeNull();
    expect(state.pendingTrades).toEqual([]);
    expect(state.winnerId).toBeNull();
    expect(state.decks.chance).toHaveLength(16);
    expect(state.decks.chest).toHaveLength(16);
  });

  it('END_TURN advances the turn to the next player', () => {
    const state = createInitialState(players);
    const manageState = {
      ...state,
      phase: 'MANAGE',
      turn: { ...state.turn, hasRolled: true, dice: [4, 6] },
    };

    const result = applyAction(manageState, 'p1', { type: 'END_TURN', payload: {}, at: 2 });

    expect(result.error).toBeNull();
    expect(result.state.turn.playerId).toBe('p2');
    expect(result.state.phase).toBe('ROLL');
  });

  it('returns INVALID_ACTION for an unrecognized action type', () => {
    const state = createInitialState(players);
    const result = applyAction(state, 'p1', {
      type: 'NOT_A_REAL_ACTION',
      payload: {},
      at: 1,
    });

    expect(result.error).toBe('INVALID_ACTION');
    expect(result.state).toBe(state);
  });
});
