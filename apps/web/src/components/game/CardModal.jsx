import { useState } from 'react';
import { Newspaper } from '@phosphor-icons/react';
import { CARDS, SECTORS } from '@estate/content';
import { sectorIcon } from '../../lib/sectorIcons.js';
import Button from '../Button.jsx';
import styles from './CardModal.module.css';

const NEEDS_CHOICE = new Set(['DOUBLE_ONE_SECTOR', 'HALVE_ONE_SECTOR']);

/**
 * @param {{ pendingCard: { cardId: string }, onResolve: (choice?: string) => void, resolving: boolean }} props
 */
export default function CardModal({ pendingCard, onResolve, resolving }) {
  const [choice, setChoice] = useState('');
  const card = CARDS.find((c) => c.id === pendingCard.cardId);
  if (!card) return null;

  const needsChoice = NEEDS_CHOICE.has(card.effect.kind) || (card.effect.kind === 'REVEAL_SECTOR' && !card.effect.sectorId);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="card-modal-title">
      <div className={styles.modal}>
        <div className={styles.titleRow}>
          <Newspaper size={22} weight="fill" className={styles.titleIcon} aria-hidden="true" />
          <h2 id="card-modal-title" className={styles.title}>
            {card.title}
          </h2>
        </div>
        <p className={styles.text}>{card.text}</p>

        {needsChoice ? (
          <div className={styles.choiceGrid}>
            {SECTORS.map((sector) => {
              const Icon = sectorIcon(sector.id);
              return (
                <button
                  key={sector.id}
                  type="button"
                  className={choice === sector.id ? `${styles.choice} ${styles.choiceSelected}` : styles.choice}
                  onClick={() => setChoice(sector.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {sector.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <Button
          fullWidth
          loading={resolving}
          disabled={needsChoice && !choice}
          onClick={() => onResolve(needsChoice ? choice : undefined)}
        >
          Resolve
        </Button>
      </div>
    </div>
  );
}
