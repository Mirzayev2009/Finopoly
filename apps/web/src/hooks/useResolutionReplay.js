import { useEffect, useRef, useState } from 'react';

const REPLAY_DURATION_MS = 9000;

/**
 * The engine's RESOLVE_ROUND is a single atomic action: it applies returns
 * AND advances the phase away from RESOLUTION in the same step, so the
 * server never reports an intermediate "here's the payoff" phase. This
 * hook snapshots team holdings on every tick while phase === 'RESOLUTION',
 * and when it sees the phase move on, hands back a one-shot replay payload
 * (last-seen-before vs. current-after) that ResolutionScreen can animate,
 * auto-clearing after a fixed viewing window.
 * @param {object|null} state
 */
export function useResolutionReplay(state) {
  const snapshotRef = useRef(null);
  const prevPhaseRef = useRef(undefined);
  const [replay, setReplay] = useState(null);

  useEffect(() => {
    if (!state) return undefined;

    if (state.phase === 'RESOLUTION') {
      snapshotRef.current = { round: state.round, teams: state.teams };
      prevPhaseRef.current = state.phase;
      return undefined;
    }

    if (prevPhaseRef.current === 'RESOLUTION' && snapshotRef.current) {
      const snapshot = snapshotRef.current;
      snapshotRef.current = null;
      setReplay({ round: snapshot.round, fromTeams: snapshot.teams, toTeams: state.teams });
      prevPhaseRef.current = state.phase;
      const timer = setTimeout(() => setReplay(null), REPLAY_DURATION_MS);
      return () => clearTimeout(timer);
    }

    prevPhaseRef.current = state.phase;
    return undefined;
  }, [state]);

  return replay;
}
