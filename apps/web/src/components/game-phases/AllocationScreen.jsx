import { useEffect, useRef, useState } from 'react';
import { SECTORS } from '@estate/content';
import { totalPortfolioValue } from '@estate/engine';
import SectorRow from '../game/SectorRow.jsx';
import Button from '../Button.jsx';
import { formatMoney } from '../../lib/money.js';
import styles from './AllocationScreen.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const DEBOUNCE_MS = 400;

/**
 * The one screen with local draft state, per spec: the strategist's slider
 * drags update instantly, and only push SET_ALLOCATION on a 400ms debounce
 * so teammates see it move without a request per pixel.
 * @param {{ team: object, round: object, isStrategist: boolean, dispatchAction: (type: string, payload?: object) => Promise<any> }} props
 */
export default function AllocationScreen({ team, round, isStrategist, dispatchAction }) {
  const total = totalPortfolioValue(team);
  const [draft, setDraft] = useState(() => ({ ...team.holdings }));
  const debounceRef = useRef(null);

  // Non-strategists always mirror server holdings — only the strategist's
  // own browser ever holds the uncommitted local draft.
  useEffect(() => {
    if (!isStrategist) setDraft({ ...team.holdings });
  }, [team.holdings, isStrategist]);

  function updateSector(sectorId, value) {
    const next = { ...draft, [sectorId]: value };
    setDraft(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatchAction('SET_ALLOCATION', { alloc: next });
    }, DEBOUNCE_MS);
  }

  const displayValues = isStrategist ? draft : team.holdings;
  const allocated = Object.values(displayValues).reduce((a, b) => a + b, 0);
  const remaining = total - allocated;
  const isExact = Math.abs(remaining) < 0.5;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Allocate your portfolio</h1>
      {!isStrategist ? <p className={styles.deciding}>Strategist is deciding.</p> : null}

      <div className={cx(styles.rows, !isStrategist && styles.rowsDisabled)}>
        {SECTORS.map((sector) => (
          <SectorRow
            key={sector.id}
            mode="allocate"
            sector={sector}
            value={displayValues[sector.id]}
            max={total}
            editable={isStrategist}
            onChange={updateSector}
            revealed={team.revealedSectors.includes(sector.id)}
            trueReturn={round.returns[sector.id]}
          />
        ))}
      </div>

      <div className={cx(styles.totalBar, isExact ? styles.totalExact : styles.totalOff)}>
        <span>
          Allocated {formatMoney(allocated)} of {formatMoney(total)}
        </span>
        <span>
          {isExact
            ? 'Ready to submit'
            : `${formatMoney(Math.abs(remaining))} ${remaining > 0 ? 'unallocated' : 'over-allocated'}`}
        </span>
      </div>

      {isStrategist ? (
        <Button fullWidth disabled={!isExact || team.allocationSubmitted} onClick={() => dispatchAction('SUBMIT_ALLOCATION', {})}>
          {team.allocationSubmitted ? 'Submitted' : 'Submit allocation'}
        </Button>
      ) : null}
    </div>
  );
}
