import { useState } from 'react';
import { BOARD } from '@estate/board';
import Space from './Space.jsx';
import PropertyModal from './PropertyModal.jsx';
import styles from './Board.module.css';

/**
 * 11x11 grid board. Renders the 40 perimeter Space cells; the 9x9 center
 * area is handed to the caller via `children` (Dice/Controls/EventLog).
 */
export default function Board({ state, currentUserId, highlightMode, onSubmit, isAnimating, children }) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);

  return (
    <div className={styles.boardWrap}>
      <div className={styles.board}>
        {BOARD.map((space) => {
          const ownership = state.ownership[space.id] ?? null;
          const playersHere = state.players.filter((p) => p.position === space.id && !p.bankrupt);
          const isMine = ownership?.owner === currentUserId;
          const highlighted = Boolean(
            isMine &&
              ((highlightMode === 'build' && ownership.houses < 5) ||
                (highlightMode === 'sell' && ownership.houses > 0) ||
                (highlightMode === 'mortgage' && !ownership.mortgaged)),
          );

          return (
            <Space
              key={space.id}
              space={space}
              state={state}
              ownership={ownership}
              playersHere={playersHere}
              highlighted={highlighted}
              onClick={() => setSelectedSpaceId(space.id)}
            />
          );
        })}

        <div className={styles.center}>{children}</div>
      </div>

      {selectedSpaceId != null ? (
        <PropertyModal
          spaceId={selectedSpaceId}
          state={state}
          currentUserId={currentUserId}
          onSubmit={onSubmit}
          onClose={() => setSelectedSpaceId(null)}
          disabled={isAnimating}
        />
      ) : null}
    </div>
  );
}
