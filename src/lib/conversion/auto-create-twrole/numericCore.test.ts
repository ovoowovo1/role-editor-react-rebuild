import { describe, expect, it } from 'vitest';
import { makeSyntheticRgbaFixture } from '../../../test/autoCreateFixtures';
import {
  BinaryMaskIndex,
  ErrorField,
  SeededRandom,
  TargetMomentIndex,
  TileSpatialIndex,
  bboxClip,
  bboxIntersects,
  cumulativeWeights
} from './numericCore';

describe('auto-create numeric core', () => {
  it('replays seeded random sequences and cached normal values from a snapshot', () => {
    const first = new SeededRandom(0x12345678);
    const second = new SeededRandom(0x12345678);

    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next())
    );

    first.normal();
    const snapshot = first.snapshot();
    const expected = [first.normal(10, 2), first.next(), first.integer(-3, 5), first.uniform(5, 9)];
    first.restore(snapshot.state, snapshot.spareNormal);

    expect([first.normal(10, 2), first.next(), first.integer(-3, 5), first.uniform(5, 9)]).toEqual(expected);
  });

  it('uses non-negative cumulative weights and deterministic weighted choices', () => {
    const cumulative = cumulativeWeights([2, -10, 3, 0]);
    expect(Array.from(cumulative)).toEqual([2, 2, 5, 5]);

    const direct = new SeededRandom(99);
    const cached = new SeededRandom(99);
    expect(Array.from({ length: 20 }, () => direct.weightedIndex([2, -10, 3, 0]))).toEqual(
      Array.from({ length: 20 }, () => cached.weightedIndexFromCumulative(cumulative))
    );
  });

  it('clips half-open bounding boxes and treats touching edges as non-intersecting', () => {
    expect(bboxClip([-2.8, 1.9, 7.9, 12], 6, 8)).toEqual([0, 1, 6, 8]);
    expect(bboxClip([6, 0, 9, 3], 6, 8)).toBeNull();
    expect(bboxClip([3, 4, 3, 7], 6, 8)).toBeNull();

    expect(bboxIntersects([0, 0, 4, 4], [3, 3, 6, 6])).toBe(true);
    expect(bboxIntersects([0, 0, 4, 4], [4, 0, 6, 4])).toBe(false);
    expect(bboxIntersects([0, 0, 4, 4], [0, 4, 4, 6])).toBe(false);
  });

  it('counts sparse mask pixels and narrows each row before exact mask checks', () => {
    const mask = new Uint8Array([
      0, 1, 0, 1, 0,
      0, 0, 0, 0, 0,
      1, 1, 1, 0, 0,
      0, 0, 0, 0, 1
    ]);
    const index = new BinaryMaskIndex(mask, 5, 4);

    expect(index.count([0, 0, 5, 4])).toBe(6);
    expect(index.count([1, 0, 4, 3])).toBe(4);
    expect(index.rowVisibleRange(0, 0, 5)).toEqual([1, 4]);
    expect(index.rowVisibleRange(1, 0, 5)).toBeNull();
    expect(index.rowVisibleRange(2, 2, 5)).toEqual([2, 3]);
    expect(index.isSet(1)).toBe(true);
    expect(index.isSet(2)).toBe(false);
  });

  it('updates, moves, removes, and clears spatial entries without duplicate results', () => {
    const index = new TileSpatialIndex(32, 32, 8);
    index.update(20, [0, 0, 9, 9]);
    index.update(3, [8, 8, 17, 17]);

    expect(index.query([7, 7, 10, 10])).toEqual([3, 20]);
    expect(index.query([7, 7, 10, 10])).toEqual([3, 20]);

    index.update(20, [24, 24, 32, 32]);
    expect(index.query([7, 7, 10, 10])).toEqual([3]);
    expect(index.query([24, 24, 32, 32])).toEqual([20]);

    index.remove(3);
    expect(index.query([7, 7, 10, 10])).toEqual([]);
    index.clear();
    expect(index.query([0, 0, 32, 32])).toEqual([]);
  });

  it('keeps incremental bbox error updates equivalent to a full recomputation', () => {
    const fixture = makeSyntheticRgbaFixture(
      6,
      5,
      (x, y) => [20 + x * 7, 30 + y * 11, 40 + (x + y) * 3, 255]
    );
    const mask = new Uint8Array(fixture.width * fixture.height);
    for (let y = 0; y < fixture.height; y += 1) {
      for (let x = 0; x < fixture.width; x += 1) {
        mask[y * fixture.width + x] = (x + y) % 3 === 0 ? 0 : 1;
      }
    }
    const canvas = new Float32Array(fixture.premult.length);
    const errors = new ErrorField(
      canvas,
      fixture.premult,
      fixture.straight,
      mask,
      fixture.width,
      fixture.height,
      4
    );
    const initialSse = errors.totalSse;

    for (let y = 1; y < fixture.height; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const offset = (y * fixture.width + x) * 4;
        canvas.set(fixture.premult.subarray(offset, offset + 4), offset);
      }
    }
    errors.updateBBox([-4, 1, 4, 99]);

    const incrementalSse = errors.totalSse;
    const incrementalMap = Array.from(errors.errorMap);
    const incrementalCells = Array.from(errors.cellW);
    expect(incrementalSse).toBeLessThan(initialSse);

    errors.recomputeAll();

    expect(errors.totalSse).toBeCloseTo(incrementalSse, 8);
    expect(Array.from(errors.errorMap)).toEqual(incrementalMap);
    expect(Array.from(errors.cellW)).toEqual(incrementalCells);
  });

  it('chooses only masked focus pixels and has a stable empty-mask fallback', () => {
    const fixture = makeSyntheticRgbaFixture(4, 4, (x, y) => [x * 20, y * 30, 90, 255]);
    const mask = new Uint8Array(16);
    mask[6] = 1;
    const canvas = fixture.premult.slice();
    const errors = new ErrorField(canvas, fixture.premult, fixture.straight, mask, 4, 4, 4);

    expect(errors.chooseFocus(new SeededRandom(7))).toMatchObject({ x: 2, y: 1, cell: [0, 0] });

    const empty = new ErrorField(canvas, fixture.premult, fixture.straight, new Uint8Array(16), 4, 4, 4);
    expect(empty.chooseFocus(new SeededRandom(7))).toEqual({
      x: 0,
      y: 0,
      color: [128, 128, 128],
      cell: [0, 0]
    });
  });

  it('keeps full scoring SSE separate from focus-mask sampling weights', () => {
    const fixture = makeSyntheticRgbaFixture(8, 4, (x) => [40 + x * 20, 80, 120, 255]);
    const scoringMask = new Uint8Array(32);
    const focusMask = new Uint8Array(32);
    scoringMask[0] = 1;
    scoringMask[7] = 1;
    focusMask[0] = 1;
    const canvas = new Float32Array(fixture.premult.length);
    const errors = new ErrorField(
      canvas,
      fixture.premult,
      fixture.straight,
      scoringMask,
      fixture.width,
      fixture.height,
      4,
      focusMask
    );

    expect(errors.totalSse).toBeGreaterThan(errors.focusSse);
    expect(errors.focusSse).toBeGreaterThan(0);
    expect(errors.cellW[0]).toBeCloseTo(errors.focusSse, 6);
    expect(errors.cellW[1]).toBe(0);
    for (let seed = 1; seed <= 20; seed += 1) {
      expect(errors.chooseFocus(new SeededRandom(seed))).toMatchObject({ x: 0, y: 0, cell: [0, 0] });
    }

    const previousFocusSse = errors.focusSse;
    const excludedOffset = 7 * 4;
    canvas.set(fixture.premult.subarray(excludedOffset, excludedOffset + 4), excludedOffset);
    errors.updateBBox([7, 0, 8, 1]);
    expect(errors.totalSse).toBeGreaterThanOrEqual(errors.focusSse);
    expect(errors.focusSse).toBeCloseTo(previousFocusSse, 6);
  });

  it('returns a conservative cell-level focus SSE bound for candidate geometry', () => {
    const fixture = makeSyntheticRgbaFixture(9, 7, (x, y) => [31 + x * 19, 17 + y * 23, 211 - x * 7, 255]);
    const canvas = new Float32Array(fixture.premult.length);
    const focusMask = fixture.mask.slice();
    focusMask[3 * fixture.width + 4] = 0;
    const errors = new ErrorField(
      canvas,
      fixture.premult,
      fixture.straight,
      fixture.mask,
      fixture.width,
      fixture.height,
      4,
      focusMask
    );
    const bbox: [number, number, number, number] = [2, 1, 8, 6];
    let exact = 0;
    for (let y = bbox[1]; y < bbox[3]; y += 1) {
      for (let x = bbox[0]; x < bbox[2]; x += 1) {
        const pixel = y * fixture.width + x;
        if (!focusMask[pixel]) continue;
        const offset = pixel * 4;
        const dr = canvas[offset] - fixture.premult[offset];
        const dg = canvas[offset + 1] - fixture.premult[offset + 1];
        const db = canvas[offset + 2] - fixture.premult[offset + 2];
        const da = canvas[offset + 3] - fixture.premult[offset + 3];
        exact += dr * dr + dg * dg + db * db + 0.35 * da * da;
      }
    }

    expect(errors.focusSseUpperBound(bbox)).toBeGreaterThanOrEqual(exact);
    expect(errors.focusSseUpperBound([-20, -20, -1, -1])).toBe(0);
  });

  it('matches a reference weighted local RGB mean and standard deviation', () => {
    const fixture = makeSyntheticRgbaFixture(
      7,
      6,
      (x, y) => [20 + x * 13, 15 + y * 17, 30 + (x + y) * 9, 32 + ((x * 31 + y * 47) % 224)]
    );
    const index = new TargetMomentIndex(fixture.straight, fixture.mask, fixture.width, fixture.height);
    const actual = index.stats(3, 2, 2);
    expect(actual).not.toBeNull();

    const values: Array<{ color: [number, number, number]; weight: number }> = [];
    for (let y = 0; y < 5; y += 1) {
      for (let x = 1; x < 6; x += 1) {
        const pixel = y * fixture.width + x;
        if (!fixture.mask[pixel]) continue;
        const offset = pixel * 4;
        values.push({
          color: [fixture.straight[offset], fixture.straight[offset + 1], fixture.straight[offset + 2]],
          weight: Math.max(fixture.straight[offset + 3] / 255, 1.0e-3)
        });
      }
    }
    const weight = values.reduce((sum, value) => sum + value.weight, 0);
    const mean = [0, 1, 2].map((channel) => values.reduce(
      (sum, value) => sum + value.color[channel] * value.weight,
      0
    ) / weight);
    const std = [0, 1, 2].map((channel) => Math.sqrt(values.reduce((sum, value) => {
      const delta = value.color[channel] - mean[channel];
      return sum + delta * delta * value.weight;
    }, 0) / weight));

    for (let channel = 0; channel < 3; channel += 1) {
      expect(actual?.mean[channel]).toBeCloseTo(mean[channel], 10);
      expect(actual?.std[channel]).toBeCloseTo(std[channel], 9);
    }
  });
});
