import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { assembleStandingsPayload } from '../../src/rooms/assemblePayload.js';

/**
 * GET /api/game/standings — initial snapshot for /leaderboard, before any
 * broadcast has arrived. Every room's standings at once (each broadcast
 * afterward only carries the one room that just changed).
 */
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id, slug');
  if (roomsError) throw roomsError;

  const { data: game, error: gameError } = await supabase.from('game_state').select('*').eq('id', 1).single();
  if (gameError) throw gameError;

  const results = await Promise.all((rooms ?? []).map(async (room) => {
    const { data: syndicates, error: synError } = await supabase
      .from('syndicates')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_order');
    if (synError) throw synError;
    return assembleStandingsPayload(room.slug, syndicates ?? []);
  }));

  res.status(200).json({
    eraId: game.era_sequence?.[game.current_era_index] ?? null,
    rooms: results,
  });
});
