import { getPlayerColor } from '../../lib/playerColors.js';
import styles from './PlayerTokens.module.css';

/**
 * Renders up to 4 player tokens absolutely positioned inside a Space,
 * offset into quadrants so they don't overlap.
 */
export default function PlayerTokens({ state, players }) {
  if (!players || players.length === 0) return null;

  return (
    <div className={styles.tokens} aria-hidden="true">
      {players.slice(0, 4).map((player, i) => (
        <span
          key={player.id}
          className={`${styles.token} ${styles[`pos${i}`]}`}
          style={{ background: getPlayerColor(state, player.id) }}
          title={player.name}
        />
      ))}
    </div>
  );
}
