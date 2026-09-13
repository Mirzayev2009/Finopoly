import { SPACE_OPTIONS } from '@estate/content';
import { supabase } from '../supabase.js';
import { assembleRoomPayload, assembleStandingsPayload } from './assemblePayload.js';
import { sendBroadcast, roomTopic, hostTopic, GLOBAL_TOPIC } from './broadcast.js';

const VERSION_CONFLICT_CODE = '40001';

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
 * Same retry-once shape as callRoomAction, for set_pending_investment_cards
 * — the follow-up call ROLL's Node-side handler makes to write in that
 * space's fixed investment options once it lands on an ordinary asset
 * space (Node can't know which space was landed on until ROLL() commits,
 * so unlike newsCard this can't be pre-picked and passed in up front).
 * @param {string} roomId
 * @param {Array<object>} cards
 */
export async function callSetPendingInvestmentCards(roomId, cards) {
  const attempt = async () => {
    const { data: room, error: loadError } = await supabase
      .from('rooms')
      .select('version')
      .eq('id', roomId)
      .single();
    if (loadError) throw loadError;

    const { data, error } = await supabase.rpc('set_pending_investment_cards', {
      p_room_id: roomId,
      p_expected_version: room.version,
      p_investment_cards: cards,
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
 * Looks up the fixed 3 investment options for whichever space a just-landed
 * ROLL resolved to, and writes them into that room's pending 'awaiting_pick'
 * turn. Safe no-op if there's no such pending turn (the roll landed
 * somewhere else) or it's already filled (a retried/duplicate call).
 * @param {string} roomId
 */
export async function fillPendingInvestmentCards(roomId) {
  const { data: pending, error } = await supabase
    .from('pending_turns')
    .select('stage, to_position, drawn_cards')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!pending || pending.stage !== 'awaiting_pick' || pending.drawn_cards != null) return;

  const cards = SPACE_OPTIONS[pending.to_position];
  if (!cards) throw new Error(`ROLL landed on space ${pending.to_position}, which has no SPACE_OPTIONS entry`);

  await callSetPendingInvestmentCards(roomId, cards);
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
