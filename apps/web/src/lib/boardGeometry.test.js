import { describe, it, expect } from 'vitest';
import { getGridPosition } from './boardGeometry.js';

describe('getGridPosition', () => {
  it('places the 4 corners correctly', () => {
    expect(getGridPosition(0)).toEqual({ row: 10, col: 10 }); // START, bottom-right
    expect(getGridPosition(10)).toEqual({ row: 10, col: 0 }); // ANGEL, bottom-left
    expect(getGridPosition(20)).toEqual({ row: 0, col: 0 }); // PRISON, top-left
    expect(getGridPosition(30)).toEqual({ row: 0, col: 10 }); // BUYOUT, top-right
  });

  it('walks the bottom row leftward from 0 to 10', () => {
    for (let id = 0; id <= 10; id += 1) {
      expect(getGridPosition(id)).toEqual({ row: 10, col: 10 - id });
    }
  });

  it('walks the left column upward from 10 to 20', () => {
    for (let id = 10; id <= 20; id += 1) {
      expect(getGridPosition(id)).toEqual({ row: 20 - id, col: 0 });
    }
  });

  it('walks the top row rightward from 20 to 30', () => {
    for (let id = 20; id <= 30; id += 1) {
      expect(getGridPosition(id)).toEqual({ row: 0, col: id - 20 });
    }
  });

  it('walks the right column downward from 30 back toward 0', () => {
    for (let id = 31; id <= 39; id += 1) {
      expect(getGridPosition(id)).toEqual({ row: id - 30, col: 10 });
    }
  });

  it('produces 40 distinct positions, all on the grid perimeter', () => {
    const seen = new Set();
    for (let id = 0; id < 40; id += 1) {
      const { row, col } = getGridPosition(id);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThanOrEqual(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThanOrEqual(10);
      expect(row === 0 || row === 10 || col === 0 || col === 10).toBe(true);
      seen.add(`${row},${col}`);
    }
    expect(seen.size).toBe(40);
  });

  it('rejects out-of-range ids', () => {
    expect(() => getGridPosition(-1)).toThrow(RangeError);
    expect(() => getGridPosition(40)).toThrow(RangeError);
    expect(() => getGridPosition(1.5)).toThrow(RangeError);
  });
});
