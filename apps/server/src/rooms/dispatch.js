import { ERAS } from '@estate/content';
import { supabase } from '../supabase.js';
import { assembleRoomPayload, assembleStandingsPayload } from './assemblePayload.js';
import { sendBroadcast, roomTopic, hostTopic, GLOBAL_TOPIC } from './broadcast.js';

const VERSION_CONFLICT_CODE = '40001';

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Deals a freshly shuffled deck for ONE room's current era -- the Node-side
 * half of ADVANCE_ERA (schema.sql's branch only moves era/status/syndicate
 * bookkeeping; nothing in SQL knows about era content, per room_decks'
 * own comment). Called right after an ADVANCE_ERA action lands, for that
 * room only -- this used to deal the same deck to every room at once.
 * @param {string} roomId
 * @param {string} eraId
 */
export async function dealRoomDeck(roomId, eraId) {
  const era = ERAS.find((e) => e.id === eraId);
  if (!era) throw new Error(`ADVANCE_ERA landed on an unknown era id: ${eraId}`);
  const { error } = await supabase.rpc('set_room_deck', {
    p_room_id: roomId,
    p_era_id: era.id,
    p_cards: shuffle(era.investments),
  });
  if (error) throw error;
}

function isVersionConflict(error) {
  return error?.code === VERSION_CONFLICT_CODE || error?.message?.includes('VERSION_CONFLICT');
}

/**
 * @param {string} slug
 * @returns {Promise<object>} the room row
 * @throws if no room has that slug
 */
export async function loadRoomBySlug(slug) {
  const { data, error } = await supabase.from('rooms').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('ROOM_NOT_FOUND');
  return data;
}

/**
 * Calls apply_room_action(), retrying once on a version conflict (mirrors
 * src/repo/games.js's VersionConflictError + retry-once pattern). Reloads
 * the room's current version itself on conflict rather than trusting a
 * stale caller-supplied one.
 * @param {string} roomId
 * @param {string} actorId
 * @param {string} actionType
 * @param {object} payload
 * @returns {Promise<{ roomId: string }>}
 */
export async function callRoomAction(roomId, actorId, actionType, payload) {
  const attempt = async () => {
    const { data: room, error: loadError } = await supabase
      .from('rooms')
      .select('version')
      .eq('id', roomId)
      .single();
    if (loadError) throw loadError;

    const { data, error } = await supabase.rpc('apply_room_action', {
      p_room_id: roomId,
      p_actor_id: actorId,
      p_expected_version: room.version,
      p_action_type: actionType,
      p_payload: payload ?? {},
    });
    if (error) throw error;
    return data;
  };

  try {
    return await attempt();
  } catch (error) {
    if (!isVersionConflict(error)) throw error;
    return attempt(); // one retry, per the plan; a second conflict propagates as a real error
  }
}

/**
 * Same retry-once shape as callRoomAction, for set_pending_news_card — the
 * follow-up call ROLL's Node-side handler makes to write in the server-
 * picked news card once it lands on a market-news space.
 * @param {string} roomId
 * @param {object} newsCard
 */
export async function callSetPendingNewsCard(roomId, newsCard) {
  const attempt = async () => {
    const { data: room, error: loadError } = await supabase
      .from('rooms')
      .select('version')
      .eq('id', roomId)
      .single();
    if (loadError) throw loadError;

    const { data, error } = await supabase.rpc('set_pending_news_card', {
      p_room_id: roomId,
      p_expected_version: room.version,
      p_news_card: newsCard,
    });
    if (error) throw error;
    return data;
  };

  try {
    return await attempt();
  } catch (error) {
    if (!isVersionConflict(error)) throw error;
    return attempt();
  }
}

/**
 * Fetches everything assemblePayload() needs for one room, fresh, right
 * after a mutation committed.
 * @param {string} roomId
 */
export async function loadRoomSnapshot(roomId) {
  const [{ data: room, error: roomError }, { data: syndicates, error: synError },
    { data: pendingTurn, error: pendingError }, { data: transactions, error: txError }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).single(),
    supabase.from('syndicates').select('*').eq('room_id', roomId).order('turn_order'),
    supabase.from('pending_turns').select('*').eq('room_id', roomId).maybeSingle(),
    // Host Control now renders this as a real "Transaction History" section
    // (not just a small recent-activity strip), so it needs more than a
    // token-sized window of rows.
    supabase.from('transactions').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).limit(100),
  ]);

  if (roomError) throw roomError;
  if (synError) throw synError;
  if (pendingError) throw pendingError;
  if (txError) throw txError;

  return {
    room, syndicates: syndicates ?? [], pendingTurn: pendingTurn ?? null,
    transactions: transactions ?? [],
  };
}

/**
 * The standard post-mutation flow for a single room: load a fresh snapshot,
 * assemble host + room audience payloads (assembleRoomPayload is the only
 * place that calls stripCards), broadcast both to their own topics, and
 * broadcast a slim standings delta to 'global'. Returns both payloads so the
 * caller can pick which one to return to whoever made the request.
 * @param {string} roomId
 * @returns {Promise<{ hostPayload: object, roomPayload: object, slug: string }>}
 */
export async function broadcastRoomUpdate(roomId) {
  const { room, syndicates, pendingTurn, transactions } = await loadRoomSnapshot(roomId);

  const hostPayload = assembleRoomPayload(room, syndicates, pendingTurn, transactions, 'host');
  const roomPayload = assembleRoomPayload(room, syndicates, pendingTurn, transactions, 'room');
  const eraId = room.era_sequence?.[room.current_era_index] ?? null;
  const standingsPayload = assembleStandingsPayload(room.slug, syndicates, eraId);

  await Promise.all([
    sendBroadcast(hostTopic(room.slug), 'state', hostPayload),
    sendBroadcast(roomTopic(room.slug), 'state', roomPayload),
    sendBroadcast(GLOBAL_TOPIC, 'standings', standingsPayload),
  ]);

  return { hostPayload, roomPayload, slug: room.slug };
}
