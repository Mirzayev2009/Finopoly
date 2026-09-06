import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ERA_BRIEFINGS } from '@estate/content/client';
import { useAuth } from '../context/AuthContext.jsx';
import { useHostConnection } from '../hooks/useHostConnection.js';
import { useRoomAction } from '../hooks/useRoomAction.js';
import { formatMoney, formatSignedMoney } from '../lib/money.js';
import PageLoader from '../components/PageLoader.jsx';
import TopBar from '../components/TopBar.jsx';
import ResolvePanel from '../components/turn/ResolvePanel.jsx';
import styles from './RoomHost.module.css';

const QUICK_TIMERS = [
  { label: '25:00 Research', seconds: 25 * 60 },
  { label: '1:00 Decision', seconds: 60 },
];
const QUICK_ADJUST = [100, 500, 1000, 5000];
const PHASES = ['lobby', 'briefing', 'research', 'playing', 'debrief'];

export default function RoomHost() {
  const { slug } = useParams();
  const { session, profile } = useAuth();
  const state = useHostConnection(slug, session?.access_token);
  const { busy, act } = useRoomAction(slug, session?.access_token);
  const [newSyndicateName, setNewSyndicateName] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showDanger, setShowDanger] = useState(false);
  const [eraSequenceDraft, setEraSequenceDraft] = useState([]);
  const [eraSequenceSeeded, setEraSequenceSeeded] = useState(false);
  const [startingCashDraft, setStartingCashDraft] = useState('');

  // Seed the two setup drafts from this room's own state once it first
  // arrives (the initial snapshot is async — a plain useState initializer
  // would run before it lands and never pick it up).
  useEffect(() => {
    if (!eraSequenceSeeded && state.game?.eraSequence?.length) {
      setEraSequenceDraft(state.game.eraSequence);
      setEraSequenceSeeded(true);
    }
  }, [state.game, eraSequenceSeeded]);

  // profile loads async and independently of state; until it lands we don't
  // yet know whether this caller is staff, so wait rather than bounce them.
  if (profile === null) return <PageLoader label="Checking access…" />;
  if (!['host', 'admin'].includes(profile.app_role)) return <Navigate to="/team" replace />;

  if (state.status === 'loading') return <PageLoader label="Loading host control…" />;
  if (state.status === 'error') return <div className={styles.error}>{state.error}</div>;

  const { game, room, syndicates, pendingTurn, transactions } = state;
  const era = ERA_BRIEFINGS.find((e) => e.id === game?.eraId);
  const turnSyndicate = syndicates[room.turnIndex] ?? null;
  // Game setup / reset are now room-scoped (blast radius = this room only),
  // so any host running their own room may use them, not just admins.
  const isHost = ['host', 'admin'].includes(profile?.app_role);

  function toggleEraInSequence(eraId) {
    setEraSequenceDraft((current) => (
      current.includes(eraId) ? current.filter((id) => id !== eraId) : [...current, eraId]
    ));
  }

  async function saveEraSequence() {
    await act('SET_ERA_SEQUENCE', { eraIds: eraSequenceDraft });
  }

  async function saveStartingCash() {
    const amount = Number(startingCashDraft);
    if (!amount || amount <= 0) return;
    if (await act('SET_STARTING_CASH', { amount })) setStartingCashDraft('');
  }

  return (
    <div className={styles.page}>
      <TopBar />
      <div className={styles.topBar}>
        <span className={styles.roomName}>{room.name}</span>
        <span className={styles.eraChip}>
          {game?.status === 'finished' ? 'Game complete' : era?.title ?? 'No era active'}
        </span>
        <button type="button" disabled={busy} onClick={() => act('SET_PHASE', { phase: 'briefing' })}>
          {room.phase}
        </button>
        <div className={styles.phaseGroup}>
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              className={room.phase === p ? styles.phaseActive : undefined}
              onClick={() => act('SET_PHASE', { phase: p })}
            >
              {p}
            </button>
          ))}
        </div>
        <div className={styles.timerGroup}>
          {QUICK_TIMERS.map((t) => (
            <button key={t.label} type="button" disabled={busy} onClick={() => act('START_TIMER', { seconds: t.seconds })}>
              {t.label}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => act('ADJUST_TIMER', { deltaSeconds: 60 })}>+1m</button>
          <button type="button" disabled={busy} onClick={() => act('ADJUST_TIMER', { deltaSeconds: -60 })}>-1m</button>
          <button type="button" disabled={busy} onClick={() => act('CLEAR_TIMER', {})}>Clear</button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => act('ADVANCE_ERA', {})}
        >
          Advance Era
        </button>
      </div>

      {isHost && game?.status === 'lobby' && (
        <section className={styles.setup}>
          <h2 className={styles.sectionTitle}>Game Setup (before start)</h2>
          <div className={styles.setupRow}>
            <span className={styles.turnLabel}>Starting cash</span>
            <span className={`${styles.turnLabel} money`}>currently {formatMoney(game.startingCash ?? 0)}</span>
            <input
              type="number"
              min={1}
              placeholder="New amount"
              value={startingCashDraft}
              onChange={(e) => setStartingCashDraft(e.target.value)}
            />
            <button type="button" disabled={busy || !startingCashDraft} onClick={saveStartingCash}>
              Set
            </button>
          </div>

          <div className={styles.setupRow}>
            <span className={styles.turnLabel}>Era sequence ({eraSequenceDraft.length} selected, click to toggle/order)</span>
          </div>
          <div className={styles.eraPicker}>
            {ERA_BRIEFINGS.map((e) => {
              const order = eraSequenceDraft.indexOf(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={order >= 0 ? styles.eraChipSelected : styles.eraChipOption}
                  onClick={() => toggleEraInSequence(e.id)}
                >
                  {order >= 0 && <span className={styles.eraOrder}>{order + 1}</span>}
                  {e.title}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={busy || eraSequenceDraft.length === 0} onClick={saveEraSequence}>
            Save Sequence
          </button>
        </section>
      )}

      <div className={styles.columns}>
        <section className={styles.left}>
          <h2 className={styles.sectionTitle}>Turn &amp; Board</h2>
          <div className={styles.turnRow}>
            <span className={styles.turnLabel}>Whose turn</span>
            <span className={styles.turnName} style={{ color: turnSyndicate?.color }}>
              {turnSyndicate?.name ?? '—'}
            </span>
          </div>
          <div className={styles.turnActions}>
            <button
              type="button"
              className={styles.rollButton}
              disabled={busy || Boolean(pendingTurn) || game?.status === 'finished'}
              onClick={() => act('ROLL', {})}
            >
              ROLL
            </button>
            <button type="button" disabled={busy} onClick={() => act('SKIP_TURN', {})}>
              Skip Turn
            </button>
          </div>

          {pendingTurn?.stage === 'awaiting_pick' && (
            <InvestmentPanel pendingTurn={pendingTurn} syndicate={turnSyndicate} busy={busy} onForceSubmit={(cardId, betAmount) => act('FORCE_SUBMIT', { cardId, betAmount })} />
          )}
          {pendingTurn?.stage === 'news' && (
            <NewsPanel pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={(targetId) => act('RESOLVE_NEWS', { targetId })} />
          )}
          {pendingTurn?.stage === 'corner' && (
            <CornerPanel pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={(targetId) => act('RESOLVE_CORNER', { targetId })} />
          )}
        </section>

        <section className={styles.right}>
          <h2 className={styles.sectionTitle}>Syndicates ({syndicates.length} / 8)</h2>
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSyndicateName.trim()) return;
              act('REGISTER_SYNDICATE', { name: newSyndicateName.trim() });
              setNewSyndicateName('');
            }}
          >
            <input value={newSyndicateName} onChange={(e) => setNewSyndicateName(e.target.value)} placeholder="Syndicate name" />
            <button type="submit" disabled={busy || syndicates.length >= 8}>Add</button>
          </form>

          {syndicates.map((s) => (
            <SyndicateRow key={s.id} syndicate={s} busy={busy} act={act} />
          ))}
        </section>
      </div>

      <section className={styles.transactions}>
        <h2 className={styles.sectionTitle}>Transaction History</h2>
        <table className={styles.txTable}>
          <thead>
            <tr><th>Time</th><th>Syndicate</th><th>Type</th><th>Note</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const syn = syndicates.find((s) => s.id === t.syndicateId);
              return (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleTimeString()}</td>
                  <td>{syn?.name ?? '—'}</td>
                  <td>{t.actionType}</td>
                  <td>{t.note}</td>
                  <td className={t.amount >= 0 ? styles.gain : styles.loss}>{formatSignedMoney(t.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {isHost && (
        <section className={styles.danger}>
          <button type="button" onClick={() => setShowDanger((v) => !v)}>Danger Zone</button>
          {showDanger && (
            <div className={styles.dangerPanel}>
              <input
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder='Type "RESET" to confirm'
              />
              <button
                type="button"
                disabled={resetConfirm !== 'RESET' || busy}
                onClick={() => {
                  act('RESET_ROOM', {});
                  setResetConfirm('');
                }}
              >
                Reset Room
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function InvestmentPanel({ pendingTurn, syndicate, busy, onForceSubmit }) {
  const [selected, setSelected] = useState(null);
  const [bet, setBet] = useState(0);
  const cash = syndicate?.cash ?? 0;

  return (
    <div className={styles.pendingPanel}>
      <h3 className={styles.pendingTitle}>Cards dealt — host view (percentages visible)</h3>
      <div className={styles.hostCards}>
        {pendingTurn.drawnCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`${styles.hostCard} ${selected === card.id ? styles.hostCardSelected : ''}`}
            onClick={() => setSelected(card.id)}
          >
            <span className={styles.cardType}>{card.assetType}</span>
            <span className={styles.cardName}>{card.name}</span>
            <span className={styles.cardReason}>{card.reason}</span>
            <span className={`${styles.cardPct} percentage`} style={{ color: card.percentage >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              {card.percentage >= 0 ? '+' : ''}{card.percentage}%
            </span>
          </button>
        ))}
      </div>
      <div className={styles.betRow}>
        <input
          type="number"
          min={0}
          max={cash}
          value={bet}
          onChange={(e) => setBet(Number(e.target.value))}
        />
        <button type="button" onClick={() => setBet(Math.floor(cash * 0.25))}>25%</button>
        <button type="button" onClick={() => setBet(Math.floor(cash * 0.5))}>50%</button>
        <button type="button" onClick={() => setBet(cash)}>All-in</button>
        <button
          type="button"
          disabled={busy || !selected || bet < 0 || bet > cash}
          onClick={() => onForceSubmit(selected, bet)}
        >
          Force Submit
        </button>
      </div>
    </div>
  );
}

function NewsPanel({ pendingTurn, syndicates, busy, onResolve }) {
  return (
    <div className={styles.pendingPanel}>
      <h3 className={styles.pendingTitle}>{pendingTurn.newsCard?.title ?? 'Market news'}</h3>
      <p className={styles.newsBody}>{pendingTurn.newsCard?.body}</p>
      <ResolvePanel kind="news" pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={onResolve} />
    </div>
  );
}

function CornerPanel({ pendingTurn, syndicates, busy, onResolve }) {
  return (
    <div className={styles.pendingPanel}>
      <h3 className={styles.pendingTitle}>{pendingTurn.cornerEvent?.replace(/_/g, ' ')}</h3>
      <ResolvePanel kind="corner" pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={onResolve} />
    </div>
  );
}

function SyndicateRow({ syndicate: s, busy, act }) {
  const [amount, setAmount] = useState(500);
  const [note, setNote] = useState('');
  const activeFlags = Object.entries(s.flags).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className={styles.syndicateRow}>
      <span className={styles.chip} style={{ background: s.color }} />
      <div className={styles.syndicateInfo}>
        <span className={styles.syndicateName}>{s.name}</span>
        <span className={`${styles.syndicateCash} money`}>{formatMoney(s.cash)}</span>
        <span className={styles.syndicatePosition}>pos {s.position}</span>
        <span className={styles.syndicateCode}>{s.joinCode}</span>
        {activeFlags.length > 0 && (
          <span className={styles.flags}>{activeFlags.join(', ')}</span>
        )}
      </div>
      <div className={styles.adjustGroup}>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        {QUICK_ADJUST.map((q) => (
          <button key={q} type="button" onClick={() => setAmount(q)}>{q}</button>
        ))}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="reason (shows in history)" />
        <button type="button" disabled={busy} onClick={() => act('ADJUST', { syndicateId: s.id, amount, note })}>Bonus</button>
        <button type="button" disabled={busy} onClick={() => act('ADJUST', { syndicateId: s.id, amount: -amount, note })}>Penalty</button>
      </div>
      <button type="button" disabled={busy} onClick={() => act('REMOVE_SYNDICATE', { id: s.id })}>Remove</button>
    </div>
  );
}
