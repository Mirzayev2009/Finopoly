export const ACTION_TYPES = [
  'HOST_ADVANCE_PHASE',
  'HOST_SET_DEADLINE',
  'UPDATE_NOTES',
  'SET_ALLOCATION',
  'SUBMIT_ALLOCATION',
  'ROLL',
  'RESOLVE_CARD',
  'RESOLVE_ROUND',
];

/**
 * @param {*} action
 * @returns {boolean}
 */
export function isValidActionShape(action) {
  if (!action || typeof action !== 'object') return false;
  if (typeof action.type !== 'string' || !ACTION_TYPES.includes(action.type)) return false;
  if (typeof action.payload !== 'object' || action.payload === null) return false;
  if (typeof action.at !== 'number') return false;
  return true;
}
