import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BOARD, ERA_BRIEFINGS } from '@estate/content/client';
import { useAuth } from '../context/AuthContext.jsx';
import { useRoomConnection } from '../hooks/useRoomConnection.js';
import { useRoomAction } from '../hooks/useRoomAction.js';
import { useCountdown, formatCountdown } from '../hooks/useCountdown.js';
import { getGridPosition } from '../lib/boardGeometry.js';
import { formatMoney, formatSignedMoney } from '../lib/money.js';
import PageLoader from '../components/PageLoader.jsx';
import ResolvePanel from '../components/turn/ResolvePanel.jsx';
import styles from './RoomBoard.module.css';

const GROUP_VAR = (group) => `var(--group-${group}, var(--border-hi))`;

function BoardSpace({ space, tokens }) {
  const { row, col } = getGridPosition(space.id);
  const style = { gridRow: row + 1, gridColumn: col + 1 };

  if (space.type === 'corner') {
    return (
      <div className={styles.corner} style={style}>
        <span>{space.name}</span>
      </div>
    );
  }
  if (space.type === 'market_news') {
    return (
      <div className={styles.newsSpace} style={style}>
        <span aria-hidden="true">?</span>
      </div>
    );
  }
  return (
    <div className={styles.assetSpace} style={{ ...style, '--group-color': GROUP_VAR(space.group) }}>
      <div className={styles.groupBar} />
      {tokens.length > 0 && (
        <div className={styles.tokenGrid}>
          {tokens.map((s) => (
            <div key={s.id} className={styles.token} style={{ background: s.color }} title={s.name}>
              {s.name.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CenterFinished() {
  return (
    <div className={styles.centerIdle}>
      <span className={styles.turnSyndicate}>Game complete</span>
    </div>
  );
}

// Classic 3x3 pip layout per face, numbered 1-9 left-to-right/top-to-bottom.
const PIP_LAYOUT = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function Die({ value, rolling }) {
  const lit = PIP_LAYOUT[value] ?? [];
  return (
    <div className={`${styles.die} ${rolling ? styles.dieRolling : styles.dieSettled}`}>
      <div className={styles.pipGrid}>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={lit.includes(i + 1) ? styles.pip : styles.pipEmpty} />
        ))}
      </div>
    </div>
  );
}

// Shared by every stage below that has a resolved roll to show — CenterIdle
// never renders one (it's only mounted while pendingTurn is null, i.e.
// before a roll), so this is the only place dice are ever visible.
//
// The server resolves a roll atomically (dice + landing square land in the
// same pending_turns row, no separate "in progress" tick to watch), so
// there's nothing to poll mid-roll. Instead, the instant a new roll's result
// arrives, briefly cycle random faces before settling on the real one — this
// plays the same way on every screen watching the board, not just whichever
// device tapped Roll.
function DiceReadout({ dice, rollId }) {
  const [shownDice, setShownDice] = useState(dice);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (!dice) return undefined;
    setRolling(true);
    const tumble = setInterval(() => {
      setShownDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, 80);
    const settle = setTimeout(() => {
      clearInterval(tumble);
      setShownDice(dice);
      setRolling(false);
    }, 650);
    return () => {
      clearInterval(tumble);
      clearTimeout(settle);
    };
    // Re-runs only when a genuinely new roll lands, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  if (!dice) return null;
  return (
    <div className={styles.dice}>
      <Die value={shownDice?.[0] ?? dice[0]} rolling={rolling} />
      <Die value={shownDice?.[1] ?? dice[1]} rolling={rolling} />
    </div>
  );
}

function CenterIdle({ era, turnSyndicate, isHost, busy, onRoll, onSkip }) {
  return (
    <div className={styles.centerIdle}>
      {era && (
        <div className={styles.eraHeader}>
          <span className={styles.eraTitle}>{era.title}</span>
          <span className={styles.eraYears}>{era.years}</span>
        </div>
      )}
      <span className={styles.turnLabel}>CURRENT TURN</span>
      <span className={styles.turnSyndicate} style={{ color: turnSyndicate?.color }}>
        {turnSyndicate?.name ?? '—'}
      </span>
      {isHost && (
        <div className={styles.hostControls}>
          <button type="button" className={styles.rollButton} disabled={busy} onClick={onRoll}>
            ROLL
          </button>
          <button type="button" className={styles.skipButton} disabled={busy} onClick={onSkip}>
            Skip Turn
          </button>
        </div>
      )}
    </div>
  );
}

function CenterCards({ pendingTurn }) {
  return (
    <div className={styles.centerCards}>
      <div className={styles.centerCardsRow}>
        {pendingTurn.drawnCards.map((card) => (
          <div key={card.id} className={styles.card}>
            <span className={styles.cardType}>{card.assetType}</span>
            <span className={styles.cardName}>{card.name}</span>
            <span className={styles.cardReason}>{card.reason}</span>
            <div className={styles.cardFlap}>?</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CenterNews({ pendingTurn, isHost, syndicates, busy, onResolve }) {
  return (
    <div className={styles.centerNews}>
      <span className={styles.newsGlyph} aria-hidden="true">?</span>
      {pendingTurn.newsCard && (
        <>
          <span className={styles.newsTitle}>{pendingTurn.newsCard.title}</span>
          <p className={styles.newsBody}>{pendingTurn.newsCard.body}</p>
        </>
      )}
      {isHost && (
        <ResolvePanel kind="news" pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={onResolve} />
      )}
    </div>
  );
}

function CenterCorner({ pendingTurn, isHost, syndicates, busy, onResolve }) {
  return (
    <div className={styles.centerCorner}>
      <span className={styles.newsGlyph} aria-hidden="true">!</span>
      <span className={styles.newsTitle}>{pendingTurn.cornerEvent?.replace(/_/g, ' ')}</span>
      {isHost && (
        <ResolvePanel kind="corner" pendingTurn={pendingTurn} syndicates={syndicates} busy={busy} onResolve={onResolve} />
      )}
    </div>
  );
}

export default function RoomBoard() {
  const { slug } = useParams();
  const { session, profile } = useAuth();
  const state = useRoomConnection(slug, session?.access_token);
  const { busy, error, clearError, act } = useRoomAction(slug, session?.access_token);
  const isHost = ['host', 'admin'].includes(profile?.app_role);

  // Pending-turn decisions (60-90s to force-submit/resolve) take priority
  // over the room's own research-phase timer when both happen to be set.
  const deadline = state.pendingTurn?.decisionDeadline ?? state.room?.timerDeadline ?? null;
  const remainingMs = useCountdown(deadline);

  if (state.status === 'loading') return <PageLoader label="Loading board…" />;
  if (state.status === 'error') return <div className={styles.error}>{state.error}</div>;

  const { game, room, syndicates, pendingTurn, transactions } = state;
  const era = ERA_BRIEFINGS.find((e) => e.id === game?.eraId);
  const turnSyndicate = syndicates[room.turnIndex] ?? null;
  const tokensByPosition = new Map();
  for (const s of syndicates) {
    if (!tokensByPosition.has(s.position)) tokensByPosition.set(s.position, []);
    tokensByPosition.get(s.position).push(s);
  }

  const ranked = [...syndicates].sort((a, b) => b.cash - a.cash);

  return (
    <div className={styles.page}>
      {isHost && (
        <a className={styles.hostLink} href={`/room/${slug}/host`} target="_blank" rel="noreferrer">
          Host Settings ↗
        </a>
      )}
      {error && (
        <div className={styles.actionError}>
          <span>{error}</span>
          <button type="button" className={styles.actionErrorDismiss} onClick={clearError}>×</button>
        </div>
      )}
      <div className={styles.board}>
        {BOARD.map((space) => (
          <BoardSpace key={space.id} space={space} tokens={tokensByPosition.get(space.id) ?? []} />
        ))}
        <div className={styles.center}>
          {pendingTurn && <DiceReadout dice={pendingTurn.dice} rollId={pendingTurn.id} />}
          {game?.status === 'finished' && <CenterFinished />}
          {game?.status !== 'finished' && !pendingTurn && (
            <CenterIdle
              era={era}
              turnSyndicate={turnSyndicate}
              isHost={isHost}
              busy={busy}
              onRoll={() => act('ROLL', {})}
              onSkip={() => act('SKIP_TURN', {})}
            />
          )}
          {pendingTurn?.stage === 'awaiting_pick' && <CenterCards pendingTurn={pendingTurn} />}
          {pendingTurn?.stage === 'news' && (
            <CenterNews
              pendingTurn={pendingTurn}
              isHost={isHost}
              syndicates={syndicates}
              busy={busy}
              onResolve={(targetId) => act('RESOLVE_NEWS', { targetId })}
            />
          )}
          {pendingTurn?.stage === 'corner' && (
            <CenterCorner
              pendingTurn={pendingTurn}
              isHost={isHost}
              syndicates={syndicates}
              busy={busy}
              onResolve={(targetId) => act('RESOLVE_CORNER', { targetId })}
            />
          )}
        </div>
      </div>

      <div className={styles.rail}>
        {deadline && (
          <div className={`${styles.timerBlock} ${remainingMs < 10000 ? styles.timerUrgent : ''}`}>
            <span className={`${styles.timerValue} timer`}>{formatCountdown(remainingMs)}</span>
          </div>
        )}

        <div className={styles.standings}>
          {ranked.map((s, i) => (
            <div key={s.id} className={styles.standingRow}>
              <span className={styles.rank}>{i + 1}</span>
              <span className={styles.chip} style={{ background: s.color }} />
              <span className={styles.name}>{s.name}</span>
              <span className={`${styles.cash} money`}>{formatMoney(s.cash)}</span>
            </div>
          ))}
        </div>

        <div className={styles.transactions}>
          {transactions.map((t) => {
            const syn = syndicates.find((s) => s.id === t.syndicateId);
            return (
              <div key={t.id} className={styles.txRow}>
                <span className={styles.txChip} style={{ background: syn?.color }} />
                <span className={styles.txNote}>{syn?.name ?? '—'} · {t.note || t.actionType}</span>
                <span className={`${styles.txAmount} ${t.amount >= 0 ? styles.gain : styles.loss} money`}>
                  {formatSignedMoney(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
