import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame } from '../lib/realtime.js';

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
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#f8fafc', background: '#0f172a', minHeight: '100vh' }}>
      <h1>Estate — Game {gameId}</h1>
      <p>No board rendering yet. Raw state:</p>
      <pre>{state ? JSON.stringify(state, null, 2) : 'Waiting for state…'}</pre>
    </div>
  );
}
