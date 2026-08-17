import {
  BANKRUPT,
  BUILD_HOUSE,
  BUY,
  DECLINE,
  END_TURN,
  MORTGAGE,
  PAY_JAIL_FINE,
  RESOLVE_DEBT,
  ROLL,
  SELL_HOUSE,
  UNMORTGAGE,
  USE_JAIL_CARD,
  isValidActionShape,
} from './actions.js';
import { LOG_LIMIT, createInitialState, getNextPlayerId, getPlayer } from './state.js';
import { CHANCE_CARDS, CHEST_CARDS, COLOR_GROUPS, JAIL_SPACE_ID, RAILROAD_IDS, SPACES, UTILITY_IDS } from './board-data.js';
import { calculateRent } from './rent.js';
import { canBuildHouse, canSellHouse } from './building.js';

export { createInitialState, getCurrentPlayer, getNextPlayerId, getPlayer, netWorth } from './state.js';
export * from './actions.js';

// ---------------------------------------------------------------------------
// Shared helpers. All operate on `draft`, a mutable clone owned entirely by
// the current applyAction() call — safe to mutate in place.
// ---------------------------------------------------------------------------

function appendLog(draft, event) {
  draft.log.push(event);
  if (draft.log.length > LOG_LIMIT) {
    draft.log.splice(0, draft.log.length - LOG_LIMIT);
  }
}

/**
 * Every involuntary charge (rent, tax, forced jail fine, card pay/repairs)
 * goes through here: pay immediately if cash covers it (crediting a player
 * creditor), otherwise leave cash untouched and open a single-slot debt.
 */
function chargeOrDebt(draft, playerId, amount, creditorId, reason) {
  const player = getPlayer(draft, playerId);
  if (player.cash >= amount) {
    player.cash -= amount;
    if (creditorId) {
      const creditor = getPlayer(draft, creditorId);
      if (creditor) creditor.cash += amount;
    }
    return { wentToDebt: false };
  }
  draft.debt = { debtorId: playerId, creditorId: creditorId ?? null, amount, reason };
  draft.phase = 'DEBT';
  return { wentToDebt: true };
}

/**
 * Decides ROLL (bonus turn) vs MANAGE once nothing is pending. Only called
 * when the caller knows AWAIT_BUY/DEBT are NOT in play — those always take
 * precedence and defer this decision until they're cleared.
 */
function settleTurnPhase(draft, playerId) {
  const player = getPlayer(draft, playerId);
  const dice = draft.turn.dice;
  const isDouble = Boolean(dice) && dice[0] === dice[1];
  if (isDouble && !player.inJail) {
    draft.phase = 'ROLL';
    draft.turn.hasRolled = false;
  } else {
    draft.phase = 'MANAGE';
  }
}

function sendToJail(draft, playerId) {
  const player = getPlayer(draft, playerId);
  player.position = JAIL_SPACE_ID;
  player.inJail = true;
  player.jailTurns = 0;
}

/** Moves a player by a relative number of steps (may be negative). */
function movePlayer(draft, playerId, steps, events) {
  const player = getPlayer(draft, playerId);
  const prev = player.position;
  let next = (prev + steps) % 40;
  if (next < 0) next += 40;
  const passedGo = steps > 0 && prev + steps >= 40;
  player.position = next;
  if (passedGo) {
    player.cash += 200;
    events.push({ type: 'PASSED_GO', playerId, amount: 200 });
  }
}

/** Moves a player to an absolute space id, crediting GO if wrapped past it. */
function advanceTo(draft, playerId, targetSpaceId, events) {
  const player = getPlayer(draft, playerId);
  const prev = player.position;
  const passedGo = targetSpaceId < prev;
  player.position = targetSpaceId;
  if (passedGo) {
    player.cash += 200;
    events.push({ type: 'PASSED_GO', playerId, amount: 200 });
  }
}

function nearestId(position, ids) {
  const sorted = [...ids].sort((a, b) => a - b);
  for (const id of sorted) {
    if (id > position) return id;
  }
  return sorted[0];
}

/**
 * Resolves whatever space the player is currently standing on. Returns
 * true if this opened a pending phase (AWAIT_BUY or DEBT) that requires a
 * player decision before the turn can continue.
 */
function resolveSpace(draft, playerId, diceSum, events) {
  const player = getPlayer(draft, playerId);
  const spaceData = SPACES[player.position];

  switch (spaceData.type) {
    case 'go':
    case 'parking':
    case 'jail':
      return false;

    case 'gotojail':
      sendToJail(draft, playerId);
      events.push({ type: 'SENT_TO_JAIL', playerId, reason: 'LANDED_ON_GOTOJAIL' });
      return false;

    case 'tax': {
      const { wentToDebt } = chargeOrDebt(draft, playerId, spaceData.price, null, 'TAX');
      events.push({ type: 'TAX_PAID', playerId, spaceId: spaceData.id, amount: spaceData.price, debt: wentToDebt });
      return wentToDebt;
    }

    case 'property':
    case 'railroad':
    case 'utility': {
      const entry = draft.ownership[spaceData.id];
      if (!entry) {
        draft.phase = 'AWAIT_BUY';
        events.push({ type: 'AWAIT_BUY', playerId, spaceId: spaceData.id });
        return true;
      }
      if (entry.owner === playerId || entry.mortgaged) return false;

      const owner = getPlayer(draft, entry.owner);
      if (owner.inJail) return false; // per spec: owner in jail collects no rent

      const rent = calculateRent(draft.ownership, spaceData.id, diceSum);
      const { wentToDebt } = chargeOrDebt(draft, playerId, rent, entry.owner, 'RENT');
      events.push({
        type: 'RENT_PAID',
        playerId,
        creditorId: entry.owner,
        spaceId: spaceData.id,
        amount: rent,
        debt: wentToDebt,
      });
      return wentToDebt;
    }

    case 'chance':
      return drawAndApplyCard(draft, playerId, 'chance', diceSum, events);
    case 'chest':
      return drawAndApplyCard(draft, playerId, 'chest', diceSum, events);

    default:
      return false;
  }
}

/**
 * Draws the top card of a deck, applies its effect, and returns it to the
 * bottom of the deck (except JAIL_FREE, held out until used — see the
 * player-shape note in board-data.js/state.js). Returns true if the effect
 * opened a pending phase (AWAIT_BUY/DEBT).
 */
function drawAndApplyCard(draft, playerId, deckName, diceSum, events) {
  const deck = draft.decks[deckName];
  const cardIndex = deck.shift();
  const cardList = deckName === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
  const cardData = cardList[cardIndex];
  const effect = cardData.effect;

  events.push({ type: 'CARD_DRAWN', playerId, deck: deckName, cardId: cardData.id });

  let pending = false;

  switch (effect.type) {
    case 'ADVANCE_TO': {
      advanceTo(draft, playerId, effect.spaceId, events);
      pending = resolveSpace(draft, playerId, diceSum, events);
      break;
    }

    case 'ADVANCE_TO_NEAREST_RAILROAD': {
      const targetId = nearestId(getPlayer(draft, playerId).position, RAILROAD_IDS);
      advanceTo(draft, playerId, targetId, events);
      pending = resolveSpace(draft, playerId, diceSum, events);
      break;
    }

    case 'ADVANCE_TO_NEAREST_UTILITY': {
      const targetId = nearestId(getPlayer(draft, playerId).position, UTILITY_IDS);
      advanceTo(draft, playerId, targetId, events);
      const entry = draft.ownership[targetId];
      if (!entry) {
        draft.phase = 'AWAIT_BUY';
        events.push({ type: 'AWAIT_BUY', playerId, spaceId: targetId });
        pending = true;
      } else if (entry.owner !== playerId && !entry.mortgaged) {
        const owner = getPlayer(draft, entry.owner);
        if (!owner.inJail) {
          // v0: utility reached via Chance always pays 10x the original
          // dice sum, per spec, regardless of how many utilities the
          // owner holds.
          const rent = diceSum * 10;
          const { wentToDebt } = chargeOrDebt(draft, playerId, rent, entry.owner, 'RENT');
          events.push({
            type: 'RENT_PAID',
            playerId,
            creditorId: entry.owner,
            spaceId: targetId,
            amount: rent,
            debt: wentToDebt,
            note: 'CHANCE_UTILITY_10X',
          });
          pending = wentToDebt;
        }
      }
      break;
    }

    case 'COLLECT':
      getPlayer(draft, playerId).cash += effect.amount;
      events.push({ type: 'CARD_COLLECT', playerId, amount: effect.amount });
      break;

    case 'PAY': {
      const { wentToDebt } = chargeOrDebt(draft, playerId, effect.amount, null, 'CARD_PAY');
      events.push({ type: 'CARD_PAY', playerId, amount: effect.amount, debt: wentToDebt });
      pending = wentToDebt;
      break;
    }

    case 'GOTO_JAIL':
      sendToJail(draft, playerId);
      events.push({ type: 'SENT_TO_JAIL', playerId, reason: 'CARD' });
      break;

    case 'JAIL_FREE':
      getPlayer(draft, playerId).jailCards += 1;
      events.push({ type: 'CARD_JAIL_FREE', playerId });
      // Held out of circulation until used — not returned to the deck now.
      return pending;

    case 'GO_BACK':
      movePlayer(draft, playerId, -effect.spaces, events);
      pending = resolveSpace(draft, playerId, diceSum, events);
      break;

    case 'REPAIRS': {
      const player = getPlayer(draft, playerId);
      let total = 0;
      for (const spaceId of player.properties) {
        const entry = draft.ownership[spaceId];
        if (!entry) continue;
        total += entry.houses === 5 ? effect.perHotel : entry.houses * effect.perHouse;
      }
      const { wentToDebt } = chargeOrDebt(draft, playerId, total, null, 'REPAIRS');
      events.push({ type: 'CARD_REPAIRS', playerId, amount: total, debt: wentToDebt });
      pending = wentToDebt;
      break;
    }

    case 'PAY_EACH_PLAYER': {
      const player = getPlayer(draft, playerId);
      for (const other of draft.players) {
        if (other.id === playerId || other.bankrupt) continue;
        // v0: clamped rather than routed through the single-slot debt
        // system, which can't represent owing several creditors at once.
        const amount = Math.min(effect.amount, player.cash);
        player.cash -= amount;
        other.cash += amount;
      }
      events.push({ type: 'CARD_PAY_EACH_PLAYER', playerId, amount: effect.amount });
      break;
    }

    case 'COLLECT_FROM_EACH_PLAYER': {
      const player = getPlayer(draft, playerId);
      for (const other of draft.players) {
        if (other.id === playerId || other.bankrupt) continue;
        const amount = Math.min(effect.amount, other.cash);
        other.cash -= amount;
        player.cash += amount;
      }
      events.push({ type: 'CARD_COLLECT_FROM_EACH_PLAYER', playerId, amount: effect.amount });
      break;
    }

    default:
      break;
  }

  deck.push(cardIndex);
  return pending;
}

// ---------------------------------------------------------------------------
// Action handlers. Each takes (draft, playerId, action) and returns either
// { events, error: null } on success (draft already mutated in place) or
// { events: [], error: 'CODE' } on failure (draft mutations, if any, are
// discarded by the caller).
// ---------------------------------------------------------------------------

function applyRoll(draft, playerId, action) {
  if (draft.phase !== 'ROLL') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };
  if (draft.turn.hasRolled) return { events: [], error: 'ALREADY_ROLLED' };

  const dice = action.payload?.dice;
  if (!Array.isArray(dice) || dice.length !== 2 || !dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) {
    return { events: [], error: 'INVALID_DICE' };
  }

  const [d1, d2] = dice;
  const sum = d1 + d2;
  const isDouble = d1 === d2;
  const player = getPlayer(draft, playerId);
  const events = [];

  draft.turn.dice = dice;
  draft.turn.hasRolled = true;

  if (player.inJail) {
    events.push({ type: 'DICE_ROLLED', playerId, dice, inJail: true });

    if (isDouble) {
      player.inJail = false;
      player.jailTurns = 0;
      movePlayer(draft, playerId, sum, events);
      const pending = resolveSpace(draft, playerId, sum, events);
      if (!pending) draft.phase = 'MANAGE'; // jail-escape doubles never grant a reroll
      return { events, error: null };
    }

    player.jailTurns += 1;
    if (player.jailTurns >= 3) {
      const { wentToDebt } = chargeOrDebt(draft, playerId, 50, null, 'JAIL_FINE');
      events.push({ type: 'JAIL_FINE_FORCED', playerId, amount: 50, debt: wentToDebt });
      if (wentToDebt) return { events, error: null }; // phase already DEBT, movement deferred

      player.inJail = false;
      player.jailTurns = 0;
      movePlayer(draft, playerId, sum, events);
      const pending = resolveSpace(draft, playerId, sum, events);
      if (!pending) draft.phase = 'MANAGE';
      return { events, error: null };
    }

    draft.phase = 'MANAGE';
    return { events, error: null };
  }

  if (isDouble) draft.turn.doublesCount += 1;
  events.push({ type: 'DICE_ROLLED', playerId, dice, isDouble });

  if (draft.turn.doublesCount === 3) {
    sendToJail(draft, playerId);
    draft.turn.doublesCount = 0;
    draft.phase = 'MANAGE';
    events.push({ type: 'SENT_TO_JAIL', playerId, reason: 'THREE_DOUBLES' });
    return { events, error: null };
  }

  movePlayer(draft, playerId, sum, events);
  const pending = resolveSpace(draft, playerId, sum, events);
  if (!pending) settleTurnPhase(draft, playerId);

  return { events, error: null };
}

function applyBuy(draft, playerId) {
  if (draft.phase !== 'AWAIT_BUY') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const player = getPlayer(draft, playerId);
  const spaceId = player.position;
  const spaceData = SPACES[spaceId];

  if (!['property', 'railroad', 'utility'].includes(spaceData.type)) {
    return { events: [], error: 'NOT_PURCHASABLE' };
  }
  if (draft.ownership[spaceId]) return { events: [], error: 'ALREADY_OWNED' };
  if (player.cash < spaceData.price) return { events: [], error: 'INSUFFICIENT_FUNDS' };

  player.cash -= spaceData.price;
  draft.ownership[spaceId] = { owner: playerId, houses: 0, mortgaged: false };
  player.properties.push(spaceId);

  const events = [{ type: 'PROPERTY_BOUGHT', playerId, spaceId, amount: spaceData.price }];
  settleTurnPhase(draft, playerId);
  return { events, error: null };
}

function applyDecline(draft, playerId) {
  if (draft.phase !== 'AWAIT_BUY') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const events = [{ type: 'PROPERTY_DECLINED', playerId, spaceId: getPlayer(draft, playerId).position }];
  settleTurnPhase(draft, playerId);
  return { events, error: null };
}

function applyBuildHouse(draft, playerId, action) {
  if (draft.phase !== 'MANAGE') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const spaceId = action.payload?.spaceId;
  if (typeof spaceId !== 'number') return { events: [], error: 'INVALID_SPACE' };

  const check = canBuildHouse(draft, spaceId, playerId);
  if (!check.ok) return { events: [], error: check.error };

  const spaceData = SPACES[spaceId];
  const entry = draft.ownership[spaceId];
  const player = getPlayer(draft, playerId);

  player.cash -= spaceData.houseCost;
  if (check.becomingHotel) {
    draft.bank.hotels -= 1;
    draft.bank.houses += 4;
    entry.houses = 5;
  } else {
    draft.bank.houses -= 1;
    entry.houses += 1;
  }

  return { events: [{ type: 'HOUSE_BUILT', playerId, spaceId, houses: entry.houses }], error: null };
}

function applySellHouse(draft, playerId, action) {
  if (draft.phase !== 'MANAGE' && draft.phase !== 'DEBT') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };
  if (draft.phase === 'DEBT' && draft.debt?.debtorId !== playerId) return { events: [], error: 'NOT_DEBTOR' };

  const spaceId = action.payload?.spaceId;
  if (typeof spaceId !== 'number') return { events: [], error: 'INVALID_SPACE' };

  const check = canSellHouse(draft, spaceId, playerId);
  if (!check.ok) return { events: [], error: check.error };

  const spaceData = SPACES[spaceId];
  const entry = draft.ownership[spaceId];
  const player = getPlayer(draft, playerId);

  const refund = spaceData.houseCost / 2;
  if (check.losingHotel) {
    draft.bank.hotels += 1;
    draft.bank.houses -= 4;
  } else {
    draft.bank.houses += 1;
  }
  entry.houses -= 1;
  player.cash += refund;

  return { events: [{ type: 'HOUSE_SOLD', playerId, spaceId, houses: entry.houses, amount: refund }], error: null };
}

function applyMortgage(draft, playerId, action) {
  if (draft.phase !== 'MANAGE' && draft.phase !== 'DEBT') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };
  if (draft.phase === 'DEBT' && draft.debt?.debtorId !== playerId) return { events: [], error: 'NOT_DEBTOR' };

  const spaceId = action.payload?.spaceId;
  if (typeof spaceId !== 'number') return { events: [], error: 'INVALID_SPACE' };

  const entry = draft.ownership[spaceId];
  if (!entry || entry.owner !== playerId) return { events: [], error: 'NOT_OWNER' };
  if (entry.mortgaged) return { events: [], error: 'ALREADY_MORTGAGED' };

  const spaceData = SPACES[spaceId];
  if (spaceData.type === 'property') {
    const groupIds = COLOR_GROUPS[spaceData.color] || [];
    const anyHouses = groupIds.some((id) => (draft.ownership[id]?.houses ?? 0) > 0);
    if (anyHouses) return { events: [], error: 'SET_HAS_HOUSES' };
  }

  entry.mortgaged = true;
  const player = getPlayer(draft, playerId);
  player.cash += spaceData.mortgage;

  return { events: [{ type: 'PROPERTY_MORTGAGED', playerId, spaceId, amount: spaceData.mortgage }], error: null };
}

function applyUnmortgage(draft, playerId, action) {
  if (draft.phase !== 'MANAGE') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const spaceId = action.payload?.spaceId;
  if (typeof spaceId !== 'number') return { events: [], error: 'INVALID_SPACE' };

  const entry = draft.ownership[spaceId];
  if (!entry || entry.owner !== playerId) return { events: [], error: 'NOT_OWNER' };
  if (!entry.mortgaged) return { events: [], error: 'NOT_MORTGAGED' };

  const spaceData = SPACES[spaceId];
  const cost = Math.round(spaceData.mortgage * 1.1);
  const player = getPlayer(draft, playerId);
  if (player.cash < cost) return { events: [], error: 'INSUFFICIENT_FUNDS' };

  player.cash -= cost;
  entry.mortgaged = false;

  return { events: [{ type: 'PROPERTY_UNMORTGAGED', playerId, spaceId, amount: cost }], error: null };
}

function applyPayJailFine(draft, playerId) {
  if (draft.phase !== 'ROLL') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const player = getPlayer(draft, playerId);
  if (!player.inJail) return { events: [], error: 'NOT_IN_JAIL' };
  if (player.cash < 50) return { events: [], error: 'INSUFFICIENT_FUNDS' };

  player.cash -= 50;
  player.inJail = false;
  player.jailTurns = 0;

  return { events: [{ type: 'JAIL_FINE_PAID', playerId, amount: 50 }], error: null };
}

function applyUseJailCard(draft, playerId) {
  if (draft.phase !== 'ROLL') return { events: [], error: 'WRONG_PHASE' };
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const player = getPlayer(draft, playerId);
  if (!player.inJail) return { events: [], error: 'NOT_IN_JAIL' };
  if (player.jailCards <= 0) return { events: [], error: 'NO_JAIL_CARD' };

  player.jailCards -= 1;
  player.inJail = false;
  player.jailTurns = 0;

  return { events: [{ type: 'JAIL_CARD_USED', playerId }], error: null };
}

function applyResolveDebt(draft, playerId) {
  if (draft.phase !== 'DEBT') return { events: [], error: 'WRONG_PHASE' };
  if (!draft.debt || draft.debt.debtorId !== playerId) return { events: [], error: 'NOT_DEBTOR' };

  const player = getPlayer(draft, playerId);
  const { amount, creditorId } = draft.debt;
  if (player.cash < amount) return { events: [], error: 'INSUFFICIENT_FUNDS' };

  player.cash -= amount;
  if (creditorId) {
    const creditor = getPlayer(draft, creditorId);
    if (creditor) creditor.cash += amount;
  }
  draft.debt = null;

  const events = [{ type: 'DEBT_RESOLVED', playerId, amount }];
  settleTurnPhase(draft, playerId);
  return { events, error: null };
}

function applyBankrupt(draft, playerId) {
  if (draft.phase !== 'DEBT') return { events: [], error: 'WRONG_PHASE' };
  if (!draft.debt || draft.debt.debtorId !== playerId) return { events: [], error: 'NOT_DEBTOR' };

  const debtor = getPlayer(draft, playerId);
  const creditorId = draft.debt.creditorId;
  const creditor = creditorId ? getPlayer(draft, creditorId) : null;

  let proceeds = 0;
  for (const spaceId of debtor.properties) {
    const entry = draft.ownership[spaceId];
    if (!entry) continue;
    const spaceData = SPACES[spaceId];

    if (entry.houses > 0) {
      if (entry.houses === 5) {
        draft.bank.hotels += 1;
      } else {
        draft.bank.houses += entry.houses;
      }
      proceeds += entry.houses * (spaceData.houseCost / 2);
      entry.houses = 0;
    }

    if (creditor) {
      entry.owner = creditor.id;
      creditor.properties.push(spaceId);
    } else {
      draft.ownership[spaceId] = null;
    }
  }

  if (creditor) {
    creditor.cash += debtor.cash + proceeds;
  }

  debtor.cash = 0;
  debtor.properties = [];
  debtor.bankrupt = true;
  draft.debt = null;

  const events = [{ type: 'PLAYER_BANKRUPT', playerId, creditorId: creditorId ?? null }];

  const remaining = draft.players.filter((p) => !p.bankrupt);
  if (remaining.length === 1) {
    draft.phase = 'GAME_OVER';
    draft.winnerId = remaining[0].id;
    events.push({ type: 'GAME_OVER', playerId: remaining[0].id, winnerId: remaining[0].id });
    return { events, error: null };
  }

  const nextPlayerId = getNextPlayerId(draft, playerId);
  draft.turn = { playerId: nextPlayerId, doublesCount: 0, hasRolled: false, dice: null };
  draft.phase = 'ROLL';
  events.push({ type: 'TURN_ENDED', playerId, nextPlayerId });

  return { events, error: null };
}

function applyEndTurn(draft, playerId) {
  if (draft.turn.playerId !== playerId) return { events: [], error: 'NOT_YOUR_TURN' };

  const dice = draft.turn.dice;
  const isDouble = Boolean(dice) && dice[0] === dice[1];
  const okFromRoll = draft.phase === 'ROLL' && draft.turn.hasRolled && !isDouble;
  if (draft.phase !== 'MANAGE' && !okFromRoll) {
    return { events: [], error: 'WRONG_PHASE' };
  }

  const nextPlayerId = getNextPlayerId(draft, playerId);
  if (!nextPlayerId) return { events: [], error: 'NO_ELIGIBLE_NEXT_PLAYER' };

  draft.turn = { playerId: nextPlayerId, doublesCount: 0, hasRolled: false, dice: null };
  draft.phase = 'ROLL';

  return { events: [{ type: 'TURN_ENDED', playerId, nextPlayerId }], error: null };
}

const HANDLERS = {
  [ROLL]: applyRoll,
  [BUY]: applyBuy,
  [DECLINE]: applyDecline,
  [BUILD_HOUSE]: applyBuildHouse,
  [SELL_HOUSE]: applySellHouse,
  [MORTGAGE]: applyMortgage,
  [UNMORTGAGE]: applyUnmortgage,
  [PAY_JAIL_FINE]: applyPayJailFine,
  [USE_JAIL_CARD]: applyUseJailCard,
  [RESOLVE_DEBT]: applyResolveDebt,
  [BANKRUPT]: applyBankrupt,
  [END_TURN]: applyEndTurn,
};

/**
 * Pure reducer: applies a single player action to a game state and returns
 * the next state plus any events produced. Never mutates its arguments,
 * never throws.
 *
 * PURE: no Date.now(), no Math.random(), no I/O. Dice arrive via
 * action.payload.dice, timestamps via action.at — both supplied by the
 * caller (the server); the engine never generates either.
 *
 * @param {object} state
 * @param {string} playerId
 * @param {{type: string, payload: object, at: number}} action
 * @returns {{ state: object, events: object[], error: string|null }}
 */
export function applyAction(state, playerId, action) {
  if (!isValidActionShape(action)) {
    return { state, events: [], error: 'INVALID_ACTION' };
  }

  const player = getPlayer(state, playerId);
  if (!player) {
    return { state, events: [], error: 'UNKNOWN_PLAYER' };
  }

  if (state.phase === 'GAME_OVER') {
    return { state, events: [], error: 'GAME_OVER' };
  }

  const handler = HANDLERS[action.type];
  if (!handler) {
    return { state, events: [], error: 'NOT_IMPLEMENTED' };
  }

  const draft = structuredClone(state);
  const result = handler(draft, playerId, action);

  if (result.error) {
    return { state, events: [], error: result.error };
  }

  for (const event of result.events) {
    appendLog(draft, { ...event, at: action.at });
  }

  return { state: draft, events: result.events, error: null };
}
