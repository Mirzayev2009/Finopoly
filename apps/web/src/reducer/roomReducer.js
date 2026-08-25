export const initialRoomState = {
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: null,
  game: null,
  room: null,
  syndicates: [],
  pendingTurn: null,
  transactions: [],
};

/**
 * Every push (snapshot fetch or broadcast) replaces state wholesale —
 * never merged, never locally recomputed. This is the only action type;
 * derived display values (rank, delta, whose turn) are computed read-only
 * by components from this state, not stored here.
 */
export function roomReducer(state, action) {
  switch (action.type) {
    case 'STATE_RECEIVED':
      return {
        status: 'ready',
        error: null,
        game: action.payload.game,
        room: action.payload.room,
        syndicates: action.payload.syndicates,
        pendingTurn: action.payload.pendingTurn,
        transactions: action.payload.transactions,
      };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    default:
      return state;
  }
}
