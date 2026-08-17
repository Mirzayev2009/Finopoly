const SERVER_URL = import.meta.env.VITE_SERVER_URL;

/**
 * Submits a game action intent to the server. The client never computes
 * game logic or generates dice — this only ever sends { type, payload }.
 * The resulting state arrives back via the Realtime subscription, not this
 * response; callers use the response only for immediate error feedback.
 * @param {string} gameId
 * @param {string} accessToken
 * @param {{ type: string, payload: object }} action
 */
export async function submitAction(gameId, accessToken, action) {
  const res = await fetch(`${SERVER_URL}/api/games/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      gameId,
      action: { type: action.type, payload: action.payload ?? {}, at: Date.now() },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'REQUEST_FAILED');
  return data;
}
