import { totalPortfolioValue } from '@estate/engine';
import { CheckCircle, Circle, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { formatMoney } from '../../lib/money.js';
import styles from './ConnectionGrid.module.css';

/**
 * @param {{ teams: object[], members: object[], onlineUserIds: Set<string>, eventQueue?: string[] }} props
 */
export default function ConnectionGrid({ teams, members, onlineUserIds, eventQueue = [] }) {
  return (
    <table className={styles.grid}>
      <thead>
        <tr>
          <th>Team</th>
          <th>Roster</th>
          <th>Allocation</th>
          <th>Value</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team) => {
          const teamMembers = members.filter((m) => m.teamId === team.id);
          const stuck = eventQueue[0] === team.id;
          return (
            <tr key={team.id} className={stuck ? styles.stuckRow : undefined}>
              <td>
                <span className={styles.swatch} style={{ background: team.color }} aria-hidden="true" />
                {team.name}
              </td>
              <td>
                <div className={styles.roster}>
                  {teamMembers.map((m) => (
                    <span key={m.userId} className={styles.member}>
                      {onlineUserIds.has(m.userId) ? (
                        <WifiHigh size={13} className={styles.online} />
                      ) : (
                        <WifiSlash size={13} className={styles.offline} />
                      )}
                      {m.role}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                {team.allocationSubmitted ? (
                  <span className={styles.yes}>
                    <CheckCircle size={16} weight="fill" /> Submitted
                  </span>
                ) : (
                  <span className={styles.no}>
                    <Circle size={16} /> Pending
                  </span>
                )}
              </td>
              <td className={styles.value}>{formatMoney(totalPortfolioValue(team))}</td>
              <td>
                {stuck ? <span className={styles.stuck}>Waiting on risk manager to roll</span> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
