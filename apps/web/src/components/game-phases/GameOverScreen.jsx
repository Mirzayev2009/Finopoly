import { Trophy } from '@phosphor-icons/react';
import Leaderboard from '../game/Leaderboard.jsx';
import { formatMoney } from '../../lib/money.js';
import styles from './GameOverScreen.module.css';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 260;
const PADDING = 32;

// Team identity on the chart is never color-only: each line also gets a
// distinct dash pattern (solid/dashed/dotted, cycling) and a direct label
// at its final point, so it reads for colorblind viewers too.
const DASH_PATTERNS = ['none', '8 5', '2 4', '10 4 2 4'];

function buildPoints(history, maxValue) {
  return history.map((h) => {
    const x = PADDING + (h.round - 1) * ((CHART_WIDTH - PADDING * 2) / 3);
    const y = CHART_HEIGHT - PADDING - (h.endValue / maxValue) * (CHART_HEIGHT - PADDING * 2);
    return { x, y, round: h.round, value: h.endValue };
  });
}

/**
 * Lightweight inline SVG chart — 4 data points per team, not worth a
 * charting library dependency.
 * @param {{ teams: object[] }} props
 */
export default function GameOverScreen({ teams }) {
  const maxValue = Math.max(100000, ...teams.flatMap((t) => t.history.map((h) => h.endValue)));

  return (
    <div className={styles.page}>
      <div className={styles.headline}>
        <Trophy size={40} weight="fill" className={styles.trophy} aria-hidden="true" />
        <h1 className={styles.title}>Game over</h1>
      </div>

      <Leaderboard teams={teams} />

      <div className={styles.chartCard}>
        <span className={styles.chartLabel}>Portfolio value by round</span>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className={styles.chart}
          role="img"
          aria-label="Portfolio value by round for each team"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = CHART_HEIGHT - PADDING - f * (CHART_HEIGHT - PADDING * 2);
            return (
              <line key={f} x1={PADDING} x2={CHART_WIDTH - PADDING} y1={y} y2={y} className={styles.gridLine} />
            );
          })}
          {teams.map((team, i) => {
            const points = buildPoints(team.history, maxValue);
            const path = points.map((p) => `${p.x},${p.y}`).join(' ');
            const last = points[points.length - 1];
            return (
              <g key={team.id}>
                <polyline
                  points={path}
                  fill="none"
                  stroke={team.color}
                  strokeWidth={2.5}
                  strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                />
                {points.map((p) => (
                  <circle key={p.round} cx={p.x} cy={p.y} r={4} fill={team.color} />
                ))}
                {last ? (
                  <text x={last.x + 8} y={last.y + 4} className={styles.chartLineLabel} fill={team.color}>
                    {team.name}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <div className={styles.legend}>
          {teams.map((team, i) => (
            <span key={team.id} className={styles.legendItem}>
              <svg width="20" height="10" aria-hidden="true">
                <line
                  x1="0"
                  y1="5"
                  x2="20"
                  y2="5"
                  stroke={team.color}
                  strokeWidth={2.5}
                  strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
                />
              </svg>
              {team.name}
            </span>
          ))}
        </div>

        <table className={styles.dataTable}>
          <caption className="sr-only">Portfolio value by round for each team</caption>
          <thead>
            <tr>
              <th scope="col">Team</th>
              {teams[0]?.history.map((h) => (
                <th scope="col" key={h.round}>
                  Round {h.round}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id}>
                <th scope="row">{team.name}</th>
                {team.history.map((h) => (
                  <td key={h.round}>{formatMoney(h.endValue)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
