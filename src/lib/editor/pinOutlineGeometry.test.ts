import { describe, expect, it } from 'vitest';
import {
  boundsInsidePolygon,
  alignLocalBoundsToBoundary,
  buildPinOutlinePlacements,
  closePinPath,
  localBoundsInsidePolygon,
  safeFormula,
  samplePinSegment
} from './pinOutlineGeometry';
import { alphaBoundsFromPixels } from './pinOutlineAssetMetrics';

describe('pin outline geometry', () => {
  it('closes a pin path and keeps each segment endpoint fixed', () => {
    const pins = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 10, y: 0 },
      { id: 'c', x: 10, y: 10 }
    ];
    const path = closePinPath(pins, [], 4);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path).toContainEqual({ x: 10, y: 0 });
    expect(path).toContainEqual({ x: 10, y: 10 });
    expect(path[path.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it('keeps quadratic and formula curves on their pin endpoints', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 10, y: 0 };
    const quadratic = samplePinSegment(from, to, { type: 'quadratic', curvature: 1, formula: '' }, 5);
    const formula = samplePinSegment(from, to, { type: 'formula', curvature: 0, formula: 'sin(pi*t)' }, 5);
    expect(quadratic[0]).toEqual(from);
    expect(quadratic[quadratic.length - 1]).toEqual(to);
    expect(formula[0]).toEqual(from);
    expect(formula[formula.length - 1]).toEqual(to);
    expect(quadratic[2].y).not.toBe(0);
    expect(formula[2].y).not.toBe(0);
  });

  it('accepts only the safe formula language', () => {
    expect(safeFormula('sin(pi*t)')?.(0.5)).toBeCloseTo(1);
    expect(safeFormula('pow(t, 2) + abs(-t)')?.(0.5)).toBeCloseTo(0.75);
    expect(safeFormula('window.alert(1)')).toBeNull();
    expect(safeFormula('Math.sin(t)')).toBeNull();
    expect(safeFormula('1 / (t - t)')).toBeNull();
    expect(safeFormula('1e9')).toBeNull();
  });

  it('checks rotated material bounds against the region polygon', () => {
    const square = [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 }
    ];
    expect(boundsInsidePolygon({ x: 0, y: 0 }, { halfWidth: 2, halfHeight: 2 }, square)).toBe(true);
    expect(boundsInsidePolygon({ x: 9, y: 0 }, { halfWidth: 2, halfHeight: 2 }, square)).toBe(false);
  });

  it('aligns the visible local bounds directly on the boundary without an artificial inset', () => {
    const square = [
      { x: -10, y: -10 },
      { x: 10, y: -10 },
      { x: 10, y: 10 },
      { x: -10, y: 10 }
    ];
    const bounds = { x: -5, y: -5, width: 10, height: 10 };
    const origin = alignLocalBoundsToBoundary({ x: 0, y: -10 }, { x: 0, y: 1 }, bounds, 0, 1);
    expect(origin).toEqual({ x: 0, y: -5 });
    expect(localBoundsInsidePolygon(origin, bounds, 0, 1, square)).toBe(true);
  });

  it('builds independent, tangent-aligned placements without manual transforms', () => {
    const pins = [
      { id: 'a', x: -80, y: -80 },
      { id: 'b', x: 80, y: -80 },
      { id: 'c', x: 80, y: 80 },
      { id: 'd', x: -80, y: 80 }
    ];
    const materials = [
      { id: 'm1', assetId: 'wide' },
      { id: 'm2', assetId: 'tall' },
      { id: 'm3', assetId: 'wide' }
    ];
    const placements = buildPinOutlinePlacements(pins, [], materials, {
      wide: { x: -17, y: -9, width: 34, height: 18 },
      tall: { x: -9, y: -17, width: 18, height: 34 }
    });
    expect(placements.length).toBeGreaterThan(4);
    expect(new Set(placements.map((placement) => placement.rotation)).size).toBeGreaterThan(1);
    expect(new Set(placements.map((placement) => placement.materialId))).toEqual(new Set(['m1', 'm2', 'm3']));

    const polygon = closePinPath(pins, [], 32).slice(0, -1);
    for (const placement of placements) {
      const metrics = placement.assetId === 'wide'
        ? { x: -17, y: -9, width: 34, height: 18 }
        : { x: -9, y: -17, width: 18, height: 34 };
      expect(localBoundsInsidePolygon(
        { x: placement.x, y: placement.y },
        metrics,
        placement.rotation * Math.PI / 180,
        placement.scaleX,
        polygon
      )).toBe(true);
    }
  });

  it('uses each asset natural aspect ratio and adapts scale near a narrow boundary', () => {
    const pins = [
      { id: 'a', x: -22, y: -22 },
      { id: 'b', x: 22, y: -22 },
      { id: 'c', x: 22, y: 22 },
      { id: 'd', x: -22, y: 22 }
    ];
    const placements = buildPinOutlinePlacements(
      pins,
      [],
      [{ id: 'wide', assetId: 'wide' }, { id: 'tall', assetId: 'tall' }],
      { wide: { x: -20, y: -6, width: 40, height: 12 }, tall: { x: -6, y: -20, width: 12, height: 40 } }
    );
    expect(placements.length).toBeGreaterThan(0);
    expect(placements.every((placement) => placement.scaleX >= 0.05 && placement.scaleY >= 0.05)).toBe(true);
    expect(placements.some((placement) => placement.scaleX < 1)).toBe(true);
  });

  it('records the exact boundary sample used for visible-edge alignment', () => {
    const pins = [
      { id: 'a', x: -30, y: -30 },
      { id: 'b', x: 30, y: -30 },
      { id: 'c', x: 30, y: 30 },
      { id: 'd', x: -30, y: 30 }
    ];
    const placements = buildPinOutlinePlacements(
      pins,
      [],
      [{ id: 'm', assetId: 'm' }],
      { m: { x: -5, y: -3, width: 10, height: 6 } },
      { spacingFactor: 0.9 }
    );
    expect(placements.length).toBeGreaterThan(0);
    for (const placement of placements) {
      expect(Number.isFinite(placement.pathDistance)).toBe(true);
      expect(placement.boundaryPoint).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(placement.inwardNormal).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(placement.visibleBounds).toEqual({ x: -5, y: -3, width: 10, height: 6 });
    }
  });

  it('trims transparent atlas padding from alpha pixels', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    const setAlpha = (x: number, y: number, alpha: number) => {
      pixels[(y * 4 + x) * 4 + 3] = alpha;
    };
    setAlpha(1, 1, 1);
    setAlpha(2, 2, 255);
    expect(alphaBoundsFromPixels(4, 4, pixels)).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(alphaBoundsFromPixels(4, 4, new Uint8ClampedArray(4 * 4 * 4))).toBeNull();
  });
});
