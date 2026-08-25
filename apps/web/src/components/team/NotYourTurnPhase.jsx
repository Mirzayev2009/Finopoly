import { formatMoney } from '../../lib/money.js';
import styles from './NotYourTurnPhase.module.css';

const FLAG_LABELS = {
  hedgeFund: 'Hedge Fund',
  insiderInfo: 'Insider Info',
  blindFaith: 'Blind Faith',
  bigShort: 'Big Short',
  monopolyPower: 'Monopoly Power',
  sabotaged: 'Sabotaged',
  frozen: 'Frozen',
  immune: 'Immune',
};

const STAGE_LABELS = {
  awaiting_pick: 'choosing an investment',
  news: 'reading market news',
  corner: 'resolving a corner event',
};

export default function NotYourTurnPhase({ mySyndicate, syndicates, pendingTurn, turnSyndicate }) {
  const ranked = [...syndicates].sort((a, b) => b.cash - a.cash);
  const rank = ranked.findIndex((s) => s.id === mySyndicate.id) + 1;
  const activeFlags = Object.entries(mySyndicate.flags).filter(([, v]) => v);

  return (
    <div className={styles.phase}>
      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Cash</span>
          <span className={`${styles.statValue} money`}>{formatMoney(mySyndicate.cash)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Rank</span>
          <span className={styles.statValue}>{rank} / {syndicates.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Position</span>
          <span className={styles.statValue}>{mySyndicate.position}</span>
        </div>
      </div>

      {activeFlags.length > 0 && (
        <div className={styles.flagRow}>
          {activeFlags.map(([key]) => (
            <span key={key} className={styles.flagChip}>{FLAG_LABELS[key] ?? key}</span>
          ))}
        </div>
      )}

      <div className={styles.turnBanner}>
        <span className={styles.turnLabel}>Current turn</span>
        <span className={styles.turnName} style={{ color: turnSyndicate?.color }}>
          {turnSyndicate?.name ?? 'Waiting for the host'}
        </span>
        {pendingTurn && (
          <span className={styles.turnStatus}>{STAGE_LABELS[pendingTurn.stage] ?? pendingTurn.stage}</span>
        )}
      </div>

      <h2 className={styles.sectionTitle}>Standings</h2>
      <div className={styles.standings}>
        {ranked.map((s, i) => (
          <div key={s.id} className={`${styles.standingRow} ${s.id === mySyndicate.id ? styles.standingMine : ''}`}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.chip} style={{ background: s.color }} />
            <span className={styles.name}>{s.name}</span>
            <span className={`${styles.cash} money`}>{formatMoney(s.cash)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
