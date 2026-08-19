import { totalPortfolioValue } from '@estate/engine';
import { Trophy } from '@phosphor-icons/react';
import { formatMoney } from '../../lib/money.js';
import styles from './Leaderboard.module.css';

/**
 * @param {{ teams: object[], highlightTeamId?: string }} props
 */
export default function Leaderboard({ teams, highlightTeamId }) {
  const ranked = [...teams].sort((a, b) => totalPortfolioValue(b) - totalPortfolioValue(a));

  return (
    <ol className={styles.list}>
      {ranked.map((team, index) => (
        <li
          key={team.id}
          className={team.id === highlightTeamId ? `${styles.row} ${styles.highlight}` : styles.row}
        >
          <span className={styles.rank}>{index === 0 ? <Trophy size={20} weight="fill" /> : index + 1}</span>
          <span className={styles.swatch} style={{ background: team.color }} aria-hidden="true" />
          <span className={styles.name}>{team.name}</span>
          <span className={styles.value}>{formatMoney(totalPortfolioValue(team))}</span>
        </li>
      ))}
    </ol>
  );
}
