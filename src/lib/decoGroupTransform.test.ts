import { describe, expect, it } from 'vitest';
import type { DecorationLayer } from '../types/role';
import {
  applyGroupParentToItem,
  deriveFirstItemPosition,
  snapshotGroupSelection,
  snapshotKeyFromIds
} from './decoGroupTransform';

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1,
    ...patch
  };
}

describe('deco group transform', () => {
  it('captures centroid and stable key for multi-selection snapshots', () => {
    const snapshot = snapshotGroupSelection([layer('a', { x: 0 }), layer('b', { x: 10 })]);

    expect(snapshotKeyFromIds(['a', 'b'])).toBe('a|b');
    expect(snapshot).toMatchObject({
      key: 'a|b',
      centroidX: 5,
      centroidY: 0,
      firstId: 'a'
    });
    expect(snapshotGroupSelection([layer('a')])).toBeNull();
  });

  it('applies parent translation and rotation to child transforms', () => {
    const snapshot = snapshotGroupSelection([layer('a', { x: 0 }), layer('b', { x: 10 })]);
    expect(snapshot).not.toBeNull();

    const translated = applyGroupParentToItem({ scaleX: 1, scaleY: 1, rotationDeg: 0, dx: 5, dy: 0 }, snapshot!, 'a');
    const rotated = applyGroupParentToItem({ scaleX: 1, scaleY: 1, rotationDeg: 90, dx: 0, dy: 0 }, snapshot!, 'b');

    expect(translated).toMatchObject({ x: 5, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
    expect(rotated?.x).toBeCloseTo(5);
    expect(rotated?.y).toBeCloseTo(5);
    expect(rotated?.rotation).toBeCloseTo(90);
    expect(deriveFirstItemPosition({ scaleX: 1, scaleY: 1, rotationDeg: 0, dx: 5, dy: 0 }, snapshot!)).toEqual({ x: 5, y: 0 });
  });

  it('preserves signed flip information through matrix decomposition', () => {
    const snapshot = snapshotGroupSelection([layer('a', { x: 0 }), layer('b', { x: 10 })]);
    const flipped = applyGroupParentToItem({ scaleX: -1, scaleY: 1, rotationDeg: 0, dx: 0, dy: 0 }, snapshot!, 'b');

    expect(flipped?.x).toBeCloseTo(0);
    expect(flipped?.scaleX).toBeCloseTo(1);
    expect(flipped?.scaleY).toBeCloseTo(-1);
  });
});
