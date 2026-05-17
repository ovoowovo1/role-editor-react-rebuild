import { describe, expect, it } from 'vitest';
import { makeDecorationLayer, makeRoleDocument } from '../test/roleFixtures';
import { snapshotGroupSelection } from './decoGroupTransform';
import {
  applyGroupTransformToSelectedRole,
  applySingleTransformPatchToSelectedRole,
  groupRatioBoundsForSnapshot,
  groupScaleBoundsForSnapshot,
  nextGroupTransformForFlip,
  nextGroupTransformForNudge,
  nextGroupTransformForPatch,
  nudgeSelectedRole,
  selectionRatioBounds,
  selectionScaleBounds,
  syncGroupTransformToActualFirstPosition
} from './editorGroupTransformCommands';

describe('editor group transform commands', () => {
  it('derives group and selection bounds from snapshots', () => {
    const a = makeDecorationLayer('a', { scaleX: 2, scaleY: 4 });
    const b = makeDecorationLayer('b', { x: 10, scaleX: 0.5, scaleY: 0.25 });
    const snapshot = snapshotGroupSelection([a, b]);

    expect(groupScaleBoundsForSnapshot(snapshot)).toEqual({ min: 0.002, max: 2.5 });
    expect(groupRatioBoundsForSnapshot(snapshot)).toEqual({ min: 0.002, max: 2.5 });
    expect(selectionScaleBounds([makeDecorationLayer('head', { code: 'head' })], null)).toEqual({ min: 1, max: 2 });
    expect(selectionRatioBounds([a, b], null)).toEqual({ min: 0.001, max: 5 });
  });

  it('syncs and preserves the first selected item while changing group parent transform', () => {
    const a = makeDecorationLayer('a', { x: 0, y: 0 });
    const b = makeDecorationLayer('b', { x: 10, y: 0 });
    const snapshot = snapshotGroupSelection([a, b]);
    expect(snapshot).not.toBeNull();

    const synced = syncGroupTransformToActualFirstPosition(
      { scaleX: 1, scaleY: 1, rotationDeg: 0, dx: 10, dy: 0 },
      snapshot!,
      a
    );
    expect(synced.dx).toBe(0);

    const next = nextGroupTransformForPatch({
      currentTransform: synced,
      snapshot: snapshot!,
      first: a,
      patch: { rotate: 90, scale: 2 },
      scaleBounds: { min: 0.001, max: 5 },
      positionRange: 60
    });
    const role = makeRoleDocument({ decorations: [a, b] });
    const transformed = applyGroupTransformToSelectedRole(role, ['a', 'b'], snapshot!, next);

    expect(transformed.decorations[0].x).toBeCloseTo(0);
    expect(transformed.decorations[0]).toMatchObject({ y: 0, scaleX: 2, scaleY: 2, rotation: 90 });
    expect(transformed.decorations[1].x).toBeCloseTo(0);
    expect(transformed.decorations[1].y).toBeCloseTo(20);
  });

  it('applies nudge and flip commands for group and single-selection paths', () => {
    const a = makeDecorationLayer('a', { x: 0, y: 0, scaleX: 1, scaleY: 2 });
    const b = makeDecorationLayer('b', { x: 10, y: 0, scaleX: 1, scaleY: 2 });
    const snapshot = snapshotGroupSelection([a, b]);
    expect(snapshot).not.toBeNull();

    const nudgedParent = nextGroupTransformForNudge(
      { scaleX: 1, scaleY: 1, rotationDeg: 0, dx: 0, dy: 0 },
      snapshot!,
      100,
      0,
      20
    );
    expect(snapshot!.centroidX + nudgedParent.dx).toBe(20);
    expect(nextGroupTransformForFlip(nudgedParent, 'vertical').scaleY).toBe(-1);

    const role = makeRoleDocument({ positionRange: 5, decorations: [a, b] });
    expect(nudgeSelectedRole(role, ['b'], 100, 0).decorations[1]).toMatchObject({ x: 5, y: 0 });
  });

  it('applies single transform patches with scale, ratio, and position clamps', () => {
    const role = makeRoleDocument({
      positionRange: 5,
      decorations: [
        makeDecorationLayer('a', { x: 3, y: 4, scaleX: -2, scaleY: 4, rotation: 10 }),
        makeDecorationLayer('head', { code: 'head', scaleX: 1, scaleY: 1 })
      ]
    });

    const moved = applySingleTransformPatchToSelectedRole(role, ['a'], {
      posX: 10,
      posY: 0,
      rotate: 270,
      scale: 99,
      ratio: 3
    });
    expect(moved.decorations[0]).toMatchObject({ x: 5, y: 0, rotation: -90, scaleX: -5, scaleY: 6 });

    const headScaled = applySingleTransformPatchToSelectedRole(role, ['head'], { scale: 99 });
    expect(headScaled.decorations[1]).toMatchObject({ scaleX: 2, scaleY: 2 });
  });
});
