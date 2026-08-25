import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { broadcastRoomUpdate } from '../../src/rooms/dispatch.js';

/** Admin only. Wipes every room back to lobby state and rebroadcasts all of them. */
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data: result, error } = await supabase.rpc('reset_game', { p_actor_id: req.userId });
  if (error) throw error;

  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id');
  if (roomsError) throw roomsError;

  await Promise.all((rooms ?? []).map(({ id }) => broadcastRoomUpdate(id)));

  res.status(200).json(result);
});
