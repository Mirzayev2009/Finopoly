import { useEffect, useRef, useState } from 'react';
import { TrendDown, TrendUp } from '@phosphor-icons/react';
import { formatMoney, formatPct, formatSignedMoney } from '../../lib/money.js';
import { sectorColor } from '../../lib/sectorColors.js';
import styles from './SectorRow.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const RESOLVE_DURATION_MS = 1500;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Shared between ALLOCATION (editable slider + input, live draft value) and
 * RESOLUTION (read-only, animates old -> new value over ~1.5s once its
 * stagger delay elapses). The animated value is always interpolated
 * between two server-given numbers — never independently computed.
 */
export default function SectorRow({
  mode,
  sector,
  // allocate mode
  value,
  max,
  editable,
  onChange,
  revealed,
  trueReturn,
  // resolve mode
  fromValue,
  toValue,
  delayMs = 0,
}) {
  const color = sectorColor(sector.id);

  const [displayValue, setDisplayValue] = useState(mode === 'resolve' ? fromValue : value);
  const [animating, setAnimating] = useState(mode === 'resolve');

  useEffect(() => {
    if (mode !== 'resolve') return undefined;

    // Chart/data entrance animations must respect prefers-reduced-motion —
    // this one is driven by rAF, not CSS, so the app-wide reduced-motion
    // stylesheet rule can't reach it; jump straight to the final value.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(toValue);
      setAnimating(false);
      return undefined;
    }

    let raf;
    let start = null;
    const startTimer = setTimeout(() => {
      const tick = (timestamp) => {
        if (start === null) start = timestamp;
        const elapsed = timestamp - start;
        const t = Math.min(1, elapsed / RESOLVE_DURATION_MS);
        const eased = easeOutCubic(t);
        setDisplayValue(fromValue + (toValue - fromValue) * eased);
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setAnimating(false);
        }
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      clearTimeout(startTimer);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fromValue, toValue, delayMs]);

  if (mode === 'resolve') {
    const delta = toValue - fromValue;
    const sign = delta > 0.5 ? 'gain' : delta < -0.5 ? 'loss' : null;
    return (
      <div className={styles.row}>
        <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
        <span className={styles.name}>{sector.name}</span>
        <span className={cx(styles.value, sign === 'gain' && styles.gain, sign === 'loss' && styles.loss)}>
          {formatMoney(displayValue)}
        </span>
        <span
          className={cx(
            styles.delta,
            sign === 'gain' && styles.gain,
            sign === 'loss' && styles.loss,
            animating && styles.deltaHidden,
          )}
        >
          {sign === 'gain' ? <TrendUp size={14} weight="bold" aria-hidden="true" /> : null}
          {sign === 'loss' ? <TrendDown size={14} weight="bold" aria-hidden="true" /> : null}
          {formatSignedMoney(delta)}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.row}>
      <span className={styles.swatch} style={{ background: color }} aria-hidden="true" />
      <div className={styles.labelCol}>
        <span className={styles.name}>{sector.name}</span>
        {revealed && trueReturn != null ? (
          <span className={styles.revealed}>true return: {formatPct(trueReturn)}</span>
        ) : null}
      </div>
      <input
        type="range"
        className={styles.slider}
        style={{ '--sector-color': color }}
        min={0}
        max={Math.max(max, 1)}
        step={100}
        value={value}
        disabled={!editable}
        onChange={(e) => onChange(sector.id, Number(e.target.value))}
        aria-label={`${sector.name} allocation`}
      />
      <input
        type="number"
        className={styles.input}
        min={0}
        max={max}
        step={100}
        value={value}
        disabled={!editable}
        onChange={(e) => onChange(sector.id, Math.max(0, Number(e.target.value) || 0))}
        aria-label={`${sector.name} allocation amount`}
      />
    </div>
  );
}
