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

const PHASES = ['lobby', 'briefing', 'research', 'playing', 'debrief'];

const ADJUSTMENT_TYPES = [
  { id: 'pass_start', label: 'Pass Start (+)', sign: 1 },
  { id: 'casino_win', label: 'Casino Win (+)', sign: 1 },
  { id: 'casino_loss', label: 'Casino Loss (-)', sign: -1 },
  { id: 'manual_penalty', label: 'Manual Penalty (-)', sign: -1 },
  { id: 'manual_bonus', label: 'Manual Bonus (+)', sign: 1 },
];

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

  // Manual Adjustments panel state
  const [adjustTarget, setAdjustTarget] = useState('');
  const [adjustType, setAdjustType] = useState('manual_penalty');
  const [adjustAmount, setAdjustAmount] = useState(300);

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

  async function executeAdjustment() {
    if (!adjustTarget || !adjustAmount) return;
    const typeInfo = ADJUSTMENT_TYPES.find((t) => t.id === adjustType);
    const signedAmount = Math.abs(adjustAmount) * typeInfo.sign;
    const note = typeInfo.label;
    await act('ADJUST', { syndicateId: adjustTarget, amount: signedAmount, note });
  }

  return (
    <div className={styles.page}>
      <TopBar />

      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>⚙ Host Control Panel</h1>
        <p className={styles.pageSubtitle}>Manage room {room.name} and manual overrides</p>
      </div>

      {/* ── Phase selector ── */}
      <div className={styles.phaseBar}>
        <span className={styles.phaseLabel}>Phase</span>
        <div className={styles.phaseGroup}>
          {PHASES.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              className={`${styles.phaseBtn} ${room.phase === p ? styles.phaseBtnActive : ''}`}
              onClick={() => act('SET_PHASE', { phase: p })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── New Game danger section ── */}
      {isHost && (
        <section className={styles.dangerSection}>
          <div className={styles.dangerInfo}>
            <span className={styles.dangerIcon}>⚠</span>
            <div>
              <span className={styles.dangerTitle}>New Game</span>
              <span className={styles.dangerDesc}>Clears all teams, rooms, and transactions — start fresh.</span>
            </div>
          </div>
          <button type="button" className={styles.newGameBtn} onClick={() => setShowDanger((v) => !v)}>
            ↺ New Game
          </button>
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
                className={styles.resetBtn}
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

      {/* ── Game Setup (pre-start) ── */}
      {isHost && game?.status === 'lobby' && (
        <section className={styles.setupSection}>
          <h2 className={styles.sectionTitle}>Game Setup (before start)</h2>
          <div className={styles.setupRow}>
            <span className={styles.setupLabel}>Starting cash</span>
            <span className={`${styles.setupLabel} money`}>currently {formatMoney(game.startingCash ?? 0)}</span>
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
            <span className={styles.setupLabel}>Era sequence ({eraSequenceDraft.length} selected, click to toggle/order)</span>
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

      {/* ── Two-column layout ── */}
      <div className={styles.columns}>
        {/* LEFT: Room Setup — Era, Roll, Teams */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>👥 Room Setup</h2>
            <span className={styles.teamCount}>{syndicates.length} / 8 Teams</span>
          </div>
          <div className={styles.cardDivider} />

          {/* Active Era & Turn Controls */}
          <div className={styles.eraBlock}>
            <div className={styles.eraInfo}>
              <span className={styles.eraLabel}>Active Era</span>
              <span className={styles.eraName}>
                {game?.status === 'finished' ? 'Game complete' : era?.title ?? 'No era active'}
              </span>
            </div>
            <button
              type="button"
              className={styles.forceAdvanceBtn}
              disabled={busy}
              onClick={() => act('ADVANCE_ERA', {})}
            >
              Force Advance Era
            </button>
          </div>

          <div className={styles.turnActions}>
            <span className={styles.turnLabel}>
              Whose turn: <strong style={{ color: turnSyndicate?.color }}>{turnSyndicate?.name ?? '—'}</strong>
            </span>
            <div className={styles.turnBtns}>
              <button
                type="button"
                className={styles.rollButton}
                disabled={busy || Boolean(pendingTurn) || game?.status === 'finished'}
                onClick={() => act('ROLL', {})}
              >
                ROLL
              </button>
              <button
                type="button"
                className={styles.skipTurnBtn}
                disabled={busy}
                onClick={() => act('SKIP_TURN', {})}
              >
                Skip Turn
              </button>
            </div>
          </div>

          {/* Pending turn panels */}
          {pendingTurn?.stage === 'awaiting_pick' && (
            <InvestmentPanel pendingTurn={pendingTurn} syndicate={turnSyndicate} busy={busy} onForceSubmit={(cardId, betAmount) => act('FORCE_SUBMIT', { cardId, betAmount })} />
          )}
          {pendingTurn?.stage === 'news' && (
            <NewsPanel pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={(targetId) => act('RESOLVE_NEWS', { targetId })} />
          )}
          {pendingTurn?.stage === 'corner' && (
            <CornerPanel pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={(targetId) => act('RESOLVE_CORNER', { targetId })} />
          )}

          <div className={styles.cardDivider} />

          {/* Add Team */}
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSyndicateName.trim()) return;
              act('REGISTER_SYNDICATE', { name: newSyndicateName.trim() });
              setNewSyndicateName('');
            }}
          >
            <span className={styles.addLabel}>Add New Team</span>
            <div className={styles.addFields}>
              <input value={newSyndicateName} onChange={(e) => setNewSyndicateName(e.target.value)} placeholder="Enter team name..." />
              <button type="submit" className={styles.addBtn} disabled={busy || syndicates.length >= 8}>+ Add</button>
            </div>
          </form>

          {/* Team list */}
          {syndicates.map((s) => (
            <TeamRow key={s.id} syndicate={s} busy={busy} act={act} />
          ))}
        </section>

        {/* RIGHT: Manual Adjustments */}
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>⊕ Manual Adjustments</h2>
          <div className={styles.cardDivider} />

          <div className={styles.adjustField}>
            <label className={styles.adjustLabel}>Target Team</label>
            <select
              className={styles.adjustSelect}
              value={adjustTarget}
              onChange={(e) => setAdjustTarget(e.target.value)}
            >
              <option value="">-- Select a Team --</option>
              {syndicates.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.adjustField}>
            <label className={styles.adjustLabel}>Action &amp; Amount</label>
            <div className={styles.adjustRow}>
              <select
                className={styles.adjustSelect}
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <div className={styles.amountInput}>
                <span className={styles.currencySign}>$</span>
                <input
                  type="number"
                  min={0}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.executeBtn}
            disabled={busy || !adjustTarget || !adjustAmount}
            onClick={executeAdjustment}
          >
            Execute Adjustment
          </button>
        </section>
      </div>

      {/* ── Transaction History ── */}
      <section className={styles.txSection}>
        <div className={styles.txHeader}>
          <h2 className={styles.sectionTitle}>🕐 Transaction History</h2>
          <span className={styles.txSubtitle}>Latest Events</span>
        </div>
        <div className={styles.cardDivider} />
        {transactions.length === 0 ? (
          <p className={styles.txEmpty}>No transactions recorded yet.</p>
        ) : (
          <table className={styles.txTable}>
            <thead>
              <tr><th>Time</th><th>Team</th><th>Type</th><th>Note</th><th>Amount</th></tr>
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
        )}
      </section>
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

function TeamRow({ syndicate: s, busy, act }) {
  const activeFlags = Object.entries(s.flags).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className={styles.teamRow}>
      <span className={styles.chip} style={{ background: s.color }} />
      <div className={styles.teamInfo}>
        <span className={styles.teamName}>{s.name}</span>
        <span className={`${styles.teamCash} money`}>{formatMoney(s.cash)}</span>
        <span className={styles.teamPosition}>pos {s.position}</span>
        {activeFlags.length > 0 && (
          <span className={styles.flags}>{activeFlags.join(', ')}</span>
        )}
      </div>
      <button type="button" className={styles.removeBtn} disabled={busy} onClick={() => act('REMOVE_SYNDICATE', { id: s.id })}>✕</button>
    </div>
  );
}
