import { NEWS_CARDS } from '@estate/content';
import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import {
  loadRoomBySlug, callRoomAction, broadcastRoomUpdate, fillPendingInvestmentCards,
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

  // A ROLL that lands on an ordinary asset space creates a pending_turns row
  // with drawn_cards left null -- Node can't know which space was landed on
  // until the call above commits, so unlike the news-card pre-pick this has
  // to be a follow-up. If this throws, still fall through to the broadcast
  // below so every client sees the true DB state (a pending turn genuinely
  // waiting on its cards, recoverable via the host's existing
  // CANCEL_PENDING_TURN) rather than nothing at all, then rethrow so the
  // failure is still visible to whoever made this request.
  if (actionType === 'ROLL') {
    try {
      await fillPendingInvestmentCards(room.id);
    } catch (fillError) {
      await broadcastRoomUpdate(room.id);
      throw fillError;
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
