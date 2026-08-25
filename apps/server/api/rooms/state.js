import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { loadRoomBySlug, loadRoomSnapshot } from '../../src/rooms/dispatch.js';
import { assembleRoomPayload } from '../../src/rooms/assemblePayload.js';

/**
 * GET /api/rooms/state?slug=room-a
 * Initial-snapshot endpoint for page load/reconnect, before any broadcast
 * has happened yet. Audience is derived server-side from the caller's own
 * role -- never trusted from a query param. Any authenticated user gets at
 * least the 'room' audience (no game-breaking secrets in it, and a team
 * member needs to see the room before they've joined a syndicate); only
 * host/admin ever get 'host' (full card percentages, join codes).
 */
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const slug = req.query?.slug;
  if (!slug) {
    res.status(400).json({ error: 'MISSING_SLUG' });
    return;
  }

  const room = await loadRoomBySlug(slug);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', req.userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const isStaff = ['host', 'admin'].includes(profile?.app_role);
  const { syndicates, pendingTurn, transactions, gameState } = await loadRoomSnapshot(room.id);
  const audience = isStaff ? 'host' : 'room';
  res.status(200).json(assembleRoomPayload(room, syndicates, pendingTurn, transactions, audience, gameState));
});
