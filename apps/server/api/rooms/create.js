import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';

// The host-facing "new game" flow: pick era(s), team count, and team names
// in one shot. Unlike api/rooms/action.js, there's no existing room/version
// to lock yet, so this calls its own RPC (create_room, schema.sql) rather
// than apply_room_action(). Nobody is subscribed to a room that doesn't
// exist yet, so no broadcastRoomUpdate call is needed here.
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { name, eraSequence, startingCash, teamNames } = req.body ?? {};
  if (!name || !Array.isArray(eraSequence) || !Array.isArray(teamNames)) {
    res.status(400).json({ error: 'MISSING_FIELDS' });
    return;
  }

  const { data, error } = await supabase.rpc('create_room', {
    p_actor_id: req.userId,
    p_name: name,
    p_era_sequence: eraSequence,
    p_starting_cash: startingCash,
    p_team_names: teamNames,
  });
  if (error) throw error;

  res.status(200).json({ slug: data.slug });
});
