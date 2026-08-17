import { useState } from 'react';
import { CurrencyDollar, House, Key, Lock, SkipForward, WarningCircle, X } from '@phosphor-icons/react';
import { BOARD } from '@estate/board';
import Button from '../Button.jsx';
import * as actionTypes from '../../lib/actionTypes.js';
import styles from './Controls.module.css';

/**
 * Renders only the buttons legal in the current phase. Every button stays
 * disabled unless it's genuinely this player's turn and no animation is
 * draining — nothing here computes game rules, it just reflects
 * server-authoritative `state`.
 */
export default function Controls({ state, currentUserId, onSubmit, isAnimating, highlightMode, onHighlightModeChange }) {
  const [confirmingBankrupt, setConfirmingBankrupt] = useState(false);
  const isMyTurn = state.turn.playerId === currentUserId;
  const disabled = !isMyTurn || isAnimating;
  const me = state.players.find((p) => p.id === currentUserId);

  function toggleHighlight(mode) {
    onHighlightModeChange(highlightMode === mode ? null : mode);
  }

  if (state.phase === 'GAME_OVER') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className={styles.controls}>
        <p className={styles.gameOver}>{winner ? `${winner.name} wins the game.` : 'Game over.'}</p>
      </div>
    );
  }

  if (!isMyTurn) {
    const waitingFor = state.players.find((p) => p.id === state.turn.playerId);
    return (
      <div className={styles.controls}>
        <p className={styles.waiting}>Waiting for {waitingFor?.name ?? 'the other player'}...</p>
      </div>
    );
  }

  if (state.phase === 'ROLL') {
    if (me?.inJail) {
      return (
        <div className={styles.controls}>
          <div className={styles.row}>
            <Button
              variant="secondary"
              size="sm"
              icon={CurrencyDollar}
              disabled={disabled}
              onClick={() => onSubmit(actionTypes.PAY_JAIL_FINE, {})}
            >
              Pay $50 fine
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Key}
              disabled={disabled || !me.jailCards}
              onClick={() => onSubmit(actionTypes.USE_JAIL_CARD, {})}
            >
              Use jail card
            </Button>
          </div>
          <Button fullWidth disabled={disabled} onClick={() => onSubmit(actionTypes.ROLL, {})}>
            Roll
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.controls}>
        <Button fullWidth disabled={disabled} onClick={() => onSubmit(actionTypes.ROLL, {})}>
          Roll
        </Button>
      </div>
    );
  }

  if (state.phase === 'AWAIT_BUY') {
    const space = me ? BOARD[me.position] : null;
    return (
      <div className={styles.controls}>
        <Button fullWidth disabled={disabled} onClick={() => onSubmit(actionTypes.BUY, {})}>
          Buy {space ? `$${space.price}` : ''}
        </Button>
        <Button fullWidth variant="secondary" disabled={disabled} onClick={() => onSubmit(actionTypes.DECLINE, {})}>
          Decline
        </Button>
      </div>
    );
  }

  if (state.phase === 'MANAGE') {
    return (
      <div className={styles.controls}>
        <div className={styles.row}>
          <Button
            variant={highlightMode === 'build' ? 'primary' : 'secondary'}
            size="sm"
            icon={House}
            disabled={disabled}
            onClick={() => toggleHighlight('build')}
          >
            Build
          </Button>
          <Button
            variant={highlightMode === 'mortgage' ? 'primary' : 'secondary'}
            size="sm"
            icon={Lock}
            disabled={disabled}
            onClick={() => toggleHighlight('mortgage')}
          >
            Mortgage
          </Button>
        </div>
        {highlightMode ? <p className={styles.hint}>Click a highlighted property on the board.</p> : null}
        <Button fullWidth icon={SkipForward} disabled={disabled} onClick={() => onSubmit(actionTypes.END_TURN, {})}>
          End turn
        </Button>
      </div>
    );
  }

  if (state.phase === 'DEBT') {
    const amount = state.debt?.amount ?? 0;
    const canPay = (me?.cash ?? 0) >= amount;

    return (
      <div className={styles.controls}>
        <div className={styles.row}>
          <Button
            variant={highlightMode === 'sell' ? 'primary' : 'secondary'}
            size="sm"
            icon={House}
            disabled={disabled}
            onClick={() => toggleHighlight('sell')}
          >
            Sell house
          </Button>
          <Button
            variant={highlightMode === 'mortgage' ? 'primary' : 'secondary'}
            size="sm"
            icon={Lock}
            disabled={disabled}
            onClick={() => toggleHighlight('mortgage')}
          >
            Mortgage
          </Button>
        </div>
        {highlightMode ? <p className={styles.hint}>Click a highlighted property on the board.</p> : null}

        <Button
          fullWidth
          icon={CurrencyDollar}
          disabled={disabled || !canPay}
          onClick={() => onSubmit(actionTypes.RESOLVE_DEBT, {})}
        >
          Pay ${amount}
        </Button>

        {confirmingBankrupt ? (
          <div className={styles.row}>
            <Button fullWidth variant="danger" disabled={disabled} onClick={() => onSubmit(actionTypes.BANKRUPT, {})}>
              Confirm bankruptcy
            </Button>
            <Button variant="ghost" size="sm" icon={X} onClick={() => setConfirmingBankrupt(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            fullWidth
            variant="danger"
            icon={WarningCircle}
            disabled={disabled}
            onClick={() => setConfirmingBankrupt(true)}
          >
            Declare bankruptcy
          </Button>
        )}
      </div>
    );
  }

  return null;
}
