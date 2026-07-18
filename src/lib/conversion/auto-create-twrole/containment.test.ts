import { describe, expect, it } from 'vitest';
import type { BBox, TransformedImage } from './internalTypes';
import { candidateContainmentMode, candidateFitsContainment, erodeContainmentMask } from './containment';
import { BinaryMaskIndex } from './numericCore';

function transformed(width: number, height: number, alphas: number[]): TransformedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const alphaRowStart = new Int32Array(height);
  const alphaRowEnd = new Int32Array(height);
  let alphaSum = 0;
  let alphaLeft = width;
  let alphaTop = height;
  let alphaRight = 0;
  let alphaBottom = 0;
  for (let y = 0; y < height; y += 1) {
    let start = width;
    let end = 0;
    for (let x = 0; x < width; x += 1) {
      const alpha = alphas[y * width + x] ?? 0;
      data[(y * width + x) * 4 + 3] = alpha;
      alphaSum += alpha;
      if (alpha > 0) {
        start = Math.min(start, x);
        end = x + 1;
        alphaLeft = Math.min(alphaLeft, x);
        alphaTop = Math.min(alphaTop, y);
        alphaRight = Math.max(alphaRight, x + 1);
        alphaBottom = Math.max(alphaBottom, y + 1);
      }
    }
    alphaRowStart[y] = start;
    alphaRowEnd[y] = end;
  }
  const alphaBounds: BBox = alphaSum > 0
    ? [alphaLeft, alphaTop, alphaRight, alphaBottom]
    : [0, 0, 0, 0];
  return { width, height, data, alphaBounds, alphaRowStart, alphaRowEnd, alphaSum };
}

describe('strict AutoCreate containment', () => {
  it('builds a one-pixel interior guard for renderer sampling without changing the exact mask', () => {
    const exact = new Uint8Array([
      0, 1, 1, 1, 0,
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1,
      1, 1, 1, 1, 1,
      0, 1, 1, 1, 0
    ]);

    expect(Array.from(erodeContainmentMask(exact, 5, 5))).toEqual([
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 1, 1, 1, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 0, 0
    ]);
    expect(exact[1]).toBe(1);
  });

  it('accepts visible pixels inside the target and transparent padding outside it', () => {
    const rgba = transformed(3, 3, [
      0, 0, 0,
      0, 255, 0,
      0, 0, 0
    ]);
    const mask = new Uint8Array([
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ]);

    expect(candidateFitsContainment(rgba, [0, 0, 3, 3], mask, 3, 3)).toBe(true);
  });

  it('rejects even alpha=1 in a fully surrounded transparent target hole', () => {
    const rgba = transformed(3, 3, [
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ]);
    const mask = new Uint8Array([
      1, 1, 1,
      1, 0, 1,
      1, 1, 1
    ]);

    expect(candidateFitsContainment(rgba, [0, 0, 3, 3], mask, 3, 3)).toBe(false);
  });

  it('allows an out-of-canvas bbox only when the crossing pixels are transparent', () => {
    const transparentEdge = transformed(2, 1, [0, 255]);
    const visibleEdge = transformed(2, 1, [1, 255]);
    const bbox: BBox = [-1, 0, 1, 1];
    const mask = new Uint8Array([1]);

    expect(candidateFitsContainment(transparentEdge, bbox, mask, 1, 1)).toBe(true);
    expect(candidateFitsContainment(visibleEdge, bbox, mask, 1, 1)).toBe(false);
  });

  it('rejects a faint transformed fringe outside the allowed silhouette', () => {
    const rgba = transformed(3, 1, [8, 255, 8]);
    const mask = new Uint8Array([0, 1, 0]);

    expect(candidateFitsContainment(rgba, [0, 0, 3, 1], mask, 3, 1)).toBe(false);
  });

  it('proves a solid placement rectangle in O(1) and falls back around a transparent hole', () => {
    const rgba = transformed(3, 3, [
      0, 0, 0,
      0, 255, 0,
      0, 0, 0
    ]);
    const solid = new Uint8Array(9).fill(1);
    const hole = new Uint8Array(solid);
    hole[4] = 0;

    expect(candidateContainmentMode(
      rgba,
      [0, 0, 3, 3],
      solid,
      3,
      3,
      new BinaryMaskIndex(solid, 3, 3)
    )).toBe('fast');
    expect(candidateContainmentMode(
      rgba,
      [0, 0, 3, 3],
      hole,
      3,
      3,
      new BinaryMaskIndex(hole, 3, 3)
    )).toBe('scan');
    expect(candidateFitsContainment(
      rgba,
      [0, 0, 3, 3],
      hole,
      3,
      3,
      new BinaryMaskIndex(hole, 3, 3)
    )).toBe(false);
  });
});
