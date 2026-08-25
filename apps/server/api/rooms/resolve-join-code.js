import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

/**
 * GET /api/rooms/resolve-join-code?code=ABC123
 * /join only asks for a code, not a room — this resolves which room a
 * syndicate's join code belongs to so the client can call JOIN_SYNDICATE
 * (a room-scoped action) without a room picker step. Read-only, no mutation.
 */
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const code = (req.query?.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'MISSING_CODE' });
    return;
  }

  const { data: syndicate, error } = await supabase
    .from('syndicates')
    .select('room_id, rooms(slug)')
    .eq('join_code', code)
    .maybeSingle();
  if (error) throw error;

  if (!syndicate) {
    res.status(404).json({ error: 'INVALID_CODE' });
    return;
  }

  res.status(200).json({ roomSlug: syndicate.rooms?.slug ?? null });
});
