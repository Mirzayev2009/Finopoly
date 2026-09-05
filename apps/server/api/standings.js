import { withAuth } from '../src/auth.js';
import { supabase } from '../src/supabase.js';
import { assembleStandingsPayload } from '../src/rooms/assemblePayload.js';

// Cross-room leaderboard snapshot for /leaderboard's initial load (deltas
// after that arrive over the 'global' Realtime channel -- see
// dispatch.js's broadcastRoomUpdate). Each room now carries its own eraId
// since every room can be on a different era.
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, slug, era_sequence, current_era_index');
  if (roomsError) throw roomsError;

  const results = await Promise.all((rooms ?? []).map(async (room) => {
    const { data: syndicates, error: synError } = await supabase
      .from('syndicates')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_order');
    if (synError) throw synError;
    const eraId = room.era_sequence?.[room.current_era_index] ?? null;
    return assembleStandingsPayload(room.slug, syndicates ?? [], eraId);
  }));

  res.status(200).json({ rooms: results });
});
