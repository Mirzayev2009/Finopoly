import { ERAS } from '@estate/content';
import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { broadcastRoomUpdate } from '../../src/rooms/dispatch.js';
import { assembleStandingsPayload } from '../../src/rooms/assemblePayload.js';

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function handleAdvanceEra(req, res) {
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

  await Promise.all((rooms ?? []).map(({ id }) => broadcastRoomUpdate(id)));
  res.status(200).json(result);
}

async function handleReset(req, res) {
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
}

async function handleSetEraSequence(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const eraIds = req.body?.eraIds;
  if (!Array.isArray(eraIds) || eraIds.length === 0) {
    res.status(400).json({ error: 'MISSING_ERA_IDS' });
    return;
  }

  const { data, error } = await supabase.rpc('set_era_sequence', {
    p_actor_id: req.userId,
    p_era_ids: eraIds,
  });
  if (error) throw error;

  res.status(200).json(data);
}

async function handleSetStartingCash(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const amount = req.body?.amount;
  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'INVALID_AMOUNT' });
    return;
  }

  const { data, error } = await supabase.rpc('set_starting_cash', {
    p_actor_id: req.userId,
    p_amount: amount,
  });
  if (error) throw error;

  res.status(200).json(data);
}

async function handleStandings(req, res) {
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
}

export default withAuth(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  const action = urlPath.split('/').pop();

  switch (action) {
    case 'advance-era':
      return handleAdvanceEra(req, res);
    case 'reset':
      return handleReset(req, res);
    case 'set-era-sequence':
      return handleSetEraSequence(req, res);
    case 'set-starting-cash':
      return handleSetStartingCash(req, res);
    case 'standings':
      return handleStandings(req, res);
    default:
      res.status(404).json({ error: 'NOT_FOUND' });
  }
});
