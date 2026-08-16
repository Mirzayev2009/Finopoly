import { createInitialState } from '@estate/engine';
import { withAuth } from '../../src/auth.js';
import { createGame } from '../../src/repo/games.js';
import { joinGame } from '../../src/repo/players.js';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name : 'Player';

  // Placeholder state — real players (with positions etc.) are set when
  // the host presses Start via createInitialState() in api/games/start.js.
  const placeholderState = createInitialState([{ id: req.userId, name }]);
  const row = await createGame(req.userId, placeholderState);
  await joinGame(row.id, req.userId, name);

  res.status(201).json({ gameId: row.id, code: row.code });
});
