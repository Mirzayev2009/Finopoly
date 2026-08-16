import { withAuth } from '../../src/auth.js';
import { setReady } from '../../src/repo/players.js';

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { gameId, ready } = req.body || {};

  try {
    await setReady(gameId, req.userId, Boolean(ready));
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
