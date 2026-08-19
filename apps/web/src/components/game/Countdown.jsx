import { useEffect, useState } from 'react';
import styles from './Countdown.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function formatClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Renders Math.max(0, deadline - Date.now()) on an interval. Never counts
 * down from a locally-cached duration — always re-reads the absolute
 * deadline from the latest server state, so it can't drift or desync
 * across clients (four laptops in a classroom all read the same epoch).
 * @param {{ deadline: number|null, size?: 'lg'|'md' }} props
 */
export default function Countdown({ deadline, size = 'md' }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) {
    return <span className={cx(styles.clock, styles[size], styles.idle)}>--:--</span>;
  }

  const remaining = Math.max(0, deadline - now);
  const urgent = remaining < 60000;

  return (
    <span className={cx(styles.clock, styles[size], urgent && styles.urgent)}>{formatClock(remaining)}</span>
  );
}
