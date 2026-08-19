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

function rollDice() {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

/**
 * Server flow for every submitted action: verify JWT (done by withAuth) ->
 * load game -> applyAction (which itself enforces role/team/phase
 * authorization — there's no single "whose turn" concept anymore, multiple
 * roles act independently) -> save with a version guard (reload + retry
 * once on conflict, then error) -> append event -> return the new state.
 */
async function submitAction(gameId, userId, action, isRetry = false) {
  const row = await loadGame(gameId);
  if (!row) throw new Error('GAME_NOT_FOUND');

  // Dice are rolled here, server-side, on every attempt (including
  // retries) — any payload.dice sent by the client is discarded and
  // overwritten. The client never generates or influences the roll.
  const preparedAction =
    action && action.type === 'ROLL'
      ? { ...action, payload: { ...action.payload, dice: rollDice() } }
      : action;

  const { state: nextState, events, error } = applyAction(row.state, userId, preparedAction);
  if (error) throw new Error(error);

  try {
    const saved = await saveGame(gameId, nextState, row.version);
    await appendEvent(gameId, saved.version, userId, preparedAction);
    return { state: saved.state, version: saved.version, events };
  } catch (err) {
    if (err instanceof VersionConflictError && !isRetry) {
      return submitAction(gameId, userId, action, true);
    }
    throw err;
  }
}
