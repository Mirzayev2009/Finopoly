import { useState } from 'react';
import BoardLoop from '../game/BoardLoop.jsx';
import CardModal from '../game/CardModal.jsx';
import Button from '../Button.jsx';
import styles from './MarketEventsScreen.module.css';

/**
 * @param {{ state: object, team: object|null, isRiskManager: boolean, dispatchAction: (type: string, payload?: object) => Promise<any> }} props
 */
export default function MarketEventsScreen({ state, team, isRiskManager, dispatchAction }) {
  const [rolling, setRolling] = useState(false);
  const [resolving, setResolving] = useState(false);

  const isMyTurn = team && state.eventQueue[0] === team.id;
  const waitingTeam = state.teams.find((t) => t.id === state.eventQueue[0]);

  async function handleRoll() {
    setRolling(true);
    try {
      // Placeholder dice — the server always rolls its own and discards
      // whatever the client sends, so this value is irrelevant.
      await dispatchAction('ROLL', { dice: [1, 1] });
    } finally {
      setRolling(false);
    }
  }

  async function handleResolve(choice) {
    setResolving(true);
    try {
      await dispatchAction('RESOLVE_CARD', choice ? { choice } : {});
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.status}>
        {isMyTurn ? (
          <span className={styles.yourTurn}>Your team's turn to roll</span>
        ) : (
          <span className={styles.waiting}>Waiting on {waitingTeam?.name ?? '—'}</span>
        )}
      </div>

      <BoardLoop teams={state.teams} />

      {isRiskManager ? (
        <div className={styles.actions}>
          <Button disabled={!isMyTurn || team.pendingCard !== null} loading={rolling} onClick={handleRoll}>
            Roll dice
          </Button>
        </div>
      ) : (
        <p className={styles.hint}>Only your risk manager can roll.</p>
      )}

      {team?.pendingCard ? (
        isRiskManager ? (
          <CardModal pendingCard={team.pendingCard} onResolve={handleResolve} resolving={resolving} />
        ) : (
          <p className={styles.hint}>Your risk manager is resolving a market event card.</p>
        )
      ) : null}
    </div>
  );
}
