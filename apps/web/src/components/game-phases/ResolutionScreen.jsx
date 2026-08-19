import { useEffect, useState } from 'react';
import { ROUNDS, SECTORS } from '@estate/content';
import SectorRow from '../game/SectorRow.jsx';
import Leaderboard from '../game/Leaderboard.jsx';
import styles from './ResolutionScreen.module.css';

const STAGGER_MS = 150;
const ANIMATE_MS = 1500;
const DEBRIEF_DELAY_MS = ANIMATE_MS + SECTORS.length * STAGGER_MS + 300;
const LEADERBOARD_DELAY_MS = DEBRIEF_DELAY_MS + 2500;

/**
 * The engine's RESOLVE_ROUND is a single atomic action — it applies returns
 * AND advances the phase away from RESOLUTION in the same step, so by the
 * time new holdings exist, the server-reported phase has already moved on.
 * This screen is therefore a client-side replay: the caller snapshots
 * holdings just before the transition and hands both snapshots here, so the
 * animation always interpolates between two real server-given numbers even
 * though it's playing after the fact.
 * @param {{ round: number, fromTeam: object, toTeam: object, toTeams: object[] }} props
 */
export default function ResolutionScreen({ round, fromTeam, toTeam, toTeams }) {
  const [showDebrief, setShowDebrief] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    setShowDebrief(false);
    setShowLeaderboard(false);
    const t1 = setTimeout(() => setShowDebrief(true), DEBRIEF_DELAY_MS);
    const t2 = setTimeout(() => setShowLeaderboard(true), LEADERBOARD_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [round]);

  return (
    <div className={styles.page}>
      <span className={styles.marker}>Round {round} results</span>

      <div className={styles.rows}>
        {SECTORS.map((sector, i) => (
          <SectorRow
            key={sector.id}
            mode="resolve"
            sector={sector}
            fromValue={fromTeam.holdings[sector.id]}
            toValue={toTeam.holdings[sector.id]}
            delayMs={i * STAGGER_MS}
          />
        ))}
      </div>

      <div className={showDebrief ? `${styles.reveal} ${styles.revealed}` : styles.reveal}>
        <span className={styles.debriefLabel}>What actually happened</span>
        <p className={styles.debriefText}>{ROUNDS[round - 1]?.debrief}</p>
      </div>

      <div className={showLeaderboard ? `${styles.reveal} ${styles.revealed}` : styles.reveal}>
        <span className={styles.debriefLabel}>Standings</span>
        <Leaderboard teams={toTeams} highlightTeamId={toTeam.id} />
      </div>
    </div>
  );
}
