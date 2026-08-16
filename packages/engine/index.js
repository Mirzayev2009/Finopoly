import { END_TURN, isValidActionShape } from './actions.js';
import { createInitialState, getPlayer, getNextPlayerId } from './state.js';

export { createInitialState, getPlayer, netWorth, getCurrentPlayer, getNextPlayerId } from './state.js';
export * from './actions.js';

/**
 * Pure reducer: applies a single player action to a game state and returns
 * the next state plus any events produced. Never mutates its arguments.
 *
 * PURE: no Date.now(), no Math.random(), no I/O. Dice come in via
 * action.payload.dice, timestamps via action.at — both supplied by the
 * caller (the server).
 *
 * Every action type except END_TURN is currently stubbed and returns
 * { state, events: [], error: 'NOT_IMPLEMENTED' } without mutating state.
 *
 * @param {object} state
 * @param {string} playerId
 * @param {{type: string, payload: object, at: number}} action
 * @returns {{ state: object, events: object[], error: string|null }}
 */
export function applyAction(state, playerId, action) {
  if (!isValidActionShape(action)) {
    return { state, events: [], error: 'INVALID_ACTION' };
  }

  const player = getPlayer(state, playerId);
  if (!player) {
    return { state, events: [], error: 'UNKNOWN_PLAYER' };
  }

  switch (action.type) {
    case END_TURN:
      return applyEndTurn(state, playerId, action);
    default:
      return { state, events: [], error: 'NOT_IMPLEMENTED' };
  }
}

function applyEndTurn(state, playerId, action) {
  const nextPlayerId = getNextPlayerId(state, playerId);
  if (!nextPlayerId) {
    return { state, events: [], error: 'NO_ELIGIBLE_NEXT_PLAYER' };
  }

  const nextState = {
    ...state,
    turn: {
      currentPlayerId: nextPlayerId,
      phase: 'ROLL',
    },
    log: [
      ...state.log,
      { type: END_TURN, payload: { previousPlayerId: playerId, nextPlayerId }, at: action.at },
    ],
  };

  const event = { type: 'TURN_ENDED', payload: { previousPlayerId: playerId, nextPlayerId }, at: action.at };

  return { state: nextState, events: [event], error: null };
}
