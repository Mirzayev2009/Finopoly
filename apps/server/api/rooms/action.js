import { NEWS_CARDS } from '@estate/content';
import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import {
  loadRoomBySlug, callRoomAction, broadcastRoomUpdate, dealRoomDeck,
} from '../../src/rooms/dispatch.js';

// Mirrors apply_room_action()'s own host/admin gate in schema.sql -- used
// here only to decide which audience payload to hand back to the caller,
// the SQL function is what actually enforces authorization.
const HOST_ONLY_ACTIONS = new Set([
  'REGISTER_SYNDICATE', 'REMOVE_SYNDICATE', 'ROLL', 'FORCE_SUBMIT', 'RESOLVE_NEWS',
  'RESOLVE_CORNER', 'SKIP_TURN', 'CANCEL_PENDING_TURN', 'ADJUST', 'START_TIMER', 'ADJUST_TIMER',
  'CLEAR_TIMER', 'SET_PHASE', 'ADVANCE_ERA', 'SET_ERA_SEQUENCE', 'SET_STARTING_CASH', 'RESET_ROOM',
]);

export default withAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const { roomSlug, actionType, payload } = req.body ?? {};
  if (!roomSlug || !actionType) {
    res.status(400).json({ error: 'MISSING_FIELDS' });
    return;
  }

  const room = await loadRoomBySlug(roomSlug);

  // The news-card pool is content (packages/content/news.js), picked here in
  // Node rather than duplicated into SQL. Pre-picking it and passing it into
  // the same apply_room_action() call (rather than a separate follow-up RPC
  // after ROLL commits) keeps "land on a news space" + "assign its card"
  // atomic -- a card is either picked at insert time or the row never gets
  // created, so a room can no longer end up permanently stuck with
  // pending_turns.news_card null.
  const effectivePayload = actionType === 'ROLL'
    ? { ...payload, newsCard: NEWS_CARDS[Math.floor(Math.random() * NEWS_CARDS.length)] }
    : payload;
  await callRoomAction(room.id, req.userId, actionType, effectivePayload);

  // ADVANCE_ERA (schema.sql) only moves era/status/syndicate bookkeeping for
  // this one room -- nothing in SQL knows about era content (room_decks'
  // own comment). Deal this room's fresh deck here, same pattern as the
  // ROLL news-card fill-in above, before the state broadcasts below.
  if (actionType === 'ADVANCE_ERA') {
    const { data: freshRoom, error: freshRoomError } = await supabase
      .from('rooms')
      .select('status, era_sequence, current_era_index')
      .eq('id', room.id)
      .single();
    if (freshRoomError) throw freshRoomError;
    if (freshRoom.status === 'active') {
      const eraId = freshRoom.era_sequence?.[freshRoom.current_era_index];
      await dealRoomDeck(room.id, eraId);
    }
  }

  const { hostPayload, roomPayload } = await broadcastRoomUpdate(room.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', req.userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const isHostCaller = HOST_ONLY_ACTIONS.has(actionType) || ['host', 'admin'].includes(profile?.app_role);
  res.status(200).json(isHostCaller ? hostPayload : roomPayload);
});
