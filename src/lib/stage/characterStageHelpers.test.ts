import { describe, expect, it } from 'vitest';
import {
  LIVE_MULTI_DRAG_ITEM_LIMIT,
  PRECISE_SELECTION_BOUNDS_LIMIT,
  STAGE_MAX_RESOLUTION
} from '../../constants/stage';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import {
  actorSceneKey,
  appendBrushPoint,
  brushFillPoints,
  clampedHeadLayerIndex,
  committedBrushFillMask,
  decorationDisplayKey,
  decorationTransformKey,
  dragAnchorPosition,
  displayTransformPatchForDecoration,
  displayTransformPatchForHeadLayer,
  interpolatedBrushPoints,
  mergeBounds,
  pointBounds,
  positionRange,
  quarterTurnRotationRadians,
  sameChildOrder,
  selectionControllerPosition,
  selectionDragVisualKey,
  selectionDragHitRect,
  shouldUsePointBoundsForSelection,
  stageRendererResolution,
  stageSurfaceMetrics,
  summarizeMultiDragPositions,
  multiDragStartMode
} from './characterStageHelpers';

describe('character stage helpers', () => {
  it('builds stable display and transform keys', () => {
    const deco = makeDecorationLayer('a', { assetId: 'asset', code: 'code', x: 1, y: 2, rotation: 3, scaleX: 4, scaleY: 5, opacity: 0.5, visible: false });

    expect(decorationDisplayKey(deco)).toBe('asset\u0000code');
    expect(decorationTransformKey(deco)).toBe('1\u00002\u00003\u00004\u00005\u00000.5\u0000false');
  });

  it('rebuilds actor scenes only for parts, frames, and scales', () => {
    const role = makeRoleDocument({
      camp: 'third',
      gender: 'female',
      parts: { head: 'h1', hand: 'hand', foot: 'foot', cape: 'cape' },
      partFrames: { head: 2, hand: 0, foot: 0, cape: 0 },
      partScales: { head: 1.2, hand: 1, foot: 1, cape: 1 }
    });
    const key = actorSceneKey(role, 'idle');

    expect(actorSceneKey({ ...role, camp: 'civil', gender: 'male' }, 'run')).toBe(key);
    expect(actorSceneKey({ ...role, parts: { ...role.parts, head: 'h2' } }, 'idle')).not.toBe(key);
    expect(actorSceneKey({ ...role, partFrames: { ...role.partFrames, head: 3 } }, 'idle')).not.toBe(key);
    expect(actorSceneKey({ ...role, partScales: { ...role.partScales, head: 1.3 } }, 'idle')).not.toBe(key);
  });

  it('keeps selection visual identity stable across transform-only changes', () => {
    const first = makeDecorationLayer('a', { assetId: 'asset', code: 'code', x: 1, rotation: 5 });
    const transformed = { ...first, x: 20, y: -3, rotation: 90, scaleX: 2, opacity: 0.4 };

    expect(selectionDragVisualKey([first])).toBe(selectionDragVisualKey([transformed]));
    expect(selectionDragVisualKey([first, makeDecorationLayer('b')]))
      .not.toBe(selectionDragVisualKey([makeDecorationLayer('b'), first]));
    expect(selectionDragVisualKey([{ ...first, assetId: 'other' }]))
      .not.toBe(selectionDragVisualKey([first]));
  });

  it('serializes selection visual identity without delimiter collisions', () => {
    const delimiterInId = makeDecorationLayer('a:b', { assetId: 'c', code: 'd' });
    const delimiterInAsset = makeDecorationLayer('a', { assetId: 'b:c', code: 'd' });
    const delimiterInCode = makeDecorationLayer('a', { assetId: 'b', code: 'c\u0000d|e' });

    expect(selectionDragVisualKey([delimiterInId]))
      .not.toBe(selectionDragVisualKey([delimiterInAsset]));
    expect(selectionDragVisualKey([delimiterInAsset]))
      .not.toBe(selectionDragVisualKey([delimiterInCode]));
  });

  it('normalizes stage position range values', () => {
    expect(positionRange(makeRoleDocument({ positionRange: '80' as unknown as number }))).toBe(80);
    expect(positionRange(makeRoleDocument({ positionRange: -1 }))).toBe(60);
    expect(positionRange(makeRoleDocument({ positionRange: 20000 }))).toBe(10000);
  });

  it('computes scrollable stage surface metrics from viewport size and zoom', () => {
    expect(stageSurfaceMetrics(100, 50, 1)).toEqual({
      viewportSize: { width: 100, height: 50 },
      surfaceSize: { width: 100, height: 50 }
    });
    expect(stageSurfaceMetrics(100, 50, 2)).toEqual({
      viewportSize: { width: 100, height: 50 },
      surfaceSize: { width: 520, height: 420 }
    });
    expect(stageSurfaceMetrics(0, -5, 0.5)).toEqual({
      viewportSize: { width: 1, height: 1 },
      surfaceSize: { width: 1, height: 1 }
    });
  });

  it('caps canvas resolution and clamps drag anchors to the role range', () => {
    expect(stageRendererResolution(0.5)).toBe(1);
    expect(stageRendererResolution(1.5)).toBe(1.5);
    expect(stageRendererResolution(STAGE_MAX_RESOLUTION + 2)).toBe(STAGE_MAX_RESOLUTION);
    expect(stageRendererResolution(Number.NaN)).toBe(1);

    expect(dragAnchorPosition(8, 9, 2, 1, 20)).toEqual({ x: 6, y: 8 });
    expect(dragAnchorPosition(6, 8, 0, 0, 5)).toEqual({ x: 3, y: 4 });
  });

  it('clamps head layer index and compares child order by identity', () => {
    const a = {};
    const b = {};

    expect(clampedHeadLayerIndex(makeRoleDocument({
      headLayerIndex: 99,
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')]
    }))).toBe(2);
    expect(clampedHeadLayerIndex(makeRoleDocument({
      headLayerIndex: '1.7' as unknown as number,
      decorations: [makeDecorationLayer('a'), makeDecorationLayer('b')]
    }))).toBe(2);
    expect(sameChildOrder([a, b], [a, b])).toBe(true);
    expect(sameChildOrder([a, b], [b, a])).toBe(false);
  });

  it('creates display transform patches for decorations and head layers', () => {
    expect(displayTransformPatchForDecoration(makeDecorationLayer('a', {
      x: 1,
      y: 2,
      rotation: 90,
      scaleX: 1.5,
      scaleY: -2,
      opacity: 2,
      visible: true
    }))).toEqual({
      x: 1,
      y: 2,
      rotationRadians: Math.PI / 2,
      scaleX: 1.5,
      scaleY: -2,
      alpha: 1,
      visible: true
    });
    expect(displayTransformPatchForHeadLayer({
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: -1,
      visible: true
    }, true)).toMatchObject({ alpha: 0, visible: false });
  });

  it('interpolates brush points using radius-based spacing', () => {
    const points = appendBrushPoint([{ x: 0, y: 0, radius: 10 }], { x: 10, y: 0, radius: 10 });

    expect(points).toEqual([
      { x: 0, y: 0, radius: 10 },
      { x: 5, y: 0, radius: 10 },
      { x: 10, y: 0, radius: 10 }
    ]);
    expect(appendBrushPoint(points, { x: 11, y: 0, radius: 10 })).toBe(points);
    expect(interpolatedBrushPoints(points[points.length - 1], { x: 20, y: 0, radius: 10 })).toEqual([
      { x: 15, y: 0, radius: 10 },
      { x: 20, y: 0, radius: 10 }
    ]);
    expect(interpolatedBrushPoints(undefined, { x: 1, y: 2, radius: 3 })).toEqual([
      { x: 1, y: 2, radius: 3 }
    ]);
  });

  it('combines committed and draft brush fill points', () => {
    const committed = { points: [{ x: 1, y: 2, radius: 3 }] };
    const draft = [{ x: 4, y: 5, radius: 6 }];

    expect(brushFillPoints(committed)).toBe(committed.points);
    expect(brushFillPoints(committed, draft)).toEqual([...committed.points, ...draft]);
    expect(committedBrushFillMask(committed, draft)).toEqual({ points: [...committed.points, ...draft] });
  });

  it('normalizes quarter-turn stage rotation', () => {
    expect(quarterTurnRotationRadians(0)).toBe(0);
    expect(quarterTurnRotationRadians(1)).toBe(Math.PI / 2);
    expect(quarterTurnRotationRadians(5)).toBe(Math.PI / 2);
    expect(quarterTurnRotationRadians(-1)).toBe((3 * Math.PI) / 2);
  });

  it('computes selection bounds, centers, and hit rectangles', () => {
    expect(mergeBounds(pointBounds(0, 0), pointBounds(20, 10))).toEqual({
      minX: -25,
      minY: -25,
      maxX: 45,
      maxY: 35
    });
    expect(selectionControllerPosition([makeDecorationLayer('a', { x: 0, y: 0 }), makeDecorationLayer('b', { x: 10, y: 20 })])).toEqual({ x: 5, y: 10 });
    expect(selectionDragHitRect({ minX: -10, minY: -20, maxX: 30, maxY: 40 }, 5, 10)).toEqual({
      x: -25,
      y: -34,
      width: 54,
      height: 68
    });
  });

  it('summarizes and classifies multi-drag selections', () => {
    expect(summarizeMultiDragPositions([
      { id: 'a', x: 0, y: 4 },
      { id: 'b', x: 10, y: 20 },
      { id: 'c', x: -4, y: 2 }
    ])).toEqual({
      count: 3,
      centerX: 2,
      centerY: 26 / 3,
      minX: -4,
      minY: 2,
      maxX: 10,
      maxY: 20
    });

    expect(summarizeMultiDragPositions([])).toBeNull();
    expect(multiDragStartMode(1, 1)).toBe('single-fallback');
    expect(multiDragStartMode(2, 1)).toBe('single-fallback');
    expect(multiDragStartMode(2, 2)).toBe('overlay');
    expect(multiDragStartMode(LIVE_MULTI_DRAG_ITEM_LIMIT, LIVE_MULTI_DRAG_ITEM_LIMIT)).toBe('overlay');
    expect(multiDragStartMode(LIVE_MULTI_DRAG_ITEM_LIMIT + 1, LIVE_MULTI_DRAG_ITEM_LIMIT + 1)).toBe('preview');
    expect(shouldUsePointBoundsForSelection(PRECISE_SELECTION_BOUNDS_LIMIT)).toBe(false);
    expect(shouldUsePointBoundsForSelection(PRECISE_SELECTION_BOUNDS_LIMIT + 1)).toBe(true);
  });
});
