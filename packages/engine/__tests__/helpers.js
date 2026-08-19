import { applyAction, createInitialState } from '../index.js';

export const HOST = 'host-1';

export function makeTeams() {
  return [
    { id: 'team-a', name: 'Team A', color: 'red' },
    { id: 'team-b', name: 'Team B', color: 'blue' },
  ];
}

export function makeMembers() {
  return [
    { userId: HOST, teamId: null, role: 'host' },
    { userId: 'analyst-a', teamId: 'team-a', role: 'analyst' },
    { userId: 'strategist-a', teamId: 'team-a', role: 'strategist' },
    { userId: 'risk-a', teamId: 'team-a', role: 'risk_manager' },
    { userId: 'analyst-b', teamId: 'team-b', role: 'analyst' },
    { userId: 'strategist-b', teamId: 'team-b', role: 'strategist' },
    { userId: 'risk-b', teamId: 'team-b', role: 'risk_manager' },
  ];
}

export function makeGame(seed = 0) {
  return createInitialState(makeTeams(), makeMembers(), seed);
}

let clock = 0;

export function act(state, actorUserId, type, payload = {}) {
  clock += 1;
  return applyAction(state, actorUserId, { type, payload, at: clock });
}

/**
 * Repeatedly applies HOST_ADVANCE_PHASE. Throws if any step errors, since
 * tests use this purely to walk to a known phase, not to exercise the gate.
 */
export function advancePhase(state, times = 1) {
  let current = state;
  for (let i = 0; i < times; i += 1) {
    const result = act(current, HOST, 'HOST_ADVANCE_PHASE', {});
    if (result.error) throw new Error(`advancePhase failed: ${result.error}`);
    current = result.state;
  }
  return current;
}
