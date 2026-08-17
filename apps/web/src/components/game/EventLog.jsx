import { BOARD } from '@estate/board';
import styles from './EventLog.module.css';

function playerName(state, id) {
  return state.players.find((p) => p.id === id)?.name ?? 'Someone';
}

function spaceName(spaceId) {
  return BOARD[spaceId]?.name ?? `space ${spaceId}`;
}

function describeEvent(state, event) {
  const name = playerName(state, event.playerId);

  switch (event.type) {
    case 'DICE_ROLLED':
      return `${name} rolled ${event.dice[0]} + ${event.dice[1]}${event.dice[0] === event.dice[1] ? ' (doubles)' : ''}`;
    case 'PASSED_GO':
      return `${name} passed GO and collected $${event.amount}`;
    case 'SENT_TO_JAIL':
      return `${name} was sent to jail`;
    case 'AWAIT_BUY':
      return `${name} landed on ${spaceName(event.spaceId)}`;
    case 'PROPERTY_BOUGHT':
      return `${name} bought ${spaceName(event.spaceId)} for $${event.amount}`;
    case 'PROPERTY_DECLINED':
      return `${name} declined to buy ${spaceName(event.spaceId)}`;
    case 'RENT_PAID':
      return event.debt
        ? `${name} owes $${event.amount} rent for ${spaceName(event.spaceId)}`
        : `${name} paid $${event.amount} rent for ${spaceName(event.spaceId)}`;
    case 'TAX_PAID':
      return event.debt ? `${name} owes $${event.amount} tax` : `${name} paid $${event.amount} tax`;
    case 'HOUSE_BUILT':
      return `${name} built on ${spaceName(event.spaceId)} (${
        event.houses === 5 ? 'hotel' : `${event.houses} house${event.houses > 1 ? 's' : ''}`
      })`;
    case 'HOUSE_SOLD':
      return `${name} sold a house on ${spaceName(event.spaceId)} for $${event.amount}`;
    case 'PROPERTY_MORTGAGED':
      return `${name} mortgaged ${spaceName(event.spaceId)} for $${event.amount}`;
    case 'PROPERTY_UNMORTGAGED':
      return `${name} unmortgaged ${spaceName(event.spaceId)} for $${event.amount}`;
    case 'JAIL_FINE_PAID':
      return `${name} paid $50 to leave jail`;
    case 'JAIL_CARD_USED':
      return `${name} used a jail free card`;
    case 'JAIL_FINE_FORCED':
      return event.debt ? `${name} owes a forced $50 jail fine` : `${name} paid a forced $50 jail fine`;
    case 'CARD_DRAWN':
      return `${name} drew a ${event.deck} card`;
    case 'CARD_COLLECT':
      return `${name} collected $${event.amount}`;
    case 'CARD_PAY':
      return event.debt ? `${name} owes $${event.amount}` : `${name} paid $${event.amount}`;
    case 'CARD_JAIL_FREE':
      return `${name} got a jail free card`;
    case 'CARD_REPAIRS':
      return event.debt ? `${name} owes $${event.amount} for repairs` : `${name} paid $${event.amount} for repairs`;
    case 'CARD_PAY_EACH_PLAYER':
      return `${name} paid every player $${event.amount}`;
    case 'CARD_COLLECT_FROM_EACH_PLAYER':
      return `${name} collected $${event.amount} from every player`;
    case 'DEBT_RESOLVED':
      return `${name} paid off $${event.amount} owed`;
    case 'PLAYER_BANKRUPT':
      return `${name} went bankrupt`;
    case 'GAME_OVER':
      return `${name} wins the game`;
    case 'TURN_ENDED':
      return `${name} ended their turn`;
    default:
      return `${name}: ${event.type}`;
  }
}

export default function EventLog({ state }) {
  const events = [...state.log].reverse();

  return (
    <div className={styles.log}>
      {events.length === 0 ? (
        <p className={styles.empty}>No moves yet.</p>
      ) : (
        <ul className={styles.list}>
          {events.map((event, i) => (
            <li key={`${event.at}-${i}`} className={styles.entry}>
              {describeEvent(state, event)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
