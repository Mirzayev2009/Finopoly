import { NEWS_CARDS } from '@estate/content';
import { withAuth } from '../../src/auth.js';
import { supabase } from '../../src/supabase.js';
import { loadRoomBySlug, callRoomAction, callSetPendingNewsCard, broadcastRoomUpdate } from '../../src/rooms/dispatch.js';

// Mirrors apply_room_action()'s own host/admin gate in schema.sql -- used
// here only to decide which audience payload to hand back to the caller,
// the SQL function is what actually enforces authorization.
const HOST_ONLY_ACTIONS = new Set([
  'REGISTER_SYNDICATE', 'REMOVE_SYNDICATE', 'ROLL', 'FORCE_SUBMIT', 'RESOLVE_NEWS',
  'RESOLVE_CORNER', 'SKIP_TURN', 'ADJUST', 'START_TIMER', 'ADJUST_TIMER', 'CLEAR_TIMER',
  'SET_PHASE',
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
  await callRoomAction(room.id, req.userId, actionType, payload);

  // ROLL landing on a market-news space leaves pending_turns.news_card null:
  // the news-card pool is content (packages/content/news.js), picked here in
  // Node, never duplicated into SQL. One small, still server-side, still
  // version-guarded follow-up call fills it in before anything broadcasts.
  if (actionType === 'ROLL') {
    const { data: pending, error: pendingError } = await supabase
      .from('pending_turns')
      .select('stage, news_card')
      .eq('room_id', room.id)
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (pending?.stage === 'news' && pending.news_card == null) {
      const card = NEWS_CARDS[Math.floor(Math.random() * NEWS_CARDS.length)];
      await callSetPendingNewsCard(room.id, card);
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
