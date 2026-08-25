import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, SlidersHorizontal, DeviceMobile } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchRoomList } from '../lib/roomActions.js';
import TopBar from '../components/TopBar.jsx';
import styles from './Select.module.css';

const SURFACES = [
  { id: 'board', label: 'Projector Board', description: 'Read-only display for the classroom projector', icon: Monitor },
  { id: 'host', label: 'Host Control', description: 'Run the room: roll, resolve turns, adjust cash', icon: SlidersHorizontal, requiresHost: true },
  { id: 'play', label: 'Team Play', description: 'Join a syndicate with your team’s join code', icon: DeviceMobile, noRoom: true },
];

export default function Select() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [surface, setSurface] = useState('board');
  const [roomSlug, setRoomSlug] = useState('');

  const isHost = profile?.app_role === 'host' || profile?.app_role === 'admin';

  useEffect(() => {
    if (!session?.access_token) return;
    fetchRoomList(session.access_token)
      .then((list) => {
        setRooms(list);
        if (list.length > 0) setRoomSlug(list[0].slug);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const selectedSurface = SURFACES.find((s) => s.id === surface);

  function handleContinue() {
    if (surface === 'play') {
      navigate('/join');
      return;
    }
    if (!roomSlug) return;
    navigate(`/room/${roomSlug}/${surface}`);
  }

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.center}>
        <div className={styles.panel}>
          <h1 className={styles.heading}>Market Masters</h1>
          <p className={styles.subheading}>Choose a view and a room to enter.</p>

          <div className={styles.segmented} role="radiogroup" aria-label="Surface">
            {SURFACES.map(({ id, label, description, icon: Icon, requiresHost }) => {
              const disabled = requiresHost && !isHost;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={surface === id}
                  disabled={disabled}
                  onClick={() => setSurface(id)}
                  className={`${styles.option} ${surface === id ? styles.optionSelected : ''} ${disabled ? styles.optionDisabled : ''}`}
                >
                  <Icon size={22} weight="bold" aria-hidden="true" />
                  <span className={styles.optionText}>
                    <span className={styles.optionLabel}>{label}</span>
                    <span className={styles.optionDescription}>
                      {disabled ? 'Requires host access' : description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSurface?.noRoom ? null : loading ? (
            <p className={styles.subheading}>Loading rooms&hellip;</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : rooms.length === 0 ? (
            <p className={styles.subheading}>No rooms configured yet.</p>
          ) : (
            <select
              className={styles.roomSelect}
              value={roomSlug}
              onChange={(e) => setRoomSlug(e.target.value)}
              aria-label="Room"
            >
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            disabled={(!selectedSurface?.noRoom && !roomSlug) || (surface === 'host' && !isHost)}
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
