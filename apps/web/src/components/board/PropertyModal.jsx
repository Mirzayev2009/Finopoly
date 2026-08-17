import { useEffect } from 'react';
import { House, Lock, LockOpen, X } from '@phosphor-icons/react';
import { BOARD } from '@estate/board';
import Button from '../Button.jsx';
import { getPlayerColor } from '../../lib/playerColors.js';
import * as actionTypes from '../../lib/actionTypes.js';
import { COLOR_MAP } from './colorMap.js';
import styles from './PropertyModal.module.css';

export default function PropertyModal({ spaceId, state, currentUserId, onSubmit, onClose, disabled }) {
  const space = BOARD[spaceId];
  const ownership = state.ownership[spaceId] ?? null;
  const isOwner = ownership?.owner === currentUserId;
  const isMyTurn = state.turn.playerId === currentUserId;
  const canManage = isOwner && isMyTurn && (state.phase === 'MANAGE' || state.phase === 'DEBT');

  const groupIds = space.type === 'property' ? BOARD.filter((s) => s.color === space.color).map((s) => s.id) : [];
  const ownsMonopoly =
    ownership != null && groupIds.length > 0 && groupIds.every((id) => state.ownership[id]?.owner === ownership.owner);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function submit(type, payload) {
    onSubmit(type, payload);
  }

  const owner = ownership ? state.players.find((p) => p.id === ownership.owner) : null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={space.name}>
        <div className={styles.header}>
          <h2 className={styles.title}>{space.name}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {space.color ? <span className={styles.colorSwatch} style={{ background: COLOR_MAP[space.color] }} /> : null}

        <p className={styles.ownerLine}>
          {ownership ? (
            <>
              <span className={styles.ownerDot} style={{ background: getPlayerColor(state, ownership.owner) }} />
              Owned by {owner?.name ?? 'unknown'}
              {ownership.mortgaged ? ' — mortgaged' : ''}
            </>
          ) : (
            'Unowned'
          )}
        </p>

        {space.type === 'property' ? (
          <table className={styles.rentTable}>
            <tbody>
              <tr className={ownership?.houses === 0 ? styles.activeRow : undefined}>
                <td>Base rent</td>
                <td className={styles.amount}>
                  ${space.rent[0]}
                  {ownsMonopoly && ownership?.houses === 0 ? ' (x2, monopoly)' : ''}
                </td>
              </tr>
              {[1, 2, 3, 4].map((n) => (
                <tr key={n} className={ownership?.houses === n ? styles.activeRow : undefined}>
                  <td>
                    {n} house{n > 1 ? 's' : ''}
                  </td>
                  <td className={styles.amount}>${space.rent[n]}</td>
                </tr>
              ))}
              <tr className={ownership?.houses === 5 ? styles.activeRow : undefined}>
                <td>Hotel</td>
                <td className={styles.amount}>${space.rent[5]}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className={styles.rentTable}>
            <tbody>
              {space.rent.map((amount, i) => (
                <tr key={i}>
                  <td>{space.type === 'railroad' ? `${i + 1} owned` : i === 0 ? '1 owned' : 'Both owned'}</td>
                  <td className={styles.amount}>{space.type === 'utility' ? `${amount}x dice` : `$${amount}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canManage ? (
          <div className={styles.actions}>
            {space.type === 'property' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={House}
                  disabled={disabled}
                  onClick={() => submit(actionTypes.BUILD_HOUSE, { spaceId })}
                >
                  Build house
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={House}
                  disabled={disabled || !ownership.houses}
                  onClick={() => submit(actionTypes.SELL_HOUSE, { spaceId })}
                >
                  Sell house
                </Button>
              </>
            ) : null}
            {ownership.mortgaged ? (
              <Button
                variant="secondary"
                size="sm"
                icon={LockOpen}
                disabled={disabled}
                onClick={() => submit(actionTypes.UNMORTGAGE, { spaceId })}
              >
                Unmortgage (${Math.round(space.mortgage * 1.1)})
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                icon={Lock}
                disabled={disabled}
                onClick={() => submit(actionTypes.MORTGAGE, { spaceId })}
              >
                Mortgage (+${space.mortgage})
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
