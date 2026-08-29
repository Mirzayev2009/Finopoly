import { stripCards } from './stripCards.js';

function toSyndicateView(row, audience) {
  const base = {
    id: row.id,
    name: row.name,
    color: row.color,
    turnOrder: row.turn_order,
    position: row.position,
    cash: row.cash,
    eraStartingCash: row.era_starting_cash,
    notes: row.notes,
    flags: {
      hedgeFund: row.hedge_fund,
      insiderInfo: row.insider_info,
      blindFaith: row.blind_faith,
      bigShort: row.big_short,
      monopolyPower: row.monopoly_power,
      sabotaged: row.sabotaged,
      frozen: row.frozen,
      immune: row.immune,
    },
  };
  // Join codes are how a team's own device binds to a syndicate — only the
  // host needs to see them (to print/hand out), never broadcast to the room.
  if (audience === 'host') base.joinCode = row.join_code;
  return base;
}

/**
 * The ONE place stripCards() is called. Nothing else in the codebase may
 * read pending_turns.drawn_cards and hand it to a response or broadcast
 * without going through this function first.
 * @param {object} room
 * @param {Array<object>} syndicates
 * @param {object|null} pendingTurn
 * @param {Array<object>} transactions
 * @param {'host'|'room'|'team'} audience
 * @param {object} gameState the global game_state row (era_sequence, current_era_index, status)
 */
export function assembleRoomPayload(room, syndicates, pendingTurn, transactions, audience, gameState) {
  return {
    game: {
      status: gameState.status,
      eraId: gameState.era_sequence?.[gameState.current_era_index] ?? null,
      eraSequence: gameState.era_sequence,
      currentEraIndex: gameState.current_era_index,
      startingCash: gameState.starting_cash,
    },
    room: {
      slug: room.slug,
      name: room.name,
      phase: room.phase,
      eraStatus: room.era_status,
      turnIndex: room.turn_index,
      roundEnding: room.round_ending,
      timerDeadline: room.timer_deadline,
      version: room.version,
    },
    syndicates: syndicates.map((row) => toSyndicateView(row, audience)),
    pendingTurn: pendingTurn && {
      id: pendingTurn.id,
      syndicateId: pendingTurn.syndicate_id,
      stage: pendingTurn.stage,
      dice: pendingTurn.dice_1 != null ? [pendingTurn.dice_1, pendingTurn.dice_2] : null,
      fromPosition: pendingTurn.from_position,
      toPosition: pendingTurn.to_position,
      wrapped: pendingTurn.wrapped,
      drawnCards: pendingTurn.drawn_cards ? stripCards(pendingTurn.drawn_cards, audience) : null,
      newsCard: pendingTurn.news_card, // no percentage on news cards — safe for every audience
      cornerEvent: pendingTurn.corner_event,
      decisionDeadline: pendingTurn.decision_deadline,
    },
    transactions: transactions.map((t) => ({
      id: t.id,
      syndicateId: t.syndicate_id,
      actionType: t.action_type,
      amount: t.amount,
      note: t.note,
      createdAt: t.created_at,
    })),
  };
}

/**
 * Slim cross-room leaderboard delta for the 'global' channel — cash and the
 * era-over-era delta only, no card/board detail at all.
 * @param {string} roomSlug
 * @param {Array<object>} syndicates
 */
export function assembleStandingsPayload(roomSlug, syndicates) {
  return {
    roomSlug,
    standings: syndicates.map((row) => ({
      syndicateId: row.id,
      name: row.name,
      color: row.color,
      cash: row.cash,
      eraStartingCash: row.era_starting_cash,
    })),
  };
}
