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

function CenterIdle({ era, turnSyndicate, pendingTurn, isHost, busy, onRoll, onSkip }) {
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
      {pendingTurn?.dice && (
        <div className={styles.dice}>
          <span className={`${styles.die} dice`}>{pendingTurn.dice[0]}</span>
          <span className={`${styles.die} dice`}>{pendingTurn.dice[1]}</span>
        </div>
      )}
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
      {pendingTurn.drawnCards.map((card) => (
        <div key={card.id} className={styles.card}>
          <span className={styles.cardType}>{card.assetType}</span>
          <span className={styles.cardName}>{card.name}</span>
          <span className={styles.cardReason}>{card.reason}</span>
          <div className={styles.cardFlap}>?</div>
        </div>
      ))}
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
  const { busy, act } = useRoomAction(slug, session?.access_token);
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
      <div className={styles.board}>
        {BOARD.map((space) => (
          <BoardSpace key={space.id} space={space} tokens={tokensByPosition.get(space.id) ?? []} />
        ))}
        <div className={styles.center}>
          {game?.status === 'finished' && <CenterFinished />}
          {game?.status !== 'finished' && !pendingTurn && (
            <CenterIdle
              era={era}
              turnSyndicate={turnSyndicate}
              pendingTurn={pendingTurn}
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
