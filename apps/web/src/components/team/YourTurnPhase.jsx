import { useState } from 'react';
import { useCountdown, formatCountdown } from '../../hooks/useCountdown.js';
import { callRoomAction } from '../../lib/roomActions.js';
import { formatMoney } from '../../lib/money.js';
import styles from './YourTurnPhase.module.css';

export default function YourTurnPhase({ pendingTurn, syndicate, isActor, actorName, roomSlug, accessToken, onClaimed }) {
  const [selectedId, setSelectedId] = useState(null);
  const [bet, setBet] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);
  const remainingMs = useCountdown(pendingTurn.decisionDeadline);
  const cash = syndicate.cash;

  if (!isActor) {
    return (
      <div className={styles.takeOverPhase}>
        <p className={styles.takeOverText}>
          {actorName ? `${actorName} is submitting for your team.` : 'Another device is submitting for your team.'}
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={claiming}
          onClick={async () => {
            setClaiming(true);
            try {
              await callRoomAction(roomSlug, accessToken, 'CLAIM_ACTOR', {});
              await onClaimed?.();
            } catch (e) {
              setError(e.message);
            } finally {
              setClaiming(false);
            }
          }}
        >
          Take Over
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await callRoomAction(roomSlug, accessToken, 'SUBMIT_INVESTMENT', { cardId: selectedId, betAmount: bet });
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
    // no re-enable on success: the screen transitions to RESOLUTION once the
    // broadcast lands, so there's nothing to re-enable back into
  }

  return (
    <div className={styles.phase}>
      {pendingTurn.decisionDeadline && (
        <div className={`${styles.deadline} timer`}>{formatCountdown(remainingMs)}</div>
      )}

      <div className={styles.cards}>
        {pendingTurn.drawnCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`${styles.card} ${selectedId === card.id ? styles.cardSelected : ''}`}
            onClick={() => setSelectedId(card.id)}
            disabled={submitting}
          >
            <span className={styles.cardType}>{card.assetType}</span>
            <span className={styles.cardName}>{card.name}</span>
            <span className={styles.cardReason}>{card.reason}</span>
          </button>
        ))}
      </div>

      <div className={styles.betSection}>
        <div className={styles.betAmountRow}>
          <span className={styles.betLabel}>Bet</span>
          <span className={`${styles.betAmount} money`}>{formatMoney(bet)}</span>
        </div>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={cash}
          step={Math.max(1, Math.round(cash / 100))}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
          disabled={submitting}
        />
        <div className={styles.chipRow}>
          <button type="button" className={styles.chip} disabled={submitting} onClick={() => setBet(Math.floor(cash * 0.25))}>25%</button>
          <button type="button" className={styles.chip} disabled={submitting} onClick={() => setBet(Math.floor(cash * 0.5))}>50%</button>
          <button type="button" className={styles.chip} disabled={submitting} onClick={() => setBet(cash)}>All in</button>
        </div>
      </div>

      <button
        type="button"
        className={styles.submitButton}
        disabled={submitting || !selectedId || bet < 0 || bet > cash}
        onClick={handleSubmit}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
