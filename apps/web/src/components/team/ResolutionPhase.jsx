import { useEffect, useState } from 'react';
import { parseInvestmentNote } from '../../lib/parseInvestmentNote.js';
import { formatMoney, formatSignedMoney } from '../../lib/money.js';
import styles from './ResolutionPhase.module.css';

const COUNT_DURATION_MS = 700;

export default function ResolutionPhase({ transaction, era, cash, onContinue }) {
  const parsed = parseInvestmentNote(transaction?.note);
  const [flipped, setFlipped] = useState(false);
  const [displayCash, setDisplayCash] = useState(cash - transaction.amount);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const startCash = cash - transaction.amount;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION_MS);
      setDisplayCash(Math.round(startCash + (cash - startCash) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.id]);

  const gain = transaction.amount >= 0;

  return (
    <div className={styles.phase}>
      <div className={`${styles.card} ${flipped ? styles.cardFlipped : ''}`}>
        <div className={styles.cardFront}>
          <span className={styles.cardName}>{parsed?.cardName ?? 'Investment'}</span>
        </div>
        <div className={styles.cardBack}>
          <span className={styles.cardName}>{parsed?.cardName ?? 'Investment'}</span>
          {parsed && (
            <span className={`${styles.percentage} percentage`} style={{ color: parsed.percentage >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {parsed.percentage >= 0 ? '+' : ''}{parsed.percentage}%
            </span>
          )}
        </div>
      </div>

      <div className={styles.cashRow}>
        <span className={`${styles.cash} money`}>{formatMoney(displayCash)}</span>
        <span className={gain ? styles.gain : styles.loss}>{formatSignedMoney(transaction.amount)}</span>
      </div>

      {era?.debrief && <p className={styles.debrief}>{era.debrief}</p>}

      <button type="button" className={styles.continueButton} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
