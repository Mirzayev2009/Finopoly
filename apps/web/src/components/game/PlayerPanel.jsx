import { Lock } from '@phosphor-icons/react';
import { BOARD } from '@estate/board';
import { getPlayerColor } from '../../lib/playerColors.js';
import { COLOR_MAP } from '../board/colorMap.js';
import styles from './PlayerPanel.module.css';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function groupProperties(propertyIds) {
  const groups = {};
  for (const spaceId of propertyIds) {
    const space = BOARD[spaceId];
    const key = space.type === 'property' ? space.color : space.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(space);
  }
  return groups;
}

function formatGroupLabel(key) {
  if (key === 'railroad') return 'Railroads';
  if (key === 'utility') return 'Utilities';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function PlayerPanel({ state, player, isCurrentTurn, isYou }) {
  const color = getPlayerColor(state, player.id);
  const groups = groupProperties(player.properties);

  return (
    <div className={cx(styles.panel, player.bankrupt && styles.bankrupt, isCurrentTurn && styles.active)}>
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
        <span className={styles.name}>
          {player.name}
          {isYou ? <span className={styles.youTag}>you</span> : null}
        </span>
        {player.inJail ? (
          <span className={styles.jailBadge}>
            <Lock size={11} weight="fill" />
            Jail
          </span>
        ) : null}
      </div>

      <div className={styles.cash}>${player.cash.toLocaleString()}</div>

      {player.bankrupt ? (
        <span className={styles.bankruptLabel}>Bankrupt</span>
      ) : Object.keys(groups).length > 0 ? (
        <div className={styles.groups}>
          {Object.entries(groups).map(([key, spaces]) => (
            <span key={key} className={styles.chip}>
              <span
                className={styles.chipDot}
                style={{ background: spaces[0].type === 'property' ? COLOR_MAP[key] : 'var(--color-text-faint)' }}
                aria-hidden="true"
              />
              {formatGroupLabel(key)} &times;{spaces.length}
            </span>
          ))}
        </div>
      ) : (
        <span className={styles.noProperties}>No properties</span>
      )}
    </div>
  );
}
