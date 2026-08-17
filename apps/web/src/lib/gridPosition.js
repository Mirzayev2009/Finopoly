/**
 * Maps a board space id (0-39) to its {row, col} position in the 11x11
 * board grid (0-indexed, row 0 = top, col 0 = left).
 *
 * Space 0 (GO) sits at the bottom-right corner. Ids increase
 * counter-clockwise: bottom row right-to-left (0-10, ending at the
 * bottom-left corner), left column bottom-to-top (11-20, ending at the
 * top-left corner), top row left-to-right (21-30, ending at the top-right
 * corner), right column top-to-bottom (31-39, closing the loop back to 0).
 *
 * @param {number} spaceId 0-39
 * @returns {{ row: number, col: number }} 0-indexed grid coordinates
 */
export function getGridPosition(spaceId) {
  if (!Number.isInteger(spaceId) || spaceId < 0 || spaceId > 39) {
    throw new Error(`Invalid spaceId: ${spaceId}`);
  }

  if (spaceId <= 10) {
    // Bottom row, right to left: 0 at col 10, 10 at col 0.
    return { row: 10, col: 10 - spaceId };
  }
  if (spaceId <= 20) {
    // Left column, bottom to top: 11 at row 9, 20 at row 0.
    return { row: 20 - spaceId, col: 0 };
  }
  if (spaceId <= 30) {
    // Top row, left to right: 21 at col 1, 30 at col 10.
    return { row: 0, col: spaceId - 20 };
  }
  // Right column, top to bottom: 31 at row 1, 39 at row 9.
  return { row: spaceId - 30, col: 10 };
}
