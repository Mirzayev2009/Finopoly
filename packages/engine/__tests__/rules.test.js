import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState } from '../index.js';

function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}

const TWO_PLAYERS = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
];

describe('rules', () => {
  it('three doubles sends to jail without moving', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      turn: { ...base.turn, doublesCount: 2 },
      players: base.players.map((p) => (p.id === 'p1' ? { ...p, position: 5 } : p)),
    };

    const result = applyAction(state, 'p1', { type: 'ROLL', payload: { dice: [3, 3] }, at: 1 });

    expect(result.error).toBeNull();
    const p1 = result.state.players.find((p) => p.id === 'p1');
    // Teleported to jail (10), NOT moved by the dice sum (would be 11).
    expect(p1.position).toBe(10);
    expect(p1.inJail).toBe(true);
    expect(result.state.phase).toBe('MANAGE');
    expect(result.state.turn.doublesCount).toBe(0);
  });

  it('passing GO once pays 200; landing exactly on GO pays 200', () => {
    const base = createInitialState(TWO_PLAYERS);

    // Passing GO: wraps onto space 10 ("just visiting" — neutral, isolates the +200).
    const passState = {
      ...base,
      players: base.players.map((p) => (p.id === 'p1' ? { ...p, position: 39, cash: 1500 } : p)),
    };
    const passResult = applyAction(passState, 'p1', { type: 'ROLL', payload: { dice: [5, 6] }, at: 1 });
    expect(passResult.error).toBeNull();
    const p1AfterPass = passResult.state.players.find((p) => p.id === 'p1');
    expect(p1AfterPass.position).toBe(10);
    expect(p1AfterPass.cash).toBe(1700);

    // Landing exactly on GO.
    const landState = {
      ...base,
      players: base.players.map((p) => (p.id === 'p1' ? { ...p, position: 30, cash: 1500 } : p)),
    };
    const landResult = applyAction(landState, 'p1', { type: 'ROLL', payload: { dice: [4, 6] }, at: 1 });
    expect(landResult.error).toBeNull();
    const p1AfterLand = landResult.state.players.find((p) => p.id === 'p1');
    expect(p1AfterLand.position).toBe(0);
    expect(p1AfterLand.cash).toBe(1700);
  });

  it('rent doubles on an undeveloped monopoly', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      turn: { ...base.turn, playerId: 'p2' },
      ownership: {
        1: { owner: 'p1', houses: 0, mortgaged: false },
        3: { owner: 'p1', houses: 0, mortgaged: false },
      },
      players: base.players.map((p) =>
        p.id === 'p2' ? { ...p, position: 0, cash: 1500 } : { ...p, properties: [1, 3] },
      ),
    };

    // Space 3 ("Cinder Row", brown): rent [4,20,60,180,320,450] -> undeveloped monopoly = 4*2 = 8.
    const result = applyAction(state, 'p2', { type: 'ROLL', payload: { dice: [1, 2] }, at: 1 });

    expect(result.error).toBeNull();
    const p2 = result.state.players.find((p) => p.id === 'p2');
    const p1 = result.state.players.find((p) => p.id === 'p1');
    expect(p2.cash).toBe(1500 - 8);
    expect(p1.cash).toBe(1500 + 8);
  });

  it('hotel rent uses rent[5]', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      turn: { ...base.turn, playerId: 'p2' },
      ownership: {
        1: { owner: 'p1', houses: 0, mortgaged: false },
        3: { owner: 'p1', houses: 5, mortgaged: false },
      },
      players: base.players.map((p) =>
        p.id === 'p2' ? { ...p, position: 0, cash: 1500 } : { ...p, properties: [1, 3] },
      ),
    };

    // Space 3 hotel: rent[5] = 450.
    const result = applyAction(state, 'p2', { type: 'ROLL', payload: { dice: [1, 2] }, at: 1 });

    expect(result.error).toBeNull();
    const p2 = result.state.players.find((p) => p.id === 'p2');
    expect(p2.cash).toBe(1500 - 450);
  });

  it('mortgaged property collects zero rent but still completes the set', () => {
    const base = createInitialState(TWO_PLAYERS);
    const ownership = {
      1: { owner: 'p1', houses: 0, mortgaged: true },
      3: { owner: 'p1', houses: 0, mortgaged: false },
    };

    // Landing on the mortgaged property (space 1) itself: zero rent.
    const stateA = {
      ...base,
      turn: { ...base.turn, playerId: 'p2' },
      ownership,
      players: base.players.map((p) =>
        p.id === 'p2' ? { ...p, position: 39, cash: 1500 } : { ...p, properties: [1, 3] },
      ),
    };
    const resultA = applyAction(stateA, 'p2', { type: 'ROLL', payload: { dice: [1, 1] }, at: 1 });
    expect(resultA.error).toBeNull();
    const p2A = resultA.state.players.find((p) => p.id === 'p2');
    expect(p2A.position).toBe(1);
    expect(p2A.cash).toBe(1700); // +200 pass GO, 0 rent (mortgaged)

    // Landing on the unmortgaged sibling (space 3): still doubled, since the
    // mortgaged property still counts toward owning the full set.
    const stateB = {
      ...base,
      turn: { ...base.turn, playerId: 'p2' },
      ownership,
      players: base.players.map((p) =>
        p.id === 'p2' ? { ...p, position: 39, cash: 1500 } : { ...p, properties: [1, 3] },
      ),
    };
    const resultB = applyAction(stateB, 'p2', { type: 'ROLL', payload: { dice: [1, 3] }, at: 1 });
    expect(resultB.error).toBeNull();
    const p2B = resultB.state.players.find((p) => p.id === 'p2');
    const p1B = resultB.state.players.find((p) => p.id === 'p1');
    expect(p2B.position).toBe(3);
    expect(p2B.cash).toBe(1700 - 8); // +200 pass GO, then doubled rent (4*2)
    expect(p1B.cash).toBe(1500 + 8);
  });

  it('even-build rule rejects a 2nd house when a sibling has 0', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      phase: 'MANAGE',
      turn: { ...base.turn, playerId: 'p1', hasRolled: true, dice: [2, 3] },
      ownership: {
        1: { owner: 'p1', houses: 0, mortgaged: false },
        3: { owner: 'p1', houses: 0, mortgaged: false },
      },
      players: base.players.map((p) => (p.id === 'p1' ? { ...p, properties: [1, 3], cash: 1500 } : p)),
    };

    const first = applyAction(state, 'p1', { type: 'BUILD_HOUSE', payload: { spaceId: 1 }, at: 1 });
    expect(first.error).toBeNull();
    expect(first.state.ownership[1].houses).toBe(1);

    const second = applyAction(first.state, 'p1', { type: 'BUILD_HOUSE', payload: { spaceId: 1 }, at: 2 });
    expect(second.error).toBe('UNEVEN_BUILD');
    expect(second.state).toBe(first.state);
  });

  it('railroad rent scales 25/50/100/200', () => {
    const base = createInitialState(TWO_PLAYERS);
    const railroadIds = [5, 15, 25, 35];
    const expectedRents = [25, 50, 100, 200];

    railroadIds.forEach((_, i) => {
      const ownedIds = railroadIds.slice(0, i + 1);
      const ownership = {};
      for (const id of ownedIds) ownership[id] = { owner: 'p1', houses: 0, mortgaged: false };

      const state = {
        ...base,
        turn: { ...base.turn, playerId: 'p2' },
        ownership,
        players: base.players.map((p) =>
          p.id === 'p2' ? { ...p, position: 0, cash: 1500 } : { ...p, properties: ownedIds },
        ),
      };

      const result = applyAction(state, 'p2', { type: 'ROLL', payload: { dice: [2, 3] }, at: 1 });
      expect(result.error).toBeNull();
      const p2 = result.state.players.find((p) => p.id === 'p2');
      expect(p2.cash).toBe(1500 - expectedRents[i]);
    });
  });

  it('insufficient cash enters DEBT, not negative cash', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      turn: { ...base.turn, playerId: 'p2' },
      ownership: {
        1: { owner: 'p1', houses: 0, mortgaged: false },
        3: { owner: 'p1', houses: 0, mortgaged: false },
      },
      players: base.players.map((p) =>
        p.id === 'p2' ? { ...p, position: 0, cash: 5 } : { ...p, properties: [1, 3] },
      ),
    };

    const result = applyAction(state, 'p2', { type: 'ROLL', payload: { dice: [1, 2] }, at: 1 });

    expect(result.error).toBeNull();
    const p2 = result.state.players.find((p) => p.id === 'p2');
    expect(p2.cash).toBe(5); // untouched — never went negative
    expect(result.state.phase).toBe('DEBT');
    expect(result.state.debt).toEqual({ debtorId: 'p2', creditorId: 'p1', amount: 8, reason: 'RENT' });
  });

  it('bankruptcy to a player transfers cash and properties', () => {
    const players = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Cara' },
    ];
    const base = createInitialState(players);
    const state = {
      ...base,
      phase: 'DEBT',
      turn: { ...base.turn, playerId: 'p2' },
      debt: { debtorId: 'p2', creditorId: 'p1', amount: 500, reason: 'RENT' },
      ownership: {
        6: { owner: 'p2', houses: 0, mortgaged: false },
      },
      players: base.players.map((p) => {
        if (p.id === 'p2') return { ...p, cash: 20, properties: [6] };
        if (p.id === 'p1') return { ...p, cash: 1000 };
        return p;
      }),
    };

    const result = applyAction(state, 'p2', { type: 'BANKRUPT', payload: {}, at: 1 });

    expect(result.error).toBeNull();
    const p1 = result.state.players.find((p) => p.id === 'p1');
    const p2 = result.state.players.find((p) => p.id === 'p2');
    expect(p2.bankrupt).toBe(true);
    expect(p2.cash).toBe(0);
    expect(p2.properties).toEqual([]);
    expect(p1.cash).toBe(1000 + 20);
    expect(p1.properties).toContain(6);
    expect(result.state.ownership[6].owner).toBe('p1');
    expect(result.state.phase).not.toBe('GAME_OVER'); // p3 is still active
  });

  it('last player standing sets GAME_OVER and winnerId', () => {
    const base = createInitialState(TWO_PLAYERS);
    const state = {
      ...base,
      phase: 'DEBT',
      turn: { ...base.turn, playerId: 'p2' },
      debt: { debtorId: 'p2', creditorId: null, amount: 200, reason: 'TAX' },
      players: base.players.map((p) => (p.id === 'p2' ? { ...p, cash: 10 } : p)),
    };

    const result = applyAction(state, 'p2', { type: 'BANKRUPT', payload: {}, at: 1 });

    expect(result.error).toBeNull();
    expect(result.state.phase).toBe('GAME_OVER');
    expect(result.state.winnerId).toBe('p1');
    const p2 = result.state.players.find((p) => p.id === 'p2');
    expect(p2.bankrupt).toBe(true);
  });

  it('applyAction never mutates its input', () => {
    const state = createInitialState(TWO_PLAYERS);
    deepFreeze(state);

    expect(() => {
      applyAction(state, 'p1', { type: 'ROLL', payload: { dice: [2, 3] }, at: 1 });
    }).not.toThrow();

    expect(state.turn.playerId).toBe('p1');
    expect(state.phase).toBe('ROLL');
    expect(state.players[0].position).toBe(0);
  });
});
