import { ERAS } from '@estate/content';
import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { broadcastRoomUpdate } from '../../src/rooms/dispatch.js';

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * GLOBAL action: re-decks every room at once. advance_era() (schema.sql)
 * only advances game_state/rooms bookkeeping — era content (the 72
 * investment cards) lives in packages/content/eras.js, not SQL, so this
 * handler is what actually shuffles and writes each room's fresh deck via
 * set_room_deck(), then rebroadcasts every room + the global leaderboard.
 */
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { data: result, error } = await supabase.rpc('advance_era', { p_actor_id: req.userId });
  if (error) throw error;

  const { data: rooms, error: roomsError } = await supabase.from('rooms').select('id');
  if (roomsError) throw roomsError;

  if (result?.status === 'active' && result?.era_id) {
    const era = ERAS.find((e) => e.id === result.era_id);
    if (!era) throw new Error(`advance_era() returned an unknown era id: ${result.era_id}`);

    await Promise.all((rooms ?? []).map(async (room) => {
      const { error: deckError } = await supabase.rpc('set_room_deck', {
        p_room_id: room.id,
        p_era_id: era.id,
        p_cards: shuffle(era.investments),
      });
      if (deckError) throw deckError;
    }));
  }

  // Broadcast even when result.status === 'finished' (the hard end, no next
  // era to deal) — every connected board/host/team/leaderboard screen must
  // still learn the game ended, not just the ones that happen to make an
  // unrelated request afterward.
  await Promise.all((rooms ?? []).map(({ id }) => broadcastRoomUpdate(id)));

  res.status(200).json(result);
});
