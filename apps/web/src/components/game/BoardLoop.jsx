import { BOARD } from '@estate/content';
import styles from './BoardLoop.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/**
 * @param {{ teams: object[] }} props
 */
export default function BoardLoop({ teams }) {
  const n = BOARD.length;

  return (
    <div className={styles.loop}>
      <div className={styles.track} aria-hidden="true" />
      {BOARD.map((space, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 44 * Math.cos(angle);
        const y = 50 + 44 * Math.sin(angle);
        const teamsHere = teams.filter((t) => t.position === space.id);

        return (
          <div
            key={space.id}
            className={cx(styles.space, styles[space.type])}
            style={{ left: `${x}%`, top: `${y}%` }}
            title={space.label}
          >
            <span className={styles.spaceLabel}>{space.label}</span>
            {teamsHere.length > 0 ? (
              <div className={styles.tokens}>
                {teamsHere.map((team) => (
                  <span key={team.id} className={styles.token} style={{ background: team.color }} title={team.name} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
