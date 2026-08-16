import { withAuth } from '../../src/auth.js';
import { loadGameByCode } from '../../src/repo/games.js';
import { joinGame } from '../../src/repo/players.js';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const code = String(req.body?.code || '').toUpperCase();
  const name = typeof req.body?.name === 'string' ? req.body.name : 'Player';

  const row = await loadGameByCode(code);
  if (!row) {
    res.status(404).json({ error: 'GAME_NOT_FOUND' });
    return;
  }
  if (row.status !== 'lobby') {
    res.status(400).json({ error: 'GAME_ALREADY_STARTED' });
    return;
  }

  await joinGame(row.id, req.userId, name);
  res.status(200).json({ gameId: row.id });
});
