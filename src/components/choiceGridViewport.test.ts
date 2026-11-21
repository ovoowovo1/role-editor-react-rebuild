import { describe, expect, it } from 'vitest';
import { initialChoiceGridViewport, resizeChoiceGridViewport, updateChoiceGridViewport } from './choiceGridViewport';

describe('choice grid viewport', () => {
  it('preserves the exact old row window across scroll directions, fractional positions and resize', () => {
    let viewport = initialChoiceGridViewport;
    for (const width of [140, 344, 430, 860]) {
      for (const height of [0, 86, 520, 543]) {
        for (const scrollTop of [0, 0.5, 85.5, 86, 86.5, 6000, 91, 0]) {
          viewport = resizeChoiceGridViewport(viewport, width, height, scrollTop);
          const columns = Math.max(2, Math.floor(width / 86));
          const viewportHeight = height || 520;
          expect(viewport).toEqual({
            columns, viewportHeight,
            firstRow: Math.max(0, Math.floor(scrollTop / 86) - 6),
            lastRowExclusive: Math.ceil((scrollTop + viewportHeight) / 86) + 6
          });
        }
      }
    }
  });

  it('keeps state identity for scroll pixels that leave both row boundaries unchanged', () => {
    let viewport = updateChoiceGridViewport(undefined, 688, 4, 520);
    let updates = 0;
    for (let top = 689; top <= 1188; top++) {
      const next = updateChoiceGridViewport(viewport, top, 4, 520);
      if (next !== viewport) updates++;
      viewport = next;
    }
    expect(updates).toBe(10); // 500 pixel-level events across both overscan boundaries.
  });
});
