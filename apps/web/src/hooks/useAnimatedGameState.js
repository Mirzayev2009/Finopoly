import { useEffect, useReducer, useRef, useState } from 'react';

const STEP_MS = 120;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function reducer(_current, next) {
  // Wholesale replace only — never merge, never compute anything here.
  return next;
}

/**
 * Holds the authoritative server state in a useReducer that only ever
 * replaces wholesale (never merges) on each realtime update, plus a
 * `displayState` that trails behind it while new log events since the
 * last render are animated one at a time. Token movement is driven by
 * DICE_ROLLED events' dice payload (steps = sum), not by diffing
 * positions directly; anything that isn't a plain forward walk (jail,
 * card teleports) hops straight to the final position since the engine's
 * events don't carry path information for those.
 *
 * @param {object|null} initialState
 * @returns {{
 *   serverState: object|null,
 *   displayState: object|null,
 *   isAnimating: boolean,
 *   replaceState: (next: object) => void,
 * }}
 */
export function useAnimatedGameState(initialState) {
  const [serverState, dispatch] = useReducer(reducer, initialState ?? null);
  const [displayState, setDisplayState] = useState(initialState ?? null);
  const [isAnimating, setIsAnimating] = useState(false);

  const lastAtRef = useRef(initialState?.log?.at(-1)?.at ?? 0);
  const displayStateRef = useRef(initialState ?? null);

  useEffect(() => {
    displayStateRef.current = displayState;
  }, [displayState]);

  useEffect(() => {
    if (!serverState) return undefined;

    if (!displayStateRef.current) {
      setDisplayState(serverState);
      lastAtRef.current = serverState.log.at(-1)?.at ?? 0;
      return undefined;
    }

    const newEvents = serverState.log.filter((event) => event.at > lastAtRef.current);
    if (newEvents.length === 0) {
      setDisplayState(serverState);
      return undefined;
    }

    let cancelled = false;
    setIsAnimating(true);

    async function drain() {
      const working = structuredClone(displayStateRef.current);

      for (const event of newEvents) {
        if (cancelled) break;

        if (event.type === 'DICE_ROLLED' && Array.isArray(event.dice)) {
          const sum = event.dice[0] + event.dice[1];
          const player = working.players.find((p) => p.id === event.playerId);
          const finalPlayer = serverState.players.find((p) => p.id === event.playerId);

          if (player && finalPlayer && player.position !== finalPlayer.position) {
            const expectedWalk = (player.position + sum) % 40;

            if (expectedWalk === finalPlayer.position) {
              // Ordinary forward move — step it out one space at a time.
              for (let i = 0; i < sum; i += 1) {
                if (cancelled) break;
                player.position = (player.position + 1) % 40;
                setDisplayState({ ...working, players: working.players.map((p) => ({ ...p })) });
                // eslint-disable-next-line no-await-in-loop
                await sleep(STEP_MS);
              }
            } else {
              // Teleport (jail, card advance, etc.) — no path to walk.
              player.position = finalPlayer.position;
              setDisplayState({ ...working, players: working.players.map((p) => ({ ...p })) });
              // eslint-disable-next-line no-await-in-loop
              await sleep(STEP_MS * 2);
            }
          }
        } else {
          // Non-movement events still pace the drain so the log/controls
          // reveal in order rather than jumping straight to the end.
          // eslint-disable-next-line no-await-in-loop
          await sleep(STEP_MS);
        }

        lastAtRef.current = Math.max(lastAtRef.current, event.at ?? lastAtRef.current);
      }

      if (!cancelled) {
        setDisplayState(serverState); // converge exactly — no drift from the true state
        setIsAnimating(false);
      }
    }

    drain();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState]);

  return {
    serverState,
    displayState: displayState ?? serverState,
    isAnimating,
    replaceState: (next) => dispatch(next),
  };
}
