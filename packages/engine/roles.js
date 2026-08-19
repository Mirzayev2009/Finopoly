export const ROLES = {
  HOST: 'host',
  ANALYST: 'analyst',
  STRATEGIST: 'strategist',
  RISK_MANAGER: 'risk_manager',
};

/**
 * Resolves the acting user's membership + team from state.
 * @param {object} state
 * @param {string} actorUserId
 * @returns {{ member: object, team: object|null } | null} null if the user isn't a known member
 */
export function resolveActor(state, actorUserId) {
  const member = state.members.find((m) => m.userId === actorUserId);
  if (!member) return null;
  const team = member.teamId ? state.teams.find((t) => t.id === member.teamId) ?? null : null;
  return { member, team };
}

/**
 * True if no member of the given team has the analyst role.
 * @param {object} state
 * @param {string} teamId
 */
export function teamHasNoAnalyst(state, teamId) {
  return !state.members.some((m) => m.teamId === teamId && m.role === ROLES.ANALYST);
}
