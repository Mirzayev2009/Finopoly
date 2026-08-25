import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

/**
 * GET /api/rooms/my-syndicate
 * Global (no room slug needed) "am I already bound to a syndicate anywhere,
 * and if so which room, and who's the current acting device" lookup. /join
 * uses this to redirect an already-bound device straight to /team; /team
 * uses it to know which room it's operating in (the route carries no slug).
 * Read-only plumbing, not a game rule — no mutation, no new action type.
 */
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data: memberships, error: memberError } = await supabase
    .from('syndicate_members')
    .select('syndicate_id, is_actor, joined_at')
    .eq('user_id', req.userId)
    .order('joined_at', { ascending: false });
  if (memberError) throw memberError;

  if (!memberships?.length) {
    res.status(200).json({ roomSlug: null, syndicateId: null, isActor: false, actorName: null });
    return;
  }

  const mine = memberships[0];
  const { data: syndicate, error: synError } = await supabase
    .from('syndicates')
    .select('id, name, color, room_id, rooms(slug)')
    .eq('id', mine.syndicate_id)
    .maybeSingle();
  if (synError) throw synError;
  if (!syndicate) {
    res.status(200).json({ roomSlug: null, syndicateId: null, isActor: false, actorName: null });
    return;
  }

  let actorName = null;
  if (!mine.is_actor) {
    const { data: actorMember, error: actorError } = await supabase
      .from('syndicate_members')
      .select('user_id, profiles(display_name, email)')
      .eq('syndicate_id', mine.syndicate_id)
      .eq('is_actor', true)
      .maybeSingle();
    if (actorError) throw actorError;
    actorName = actorMember?.profiles?.display_name || actorMember?.profiles?.email?.split('@')[0] || null;
  }

  res.status(200).json({
    roomSlug: syndicate.rooms?.slug ?? null,
    syndicateId: syndicate.id,
    syndicateName: syndicate.name,
    syndicateColor: syndicate.color,
    isActor: Boolean(mine.is_actor),
    actorName,
  });
});
