import { describe, expect, it } from 'vitest';
import { act, advancePhase, makeGame } from './helpers.js';

function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}

describe('applyAction purity', () => {
  it('never mutates a deep-frozen input state', () => {
    let state = makeGame();
    state = advancePhase(state, 3); // -> ALLOCATION
    const frozen = deepFreeze(structuredClone(state));

    expect(() =>
      act(frozen, 'strategist-a', 'SET_ALLOCATION', { alloc: { cash: 100000 } }),
    ).not.toThrow();
  });

  it('returns the original state object by reference on error', () => {
    const state = makeGame();
    const result = act(state, 'nobody', 'HOST_ADVANCE_PHASE', {});
    expect(result.error).toBe('UNKNOWN_ACTOR');
    expect(result.state).toBe(state);
  });

  it('returns a new state object on success', () => {
    const state = makeGame();
    const result = act(state, 'host-1', 'HOST_ADVANCE_PHASE', {});
    expect(result.error).toBeNull();
    expect(result.state).not.toBe(state);
  });
});
