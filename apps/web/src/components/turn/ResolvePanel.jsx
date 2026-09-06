import { useState } from 'react';
import styles from './ResolvePanel.module.css';

// The one place the "does this event need a target syndicate" rule lives —
// every caller passes `kind` + `pendingTurn` instead of pre-computing this,
// so a future new `needs` value only has to change here.
function computeNeedsTarget(kind, pendingTurn) {
  if (kind === 'news') {
    return pendingTurn.newsCard?.needs === 'target' || pendingTurn.newsCard?.needs === 'target+coin';
  }
  return pendingTurn.cornerEvent === 'CORPORATE_BUYOUT';
}

/**
 * The interactive target-picker + Resolve button shared by news/corner-event
 * resolution on both Host Control and the Board — each page renders its own
 * title/body display around this, so nothing renders twice.
 * @param {{ kind: 'news'|'corner', pendingTurn: object, syndicates: Array<object>, busy: boolean, onResolve: (targetId?: string) => void }} props
 */
export default function ResolvePanel({ kind, pendingTurn, syndicates, busy, onResolve }) {
  const [target, setTarget] = useState('');
  const needsTarget = computeNeedsTarget(kind, pendingTurn);

  return (
    <div className={styles.resolveRow}>
      {needsTarget && (
        <select className={styles.select} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose a target…</option>
          {syndicates.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        className={styles.resolveButton}
        disabled={busy || (needsTarget && !target)}
        onClick={() => onResolve(target || undefined)}
      >
        Resolve
      </button>
    </div>
  );
}
