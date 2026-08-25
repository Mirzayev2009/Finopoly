/**
 * Maps a board space id (0-39, see packages/content/board.js) to its
 * {row, col} position on an 11x11 grid of 40 perimeter cells. Space 0 is
 * bottom-right; ids increase leftward along the bottom row, then up the
 * left column, then rightward along the top, then down the right column.
 * @param {number} spaceId 0-39
 * @returns {{row: number, col: number}} 0-indexed, 0-10
 */
export function getGridPosition(spaceId) {
  if (!Number.isInteger(spaceId) || spaceId < 0 || spaceId > 39) {
    throw new RangeError(`spaceId must be an integer 0-39, got ${spaceId}`);
  }
  if (spaceId <= 10) return { row: 10, col: 10 - spaceId }; // bottom row, START -> ANGEL
  if (spaceId <= 20) return { row: 20 - spaceId, col: 0 }; // left column, ANGEL -> PRISON
  if (spaceId <= 30) return { row: 0, col: spaceId - 20 }; // top row, PRISON -> BUYOUT
  return { row: spaceId - 30, col: 10 }; // right column, BUYOUT -> START
}
