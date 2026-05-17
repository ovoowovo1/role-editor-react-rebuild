import { describe, expect, it } from 'vitest';
import { clamp, clampToDisc, moveBlock, normalizeDegrees, safeNumber } from './math';

describe('math utils', () => {
  it('clamps values to inclusive bounds', () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
    expect(clamp(12, 0, 10)).toBe(10);
  });

  it('clamps points to a disc radius', () => {
    expect(clampToDisc(3, 4, 5)).toEqual({ x: 3, y: 4 });
    expect(clampToDisc(6, 8, 5)).toEqual({ x: 3, y: 4 });
  });

  it('normalizes degrees into the editor rotation range', () => {
    expect(normalizeDegrees(270)).toBe(-90);
    expect(normalizeDegrees(-270)).toBe(90);
    expect(normalizeDegrees(181)).toBe(-179);
  });

  it('moves a block while bounding the target index', () => {
    expect(moveBlock(['a', 'b', 'c', 'd'], ['b', 'c'], 0)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveBlock(['a', 'b', 'c'], ['a'], 99)).toEqual(['b', 'c', 'a']);
    expect(moveBlock(['a', 'b'], [], -10)).toEqual(['a', 'b']);
  });

  it('reads finite numeric values with fallback', () => {
    expect(safeNumber('12.5', 0)).toBe(12.5);
    expect(safeNumber(Number.NaN, 7)).toBe(7);
    expect(safeNumber('nope', 3)).toBe(3);
  });
});
