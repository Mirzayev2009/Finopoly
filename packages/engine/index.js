import { BOARD, CARDS, ROUNDS, SECTORS } from '@estate/content';
import { ACTION_TYPES, isValidActionShape } from './actions.js';
import { ROLES, resolveActor, teamHasNoAnalyst } from './roles.js';
import { createInitialState, getTeam, LOG_LIMIT, PHASES, totalPortfolioValue } from './state.js';
import { drawCard } from './deck.js';
import { applyReturns, validateAllocationSum } from './resolution.js';

export { ACTION_TYPES } from './actions.js';
export { ROLES } from './roles.js';
export { PHASES, createInitialState, getTeam, totalPortfolioValue } from './state.js';

const SECTOR_IDS = new Set(SECTORS.map((s) => s.id));

const NEXT_PHASE = {
  LOBBY: 'BRIEFING',
  BRIEFING: 'RESEARCH',
  RESEARCH: 'ALLOCATION',
  ALLOCATION: 'MARKET_EVENTS',
  MARKET_EVENTS: 'RESOLUTION',
};

function buildHoldingsFromAlloc(alloc) {
  for (const key of Object.keys(alloc)) {
    if (!SECTOR_IDS.has(key)) return null;
  }
  const holdings = {};
  for (const sector of SECTORS) {
    holdings[sector.id] = alloc[sector.id] ?? 0;
  }
  return holdings;
}

function pickLargestSector(holdings) {
  let best = null;
  for (const sector of SECTORS) {
    if (best === null || holdings[sector.id] > holdings[best]) best = sector.id;
  }
  return best;
}

function applyCardEffect(team, card, payload) {
  const { effect } = card;
  switch (effect.kind) {
    case 'REVEAL_SECTOR': {
      const sectorId = effect.sectorId ?? payload.choice;
      if (!sectorId || !SECTOR_IDS.has(sectorId)) return 'CHOICE_REQUIRED';
      if (!team.revealedSectors.includes(sectorId)) team.revealedSectors.push(sectorId);
      return null;
    }
    case 'LOSE_PCT_OF_POSITION': {
      const sectorId = pickLargestSector(team.holdings);
      team.holdings[sectorId] = Math.max(0, team.holdings[sectorId] * (1 - effect.pct));
      return null;
    }
    case 'GAIN_FLAT': {
      team.holdings.cash += effect.amount;
      return null;
    }
    case 'FORCE_TO_CASH_PCT': {
      let moved = 0;
      for (const sector of SECTORS) {
        if (sector.id === 'cash') continue;
        const amount = team.holdings[sector.id] * effect.pct;
        team.holdings[sector.id] -= amount;
        moved += amount;
      }
      team.holdings.cash += moved;
      return null;
    }
    case 'DOUBLE_ONE_SECTOR': {
      const sectorId = payload.choice;
      if (!sectorId || !SECTOR_IDS.has(sectorId)) return 'CHOICE_REQUIRED';
      team.holdings[sectorId] *= 2;
      return null;
    }
    case 'HALVE_ONE_SECTOR': {
      const sectorId = payload.choice;
      if (!sectorId || !SECTOR_IDS.has(sectorId)) return 'CHOICE_REQUIRED';
      team.holdings[sectorId] *= 0.5;
      return null;
    }
    case 'SKIP':
      return null;
    default:
      return 'UNKNOWN_EFFECT';
  }
}

const HANDLERS = {
  HOST_ADVANCE_PHASE(draft, actor) {
    if (actor.member.role !== ROLES.HOST) return { events: [], error: 'WRONG_ROLE' };
    const next = NEXT_PHASE[draft.phase];
    if (!next) return { events: [], error: 'ILLEGAL_TRANSITION' };

    const from = draft.phase;
    if (from === 'LOBBY') {
      draft.round = 1;
    }
    if (from === 'RESEARCH') {
      // Fresh submission tracking for this round's ALLOCATION phase — without
      // this, a team that missed one round's deadline would look permanently
      // "submitted" in every later round even if they never touched it again.
      for (const team of draft.teams) {
        team.allocationSubmitted = false;
      }
    }
    if (from === 'ALLOCATION') {
      for (const team of draft.teams) {
        if (!team.allocationSubmitted) team.allocationSubmitted = true;
      }
      draft.eventQueue = draft.teams.map((t) => t.id);
    }
    draft.phase = next;
    return { events: [{ type: 'PHASE_ADVANCED', from, to: next }], error: null };
  },

  HOST_SET_DEADLINE(draft, actor, action) {
    if (actor.member.role !== ROLES.HOST) return { events: [], error: 'WRONG_ROLE' };
    if (typeof action.payload.epochMs !== 'number') return { events: [], error: 'INVALID_PAYLOAD' };
    draft.deadline = action.payload.epochMs;
    return { events: [{ type: 'DEADLINE_SET', epochMs: draft.deadline }], error: null };
  },

  UPDATE_NOTES(draft, actor, action) {
    if (draft.phase !== 'RESEARCH') return { events: [], error: 'WRONG_PHASE' };
    if (!actor.team) return { events: [], error: 'NOT_ON_TEAM' };
    const allowed = actor.member.role === ROLES.ANALYST || teamHasNoAnalyst(draft, actor.team.id);
    if (!allowed) return { events: [], error: 'WRONG_ROLE' };
    if (typeof action.payload.text !== 'string') return { events: [], error: 'INVALID_PAYLOAD' };
    const team = getTeam(draft, actor.team.id);
    team.notes = action.payload.text;
    return { events: [{ type: 'NOTES_UPDATED', teamId: team.id }], error: null };
  },

  SET_ALLOCATION(draft, actor, action) {
    if (actor.member.role !== ROLES.STRATEGIST) return { events: [], error: 'WRONG_ROLE' };
    if (draft.phase !== 'ALLOCATION') return { events: [], error: 'WRONG_PHASE' };
    if (!actor.team) return { events: [], error: 'NOT_ON_TEAM' };
    const team = getTeam(draft, actor.team.id);
    const alloc = action.payload.alloc;
    if (!alloc || typeof alloc !== 'object') return { events: [], error: 'INVALID_PAYLOAD' };
    if (!validateAllocationSum(alloc, team)) return { events: [], error: 'ALLOCATION_MISMATCH' };
    const holdings = buildHoldingsFromAlloc(alloc);
    if (!holdings) return { events: [], error: 'UNKNOWN_SECTOR' };
    team.holdings = holdings;
    return { events: [{ type: 'ALLOCATION_SET', teamId: team.id }], error: null };
  },

  SUBMIT_ALLOCATION(draft, actor) {
    if (actor.member.role !== ROLES.STRATEGIST) return { events: [], error: 'WRONG_ROLE' };
    if (draft.phase !== 'ALLOCATION') return { events: [], error: 'WRONG_PHASE' };
    if (!actor.team) return { events: [], error: 'NOT_ON_TEAM' };
    const team = getTeam(draft, actor.team.id);
    team.allocationSubmitted = true;
    return { events: [{ type: 'ALLOCATION_SUBMITTED', teamId: team.id }], error: null };
  },

  ROLL(draft, actor, action) {
    if (actor.member.role !== ROLES.RISK_MANAGER) return { events: [], error: 'WRONG_ROLE' };
    if (draft.phase !== 'MARKET_EVENTS') return { events: [], error: 'WRONG_PHASE' };
    if (!actor.team) return { events: [], error: 'NOT_ON_TEAM' };
    const team = getTeam(draft, actor.team.id);
    if (draft.eventQueue[0] !== team.id) return { events: [], error: 'NOT_TEAM_TURN' };
    if (team.pendingCard !== null) return { events: [], error: 'PENDING_CARD_UNRESOLVED' };

    const dice = action.payload.dice;
    if (!Array.isArray(dice) || dice.length !== 2 || dice.some((d) => typeof d !== 'number')) {
      return { events: [], error: 'INVALID_PAYLOAD' };
    }

    const [d1, d2] = dice;
    team.position = (team.position + d1 + d2) % BOARD.length;
    const space = BOARD[team.position];
    const events = [{ type: 'ROLLED', teamId: team.id, dice, spaceId: space.id }];

    if (space.type === 'card') {
      const cardIndex = drawCard(draft.decks);
      const card = CARDS[cardIndex];
      team.pendingCard = { cardId: card.id, drawnAt: action.at };
      events.push({ type: 'CARD_DRAWN', teamId: team.id, cardId: card.id });
    } else {
      draft.eventQueue.shift();
      events.push({ type: 'LANDED', teamId: team.id, spaceId: space.id, spaceType: space.type });
    }

    return { events, error: null };
  },

  RESOLVE_CARD(draft, actor, action) {
    if (actor.member.role !== ROLES.RISK_MANAGER) return { events: [], error: 'WRONG_ROLE' };
    if (!actor.team) return { events: [], error: 'NOT_ON_TEAM' };
    const team = getTeam(draft, actor.team.id);
    if (team.pendingCard === null) return { events: [], error: 'NO_PENDING_CARD' };

    const card = CARDS.find((c) => c.id === team.pendingCard.cardId);
    const effectError = applyCardEffect(team, card, action.payload);
    if (effectError) return { events: [], error: effectError };

    team.pendingCard = null;
    draft.eventQueue.shift();
    return { events: [{ type: 'CARD_RESOLVED', teamId: team.id, cardId: card.id }], error: null };
  },

  RESOLVE_ROUND(draft, actor) {
    if (actor.member.role !== ROLES.HOST) return { events: [], error: 'WRONG_ROLE' };
    if (draft.phase !== 'RESOLUTION') return { events: [], error: 'WRONG_PHASE' };

    const round = ROUNDS.find((r) => r.id === draft.round);
    if (!round) return { events: [], error: 'ROUND_NOT_FOUND' };

    const events = [];
    for (const team of draft.teams) {
      const startValue = totalPortfolioValue(team);
      team.holdings = applyReturns(team.holdings, round.returns);
      const endValue = totalPortfolioValue(team);
      team.history.push({ round: draft.round, startValue, endValue, delta: endValue - startValue });
      events.push({ type: 'ROUND_RESOLVED', teamId: team.id, round: draft.round, startValue, endValue });
    }

    if (draft.round === 4) {
      draft.phase = 'GAME_OVER';
    } else {
      draft.round += 1;
      draft.phase = 'BRIEFING';
    }

    return { events, error: null };
  },
};

/**
 * @param {object} state
 * @param {string} actorUserId
 * @param {{type: string, payload: object, at: number}} action
 * @returns {{ state: object, events: object[], error: string|null }}
 */
export function applyAction(state, actorUserId, action) {
  if (!isValidActionShape(action)) {
    return { state, events: [], error: 'INVALID_ACTION' };
  }
  if (!resolveActor(state, actorUserId)) {
    return { state, events: [], error: 'UNKNOWN_ACTOR' };
  }
  if (state.phase === 'GAME_OVER') {
    return { state, events: [], error: 'GAME_OVER' };
  }
  const handler = HANDLERS[action.type];
  if (!handler) {
    return { state, events: [], error: 'NOT_IMPLEMENTED' };
  }

  const draft = structuredClone(state);
  const actor = resolveActor(draft, actorUserId);

  let result;
  try {
    result = handler(draft, actor, action);
  } catch (err) {
    return { state, events: [], error: err.message || 'INTERNAL_ERROR' };
  }

  if (result.error) {
    return { state, events: [], error: result.error };
  }

  const events = result.events.map((e) => ({ ...e, at: action.at }));
  draft.log = [...draft.log, ...events].slice(-LOG_LIMIT);

  return { state: draft, events, error: null };
}
