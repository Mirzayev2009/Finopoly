import { useEffect, useState } from 'react';

/**
 * Ticks down to an absolute server deadline (ISO timestamp), never a local
 * duration — recomputes from Date.now() every tick, so a locked screen or a
 * backgrounded tab that stalls setInterval for a while still shows the
 * correct remaining time the instant it resumes, instead of drifting.
 * @param {string|null} deadlineIso
 * @returns {number} milliseconds remaining, floored at 0; 0 if no deadline
 */
export function useCountdown(deadlineIso) {
  const [remainingMs, setRemainingMs] = useState(() => computeRemaining(deadlineIso));

  useEffect(() => {
    setRemainingMs(computeRemaining(deadlineIso));
    if (!deadlineIso) return undefined;

    const interval = setInterval(() => {
      setRemainingMs(computeRemaining(deadlineIso));
    }, 250);
    return () => clearInterval(interval);
  }, [deadlineIso]);

  return remainingMs;
}

function computeRemaining(deadlineIso) {
  if (!deadlineIso) return 0;
  return Math.max(0, new Date(deadlineIso).getTime() - Date.now());
}

/** @param {number} ms @returns {string} "MM:SS" */
export function formatCountdown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
