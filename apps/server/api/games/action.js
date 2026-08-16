import { applyAction } from '@estate/engine';
import { withAuth } from '../../src/auth.js';
import { loadGame, saveGame, VersionConflictError } from '../../src/repo/games.js';
import { appendEvent } from '../../src/repo/events.js';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { gameId, action } = req.body || {};

  try {
    const result = await submitAction(gameId, req.userId, action);
    // apps/web receives the broadcast via its Realtime subscription on the
    // games table (this write triggers it); the response here is just for
    // the submitter's own immediate feedback / error handling.
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Server flow for every submitted action: verify JWT (done by withAuth) ->
 * load game -> assert it's this player's turn -> applyAction -> save with
 * a version guard (reload + retry once on conflict, then error) -> append
 * event -> return the new state.
 *
 * Dice, when ROLL_DICE is implemented, are rolled here (server-side,
 * e.g. `[1 + Math.floor(Math.random() * 6), ...]`) and attached to
 * action.payload.dice before calling applyAction — never trusted from the
 * client.
 */
async function submitAction(gameId, userId, action, isRetry = false) {
  const row = await loadGame(gameId);
  if (!row) throw new Error('GAME_NOT_FOUND');

  if (row.state.turn.currentPlayerId !== userId) {
    throw new Error('NOT_YOUR_TURN');
  }

  const { state: nextState, events, error } = applyAction(row.state, userId, action);
  if (error) throw new Error(error);

  try {
    const saved = await saveGame(gameId, nextState, row.version);
    await appendEvent(gameId, saved.version, userId, action);
    return { state: saved.state, version: saved.version, events };
  } catch (err) {
    if (err instanceof VersionConflictError && !isRetry) {
      return submitAction(gameId, userId, action, true);
    }
    throw err;
  }
}
