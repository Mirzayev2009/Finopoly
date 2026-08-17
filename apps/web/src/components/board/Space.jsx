import { House, Lock } from '@phosphor-icons/react';
import { getGridPosition } from '../../lib/gridPosition.js';
import { getPlayerColor } from '../../lib/playerColors.js';
import { COLOR_MAP } from './colorMap.js';
import PlayerTokens from './PlayerTokens.jsx';
import styles from './Space.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function edgeForPosition(row, col) {
  if (row === 10) return 'bottom';
  if (row === 0) return 'top';
  if (col === 0) return 'left';
  return 'right';
}

const CORNER_IDS = new Set([0, 10, 20, 30]);
const PURCHASABLE_TYPES = new Set(['property', 'railroad', 'utility']);

export default function Space({ space, state, ownership, playersHere, onClick, highlighted }) {
  const { row, col } = getGridPosition(space.id);
  const edge = edgeForPosition(row, col);
  const isCorner = CORNER_IDS.has(space.id);
  const isPurchasable = PURCHASABLE_TYPES.has(space.type);
  const barColor = space.type === 'property' ? COLOR_MAP[space.color] : null;
  const Tag = isPurchasable ? 'button' : 'div';

  return (
    <Tag
      type={isPurchasable ? 'button' : undefined}
      className={cx(
        styles.space,
        styles[edge],
        isCorner && styles.corner,
        isPurchasable && styles.purchasable,
        highlighted && styles.highlighted,
      )}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
      onClick={isPurchasable ? onClick : undefined}
    >
      {barColor ? <span className={styles.colorBar} style={{ background: barColor }} aria-hidden="true" /> : null}

      <span className={styles.name}>{space.name ?? space.type}</span>

      {space.price != null ? <span className={styles.price}>${space.price}</span> : null}

      {ownership ? (
        <span className={styles.ownerRow}>
          <span
            className={styles.ownerDot}
            style={{ background: getPlayerColor(state, ownership.owner) }}
            aria-hidden="true"
          />
          {ownership.mortgaged ? <Lock size={10} weight="fill" className={styles.mortgagedIcon} /> : null}
        </span>
      ) : null}

      {ownership && ownership.houses > 0 ? (
        <span className={styles.housePips} aria-hidden="true">
          {ownership.houses === 5 ? (
            <House size={13} weight="fill" className={styles.hotelIcon} />
          ) : (
            Array.from({ length: ownership.houses }).map((_, i) => <House key={i} size={8} weight="fill" />)
          )}
        </span>
      ) : null}

      <PlayerTokens state={state} players={playersHere} />
    </Tag>
  );
}
