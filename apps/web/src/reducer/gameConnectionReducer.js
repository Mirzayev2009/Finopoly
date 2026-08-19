/**
 * Deliberately thin: there is no client-side game-logic computation to
 * reduce over. Server state (the `state` jsonb column, plus its DB-row
 * envelope: id/code/host_id/status/version) replaces wholesale on every
 * push — never merged, never recomputed from.
 */
export const initialConnectionState = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  gameId: null,
  code: null,
  hostId: null,
  gameStatus: null, // the DB row's status: 'lobby' | 'active' | 'finished'
  version: null,
  state: null, // the engine state object
  error: null,
};

export function gameConnectionReducer(current, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...initialConnectionState, status: 'loading' };
    case 'STATE_RECEIVED':
      return {
        status: 'ready',
        gameId: action.row.id,
        code: action.row.code,
        hostId: action.row.host_id,
        gameStatus: action.row.status,
        version: action.row.version,
        state: action.row.state,
        error: null,
      };
    case 'ERROR':
      return { ...current, status: 'error', error: action.error };
    default:
      return current;
  }
}
