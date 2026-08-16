import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Circle,
  Copy,
  Crown,
  Plus,
  WarningCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { subscribeToGame, subscribeToPlayers } from '../lib/realtime.js';
import Button from '../components/Button.jsx';
import TopBar from '../components/TopBar.jsx';
import styles from './Lobby.module.css';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function initials(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || '?';
}

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
  const [copied, setCopied] = useState(false);

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);

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
    setCreating(true);
    try {
      const name = profile?.email || 'Player';
      const data = await callServer('/api/games/create', { name });
      setGameId(data.gameId);
      setCode(data.code);
      setHostId(session.user.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinGame(e) {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const name = profile?.email || 'Player';
      const data = await callServer('/api/games/join', { code: joinCodeInput, name });
      setGameId(data.gameId);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
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
    setStarting(true);
    try {
      await callServer('/api/games/start', { gameId });
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  async function handleCopyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — the code is still visible to copy by hand.
    }
  }

  const isHost = Boolean(gameId) && hostId === session?.user?.id;
  const enoughPlayers = players.length >= 2;
  const allReady = players.length > 0 && players.every((p) => p.ready);
  const canStart = enoughPlayers && allReady;

  let startHelperText = null;
  if (isHost && !starting) {
    if (!enoughPlayers) startHelperText = 'Waiting for at least one more player to join.';
    else if (!allReady) startHelperText = 'Waiting for everyone to ready up.';
  }

  return (
    <div className={styles.page}>
      <TopBar />

      <main className={styles.main}>
        {!gameId ? (
          <div className={styles.startSection}>
            <h1 className={styles.heading}>Start a game</h1>
            <p className={styles.subheading}>Create a room and share the code, or join one that's already open.</p>

            <Button icon={Plus} loading={creating} onClick={handleCreateGame}>
              Create a game
            </Button>

            <div className={styles.divider}>or join with a code</div>

            <form className={styles.joinRow} onSubmit={handleJoinGame}>
              <input
                className={styles.codeInput}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                aria-label="Game code"
                autoComplete="off"
              />
              <Button type="submit" variant="secondary" icon={ArrowRight} iconPosition="right" loading={joining}>
                Join
              </Button>
            </form>
          </div>
        ) : (
          <div className={styles.roomSection}>
            {code ? (
              <div className={styles.codeCard}>
                <span className={styles.codeLabel}>Room code</span>
                <div className={styles.codeRow}>
                  <span className={styles.codeText}>{code}</span>
                  <button
                    type="button"
                    className={styles.copyButton}
                    onClick={handleCopyCode}
                    aria-label="Copy room code"
                  >
                    {copied ? <CheckCircle size={18} weight="fill" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            ) : null}

            <div className={styles.playersSection}>
              <h2 className={styles.playersHeading}>
                Players
                <span className={styles.playerCount}>{players.length}</span>
              </h2>

              <ul className={styles.playerList}>
                {players.map((p) => (
                  <li key={p.user_id} className={styles.playerRow}>
                    <span className={styles.avatar}>{initials(p.name)}</span>
                    <span className={styles.playerName}>
                      {p.name}
                      {p.user_id === hostId ? <Crown className={styles.crownIcon} size={14} weight="fill" /> : null}
                      {p.user_id === session?.user?.id ? <span className={styles.youTag}>you</span> : null}
                    </span>
                    <span className={p.ready ? styles.readyBadgeOn : styles.readyBadgeOff}>
                      {p.ready ? <CheckCircle size={16} weight="fill" /> : <Circle size={16} />}
                      {p.ready ? 'Ready' : 'Not ready'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.actions}>
              <Button variant={ready ? 'secondary' : 'primary'} fullWidth onClick={handleToggleReady}>
                {ready ? 'Cancel ready' : 'Ready up'}
              </Button>

              {isHost ? (
                <>
                  <Button fullWidth disabled={!canStart} loading={starting} onClick={handleStart}>
                    Start game
                  </Button>
                  {startHelperText ? <p className={styles.helperText}>{startHelperText}</p> : null}
                </>
              ) : null}
            </div>
          </div>
        )}

        {error ? (
          <div className={styles.errorBanner} role="alert">
            <WarningCircle size={18} weight="fill" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}
      </main>
    </div>
  );
}
