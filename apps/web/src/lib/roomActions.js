const SERVER_URL = import.meta.env.VITE_SERVER_URL;

/**
 * Calls a room-scoped SERVER ACTION. The response is used only for
 * immediate error feedback — the real state update always arrives via the
 * room/host Realtime channel, never from this call's return value directly
 * (optimistic updates are banned; the caller should disable its control and
 * wait for the broadcast).
 * @param {string} roomSlug
 * @param {string} accessToken
 * @param {string} actionType
 * @param {object} [payload]
 */
export async function callRoomAction(roomSlug, accessToken, actionType, payload = {}) {
  const res = await fetch(`${SERVER_URL}/api/rooms/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ roomSlug, actionType, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Action ${actionType} failed`);
  }
  return data;
}

/**
 * GET which syndicate (if any) the caller is bound to, in which room, and
 * whether they're the acting device — global, no slug needed. /join uses
 * this to redirect an already-bound device to /team; /team uses it to know
 * which room it's in (the route carries no slug).
 */
export async function fetchMyBinding(accessToken) {
  const res = await fetch(`${SERVER_URL}/api/rooms/my-syndicate`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load your syndicate');
  return data;
}

/** GET which room a syndicate's join code belongs to. */
export async function resolveJoinCode(code, accessToken) {
  const res = await fetch(`${SERVER_URL}/api/rooms/resolve-join-code?code=${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Invalid join code');
  return data.roomSlug;
}

/** GET /select's room picker list. */
export async function fetchRoomList(accessToken) {
  const res = await fetch(`${SERVER_URL}/api/rooms/list`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load rooms');
  return data.rooms ?? [];
}

/**
 * Initial-snapshot fetch for page load/reconnect, before any broadcast has
 * arrived yet. Audience is derived server-side from the caller's own role.
 * @param {string} roomSlug
 * @param {string} accessToken
 */
export async function fetchRoomSnapshot(roomSlug, accessToken) {
  const res = await fetch(`${SERVER_URL}/api/rooms/state?slug=${encodeURIComponent(roomSlug)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load room state');
  }
  return data;
}

/** GET the initial cross-room standings snapshot for /leaderboard. */
export async function fetchStandings(accessToken) {
  const res = await fetch(`${SERVER_URL}/api/game/standings`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to load standings');
  return data;
}

/** GLOBAL action, host/admin only. */
export async function callAdvanceEra(accessToken) {
  const res = await fetch(`${SERVER_URL}/api/game/advance-era`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to advance era');
  return data;
}

/** Admin only. */
export async function callResetGame(accessToken) {
  const res = await fetch(`${SERVER_URL}/api/game/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to reset game');
  return data;
}

/** Admin only, before start. */
export async function callSetEraSequence(accessToken, eraIds) {
  const res = await fetch(`${SERVER_URL}/api/game/set-era-sequence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ eraIds }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to set era sequence');
  return data;
}

/** Admin only, before start. */
export async function callSetStartingCash(accessToken, amount) {
  const res = await fetch(`${SERVER_URL}/api/game/set-starting-cash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ amount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to set starting cash');
  return data;
}
