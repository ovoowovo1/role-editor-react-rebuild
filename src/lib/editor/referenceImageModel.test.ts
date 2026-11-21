import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import {
  createReferenceImageLayer,
  isReferenceImageFile,
  patchReferenceImageLayer,
  reconcileReferenceImageLayerOrder,
  reorderReferenceImageLayerOrder,
  referenceImageInitialScale,
  sameReferenceImageSnapshot
} from './referenceImageModel';

describe('reference image model', () => {
  it('accepts png and jpeg files and rejects unrelated formats', () => {
    expect(isReferenceImageFile({ name: 'a.png', type: 'image/png' })).toBe(true);
    expect(isReferenceImageFile({ name: 'a.JPG', type: '' })).toBe(true);
    expect(isReferenceImageFile({ name: 'a.webp', type: 'image/webp' })).toBe(false);
  });

  it('fits the longest edge and starts at the head origin', () => {
    expect(referenceImageInitialScale(1000, 500, 200)).toBe(0.4);
    const image = createReferenceImageLayer('a.png', 'blob:a', 1000, 500, 200, 'ref-a');
    expect(image).toMatchObject({ id: 'ref-a', x: 0, y: 0, scale: 0.4, opacity: 1, visible: true });
  });

  it('patches immutably and clamps position, scale and opacity', () => {
    const image = createReferenceImageLayer('a.png', 'blob:a', 100, 100, 10, 'ref-a');
    const next = patchReferenceImageLayer(image, { x: 20, y: 0, scale: 99, opacity: -1 }, 10);
    expect(image.x).toBe(0);
    expect(next.x).toBe(10);
    expect(next.y).toBe(0);
    expect(next.scale).toBe(8);
    expect(next.opacity).toBe(0);
    expect(next).not.toBe(image);
    expect(patchReferenceImageLayer(image, {}, 10)).toBe(image);
  });

  it('compares snapshots by value', () => {
    const image = createReferenceImageLayer('a.png', 'blob:a', 10, 10, 10, 'ref-a');
    const snapshot = { images: [image], selectedId: image.id };
    expect(sameReferenceImageSnapshot(snapshot, { images: [{ ...image }], selectedId: image.id })).toBe(true);
  });

  it('reconciles role tokens while retaining image slots', () => {
    const next = reconcileReferenceImageLayerOrder(
      ['b', 'reference-image:one', 'a', 'reference-image:two'],
      ['c', 'b', 'a'],
      new Set(['one', 'two'])
    );
    expect(next).toEqual(['c', 'b', 'reference-image:one', 'a', 'reference-image:two']);
  });

  it('uses the first surviving role anchor and preserves first-seen image order', () => {
    const order = [
      'reference-image:leading', 'missing-role', 'reference-image:leading',
      HEAD_LAYER_ID, 'reference-image:after-head', 'reference-image:removed',
      'a', 'reference-image:after-a'
    ];
    const next = reconcileReferenceImageLayerOrder(
      order,
      ['a', 'new-role', HEAD_LAYER_ID],
      new Set(['leading', 'after-head', 'after-a', 'new'])
    );
    expect(next).toEqual([
      'a', 'reference-image:after-a', 'new-role',
      'reference-image:leading', HEAD_LAYER_ID, 'reference-image:after-head', 'reference-image:new'
    ]);
  });

  it('keeps current role order when no reference images remain and appends unanchored images', () => {
    expect(reconcileReferenceImageLayerOrder(['stale', 'a'], [HEAD_LAYER_ID, 'a', 'a'], new Set()))
      .toEqual([HEAD_LAYER_ID, 'a', 'a']);
    expect(reconcileReferenceImageLayerOrder(
      ['stale', 'reference-image:old'], ['a'], new Set(['new', 'old'])
    )).toEqual(['a', 'reference-image:old', 'reference-image:new']);
  });

  it('retains the fallback slot when an empty token blocks an otherwise valid anchor', () => {
    expect(reconcileReferenceImageLayerOrder(
      ['a', '', 'reference-image:one'], ['a', '', 'b'], new Set(['one'])
    )).toEqual(['a', '', 'b', 'reference-image:one']);
  });

  it('reorders an image token before or after another stack token', () => {
    const order = ['b', 'reference-image:one', 'a', 'reference-image:two'];
    expect(reorderReferenceImageLayerOrder(order, 'two', 'b', 'before'))
      .toEqual(['reference-image:two', 'b', 'reference-image:one', 'a']);
    expect(reorderReferenceImageLayerOrder(order, 'one', 'a', 'after'))
      .toEqual(['b', 'a', 'reference-image:one', 'reference-image:two']);
  });
});
