import { createInitialState } from '@estate/engine';
import { withAuth } from '../../src/auth.js';
import { loadGame, updateGameFields } from '../../src/repo/games.js';
import { listPlayers } from '../../src/repo/players.js';

const ROLE_CYCLE = ['analyst', 'strategist', 'risk_manager'];
const TEAM_COLORS = ['#3eb878', '#4d8fdd', '#c9a66b', '#e5484d', '#a875e0', '#3ecfc9'];

// PLACEHOLDER team/role assignment — there is no team-formation or
// role-picking UI yet (a separate future task). Ready lobby players are
// auto-grouped into teams of 3 in join order, cycling
// analyst -> strategist -> risk_manager, so the game is playable end-to-end
// for testing. A team smaller than 3 (the remainder) is missing one or two
// roles and those role-gated actions simply won't be available to it yet.
function synthesizeTeamsAndMembers(nonHostPlayers) {
  const teams = [];
  const members = [];
  for (let i = 0; i < nonHostPlayers.length; i += 1) {
    const player = nonHostPlayers[i];
    const teamIndex = Math.floor(i / 3);
    const roleIndex = i % 3;
    if (roleIndex === 0) {
      teams.push({
        id: `team-${teamIndex + 1}`,
        name: `Team ${teamIndex + 1}`,
        color: TEAM_COLORS[teamIndex % TEAM_COLORS.length],
      });
    }
    members.push({ userId: player.user_id, teamId: `team-${teamIndex + 1}`, role: ROLE_CYCLE[roleIndex] });
  }
  return { teams, members };
}

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { gameId } = req.body || {};

  const game = await loadGame(gameId);
  if (!game) {
    res.status(404).json({ error: 'GAME_NOT_FOUND' });
    return;
  }
  if (game.host_id !== req.userId) {
    res.status(403).json({ error: 'ONLY_HOST_CAN_START' });
    return;
  }

  const players = await listPlayers(gameId);
  const nonHostPlayers = players.filter((p) => p.user_id !== game.host_id);
  if (nonHostPlayers.length < 1) {
    res.status(400).json({ error: 'NOT_ENOUGH_PLAYERS' });
    return;
  }
  if (!players.every((p) => p.ready)) {
    res.status(400).json({ error: 'NOT_ALL_PLAYERS_READY' });
    return;
  }

  const { teams, members } = synthesizeTeamsAndMembers(nonHostPlayers);
  members.push({ userId: game.host_id, teamId: null, role: 'host' });

  // Date.now() lives here (I/O boundary), never inside the pure engine.
  const initialState = createInitialState(teams, members, Date.now());
  const updated = await updateGameFields(gameId, { status: 'active', state: initialState });

  // apps/web learns about this via its Realtime subscription on the games
  // table, not from this response — but returning it too costs nothing.
  res.status(200).json({ state: updated.state, version: updated.version });
});
