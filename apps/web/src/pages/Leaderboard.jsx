import { useEffect, useReducer } from 'react';
import { ERA_BRIEFINGS } from '@estate/content/client';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchStandings } from '../lib/roomActions.js';
import { subscribeToGlobalChannel } from '../lib/roomRealtime.js';
import { formatMoney, formatSignedMoney } from '../lib/money.js';
import PageLoader from '../components/PageLoader.jsx';
import TopBar from '../components/TopBar.jsx';
import styles from './Leaderboard.module.css';

function standingsReducer(state, action) {
  switch (action.type) {
    case 'SNAPSHOT':
      return {
        eraId: action.eraId,
        byRoom: Object.fromEntries(action.rooms.map((r) => [r.roomSlug, r.standings])),
      };
    case 'DELTA':
      return { ...state, byRoom: { ...state.byRoom, [action.payload.roomSlug]: action.payload.standings } };
    default:
      return state;
  }
}

export default function Leaderboard() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [state, dispatch] = useReducer(standingsReducer, { eraId: null, byRoom: null });

  useEffect(() => {
    if (!accessToken) return undefined;
    fetchStandings(accessToken).then((data) => dispatch({ type: 'SNAPSHOT', ...data }));
    return subscribeToGlobalChannel((payload) => dispatch({ type: 'DELTA', payload }));
  }, [accessToken]);

  if (!state.byRoom) return <PageLoader label="Loading leaderboard…" />;

  const era = ERA_BRIEFINGS.find((e) => e.id === state.eraId);
  const rows = Object.entries(state.byRoom)
    .flatMap(([roomSlug, standings]) => standings.map((s) => ({ ...s, roomSlug })))
    .sort((a, b) => b.cash - a.cash);

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Global Rankings</h1>
        {era && <span className={styles.eraName}>{era.title}</span>}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No syndicates registered yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Syndicate</th>
              <th>Room</th>
              <th>Cash</th>
              <th>&Delta; This Era</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const delta = s.cash - s.eraStartingCash;
              return (
                <tr key={s.syndicateId} className={i < 3 ? styles.topRow : undefined}>
                  <td className={styles.rank}>{i + 1}</td>
                  <td className={styles.syndicateCell}>
                    <span className={styles.chip} style={{ background: s.color }} />
                    {s.name}
                  </td>
                  <td className={styles.room}>{s.roomSlug}</td>
                  <td className="money">{formatMoney(s.cash)}</td>
                  <td className={delta >= 0 ? styles.gain : styles.loss}>{formatSignedMoney(delta)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
