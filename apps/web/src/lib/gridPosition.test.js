import { describe, expect, it } from 'vitest';
import { getGridPosition } from './gridPosition.js';

describe('getGridPosition', () => {
  it('places GO (0) at the bottom-right corner', () => {
    expect(getGridPosition(0)).toEqual({ row: 10, col: 10 });
  });

  it('places Jail (10) at the bottom-left corner', () => {
    expect(getGridPosition(10)).toEqual({ row: 10, col: 0 });
  });

  it('places Free Parking (20) at the top-left corner', () => {
    expect(getGridPosition(20)).toEqual({ row: 0, col: 0 });
  });

  it('places Go To Jail (30) at the top-right corner', () => {
    expect(getGridPosition(30)).toEqual({ row: 0, col: 10 });
  });

  it('walks the bottom row right to left for ids 1-9', () => {
    expect(getGridPosition(1)).toEqual({ row: 10, col: 9 });
    expect(getGridPosition(5)).toEqual({ row: 10, col: 5 });
    expect(getGridPosition(9)).toEqual({ row: 10, col: 1 });
  });

  it('walks the left column bottom to top for ids 11-19', () => {
    expect(getGridPosition(11)).toEqual({ row: 9, col: 0 });
    expect(getGridPosition(15)).toEqual({ row: 5, col: 0 });
    expect(getGridPosition(19)).toEqual({ row: 1, col: 0 });
  });

  it('walks the top row left to right for ids 21-29', () => {
    expect(getGridPosition(21)).toEqual({ row: 0, col: 1 });
    expect(getGridPosition(25)).toEqual({ row: 0, col: 5 });
    expect(getGridPosition(29)).toEqual({ row: 0, col: 9 });
  });

  it('walks the right column top to bottom for ids 31-39', () => {
    expect(getGridPosition(31)).toEqual({ row: 1, col: 10 });
    expect(getGridPosition(35)).toEqual({ row: 5, col: 10 });
    expect(getGridPosition(39)).toEqual({ row: 9, col: 10 });
  });

  it('produces 40 unique coordinates covering exactly the grid perimeter', () => {
    const seen = new Set();
    for (let id = 0; id <= 39; id += 1) {
      const { row, col } = getGridPosition(id);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThanOrEqual(10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThanOrEqual(10);
      const onPerimeter = row === 0 || row === 10 || col === 0 || col === 10;
      expect(onPerimeter).toBe(true);
      seen.add(`${row},${col}`);
    }
    expect(seen.size).toBe(40);
  });

  it('throws on out-of-range or non-integer input', () => {
    expect(() => getGridPosition(-1)).toThrow();
    expect(() => getGridPosition(40)).toThrow();
    expect(() => getGridPosition(1.5)).toThrow();
  });
});
