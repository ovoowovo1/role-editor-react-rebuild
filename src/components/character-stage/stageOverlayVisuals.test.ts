import { describe, expect, it, vi } from 'vitest';
import type { Container, Graphics } from 'pixi.js';
import { drawBrushFillOverlay } from './stageOverlayVisuals';

describe('brush fill overlay', () => {
  it('does not rebuild the same committed points when the prop catches up, but redraws replaced masks', () => {
    const committed = {
      clear: vi.fn(),
      beginFill: vi.fn(),
      lineStyle: vi.fn(),
      drawCircle: vi.fn(),
      endFill: vi.fn()
    };
    const draft = { clear: vi.fn() };
    const overlay = { visible: false } as Container;
    const scene = {
      brushFillCommittedGraphic: committed as unknown as Graphics,
      brushFillDraftGraphic: draft as unknown as Graphics,
      brushFillOverlay: overlay
    };
    const points = [{ x: 12, y: 20, radius: 5 }, { x: 28, y: 30, radius: 6 }];

    drawBrushFillOverlay(scene, { points });
    drawBrushFillOverlay(scene, { points });
    expect(committed.clear).toHaveBeenCalledTimes(1);
    expect(committed.drawCircle.mock.calls).toEqual([[12, 20, 5], [28, 30, 6]]);
    expect(draft.clear).toHaveBeenCalledTimes(2);
    expect(overlay.visible).toBe(true);

    drawBrushFillOverlay(scene, { points: [] });
    expect(committed.clear).toHaveBeenCalledTimes(2);
    expect(committed.drawCircle).toHaveBeenCalledTimes(2);
    expect(overlay.visible).toBe(false);
  });
});
