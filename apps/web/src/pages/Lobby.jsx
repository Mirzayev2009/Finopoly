import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame, subscribeToPlayers } from '../lib/realtime.js';
import styles from './Lobby.module.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export default function Lobby() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const [gameId, setGameId] = useState(null);
  const [code, setCode] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  // Once we're in a game's lobby: fetch its current row (for host_id /
  // code / in case it's already active) and subscribe to realtime updates
  // for both the game row and the player list — no server broadcast step,
  // Supabase pushes these directly.
  useEffect(() => {
    if (!gameId) return undefined;

    let cancelled = false;

    supabase
      .from('games')
      .select('host_id, code, status, state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setHostId(data.host_id);
        setCode(data.code);
        if (data.status === 'active') {
          navigate(`/game/${gameId}`, { state: { initialState: data.state } });
        }
      });

    const unsubPlayers = subscribeToPlayers(gameId, setPlayers);
    const unsubGame = subscribeToGame(gameId, (row) => {
      if (row.status === 'active') {
        navigate(`/game/${gameId}`, { state: { initialState: row.state } });
      }
    });

    return () => {
      cancelled = true;
      unsubPlayers();
      unsubGame();
    };
  }, [gameId, navigate]);

  async function callServer(path, body) {
    const res = await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'REQUEST_FAILED');
    return data;
  }

  async function handleCreateGame() {
    setError(null);
    try {
      const name = profile?.email || 'Player';
      const data = await callServer('/api/games/create', { name });
      setGameId(data.gameId);
      setCode(data.code);
      setHostId(session.user.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoinGame() {
    setError(null);
    try {
      const name = profile?.email || 'Player';
      const data = await callServer('/api/games/join', { code: joinCodeInput, name });
      setGameId(data.gameId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleReady() {
    const next = !ready;
    setReady(next);
    try {
      await callServer('/api/games/ready', { gameId, ready: next });
    } catch (err) {
      setReady(!next);
      setError(err.message);
    }
  }

  async function handleStart() {
    setError(null);
    try {
      // Navigation to /game/:gameId happens via the games-table realtime
      // subscription above once the server flips status to 'active'.
      await callServer('/api/games/start', { gameId });
    } catch (err) {
      setError(err.message);
    }
  }

  const isHost = gameId && hostId === session?.user?.id;

  return (
    <div className={styles.page}>
      <h1>Estate — Lobby</h1>

      {!gameId ? (
        <div className={styles.panel}>
          <button className={styles.button} type="button" onClick={handleCreateGame}>
            Create game
          </button>

          <div className={styles.row}>
            <input
              className={styles.input}
              placeholder="6-char code"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            />
            <button className={styles.secondaryButton} type="button" onClick={handleJoinGame}>
              Join
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.panel}>
          {code ? <div className={styles.code}>{code}</div> : null}

          <ul className={styles.playerList}>
            {players.map((p) => (
              <li className={styles.playerRow} key={p.user_id}>
                <span>{p.name}</span>
                <span className={p.ready ? styles.ready : styles.notReady}>
                  {p.ready ? 'Ready' : 'Not ready'}
                </span>
              </li>
            ))}
          </ul>

          <button className={styles.secondaryButton} type="button" onClick={handleToggleReady}>
            {ready ? 'Unready' : 'Ready up'}
          </button>

          {isHost ? (
            <button className={styles.button} type="button" onClick={handleStart}>
              Start
            </button>
          ) : null}
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
