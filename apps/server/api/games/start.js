import { createInitialState } from '@estate/engine';
import { withAuth } from '../../src/auth.js';
import { loadGame, updateGameFields } from '../../src/repo/games.js';
import { listPlayers } from '../../src/repo/players.js';

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
  if (players.length < 2) {
    res.status(400).json({ error: 'NOT_ENOUGH_PLAYERS' });
    return;
  }
  if (!players.every((p) => p.ready)) {
    res.status(400).json({ error: 'NOT_ALL_PLAYERS_READY' });
    return;
  }

  // Date.now() lives here (I/O boundary), never inside the pure engine.
  const initialState = createInitialState(players.map((p) => ({ id: p.user_id, name: p.name })), Date.now());
  const updated = await updateGameFields(gameId, { status: 'active', state: initialState });

  // apps/web learns about this via its Realtime subscription on the games
  // table, not from this response — but returning it too costs nothing.
  res.status(200).json({ state: updated.state, version: updated.version });
});
