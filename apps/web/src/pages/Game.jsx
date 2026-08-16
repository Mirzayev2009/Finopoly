import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame } from '../lib/realtime.js';
import TopBar from '../components/TopBar.jsx';
import PageLoader from '../components/PageLoader.jsx';
import styles from './Game.module.css';

// Placeholder only: no board rendering, no rules UI. Just proves the
// realtime round-trip (server writes the games row -> Supabase pushes it
// -> we render it) works.
export default function Game() {
  const { gameId } = useParams();
  const location = useLocation();
  const [state, setState] = useState(location.state?.initialState ?? null);

  useEffect(() => {
    let cancelled = false;

    if (!state) {
      supabase
        .from('games')
        .select('state')
        .eq('id', gameId)
        .single()
        .then(({ data }) => {
          if (!cancelled && data) setState(data.state);
        });
    }

    const unsubscribe = subscribeToGame(gameId, (row) => setState(row.state));

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  return (
    <div className={styles.page}>
      <TopBar />

      <main className={styles.main}>
        <Link to="/lobby" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to lobby
        </Link>

        <h1 className={styles.heading}>Game in progress</h1>
        <p className={styles.subheading}>
          The board hasn't been built yet — this panel shows the raw synced state so you can see the multiplayer
          plumbing working.
        </p>

        {state ? (
          <pre className={styles.stateBlock}>{JSON.stringify(state, null, 2)}</pre>
        ) : (
          <PageLoader label="Waiting for state…" fullScreen={false} />
        )}
      </main>
    </div>
  );
}
