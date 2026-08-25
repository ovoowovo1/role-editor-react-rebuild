import {
  ALPHA_MSE_WEIGHT,
  AUTO_CREATE_ERROR_FIELD_STATE_VERSION,
  type AutoCreateErrorFieldStateSnapshot
} from './contracts';
import type { BBox, Vec3 } from './internalTypes';
import { clamp } from './platform';

export class SeededRandom {
  private state: number;
  private spareNormal: number | null = null;

  constructor(seed: number) {
    const normalized = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : Date.now();
    this.state = normalized >>> 0;
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }

  integer(minInclusive: number, maxExclusive: number): number {
    const min = Math.ceil(minInclusive);
    const max = Math.max(min + 1, Math.floor(maxExclusive));
    return min + Math.floor(this.next() * (max - min));
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  normal(mean = 0, std = 1): number {
    if (this.spareNormal != null) {
      const value = this.spareNormal;
      this.spareNormal = null;
      return mean + value * std;
    }
    const u = Math.max(1.0e-12, this.next());
    const v = Math.max(1.0e-12, this.next());
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    this.spareNormal = z1;
    return mean + z0 * std;
  }

  choice<T>(items: readonly T[]): T {
    return items[this.integer(0, items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.integer(0, i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  snapshot(): { state: number; spareNormal: number | null } {
    return { state: this.state, spareNormal: this.spareNormal };
  }

  restore(state: number, spareNormal: number | null): void {
    const normalized = Number.isFinite(state) ? Math.floor(state) >>> 0 : 0x9e3779b9;
    this.state = normalized === 0 ? 0x9e3779b9 : normalized;
    this.spareNormal = Number.isFinite(spareNormal) ? spareNormal : null;
  }

  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const weight of weights) total += Math.max(0, weight);
    if (!(total > 0)) return this.integer(0, weights.length);
    const pick = this.next() * total;
    let cumulative = 0;
    for (let index = 0; index < weights.length; index += 1) {
      cumulative += Math.max(0, weights[index]);
      if (pick <= cumulative) return index;
    }
    return weights.length - 1;
  }

  weightedIndexFromCumulative(cumulative: ArrayLike<number>, length = cumulative.length): number {
    if (!length) return 0;
    const total = cumulative[length - 1];
    if (!(total > 0)) return this.integer(0, length);
    const pick = this.next() * total;
    for (let index = 0; index < length; index += 1) {
      if (pick <= cumulative[index]) return index;
    }
    return length - 1;
  }
}

export function cumulativeWeights(weights: readonly number[]): Float64Array {
  const cumulative = new Float64Array(weights.length);
  let total = 0;
  for (let index = 0; index < weights.length; index += 1) {
    total += Math.max(0, weights[index]);
    cumulative[index] = total;
  }
  return cumulative;
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

export function bboxClip(bbox: BBox, width: number, height: number): BBox | null {
  const left = clamp(Math.trunc(bbox[0]), 0, width);
  const top = clamp(Math.trunc(bbox[1]), 0, height);
  const right = clamp(Math.trunc(bbox[2]), 0, width);
  const bottom = clamp(Math.trunc(bbox[3]), 0, height);
  if (right <= left || bottom <= top) return null;
  return [left, top, right, bottom];
}

export function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

export class BinaryMaskIndex {
  readonly rowStart: Int32Array;
  readonly rowEnd: Int32Array;
  private readonly stride: number;
  private readonly integral: Uint32Array;

  constructor(
    private readonly mask: Uint8Array,
    width: number,
    height: number
  ) {
    this.stride = width + 1;
    this.integral = new Uint32Array((width + 1) * (height + 1));
    this.rowStart = new Int32Array(height);
    this.rowEnd = new Int32Array(height);

    for (let y = 0; y < height; y += 1) {
      let rowSum = 0;
      let first = width;
      let last = 0;
      const previousRow = y * this.stride;
      const currentRow = (y + 1) * this.stride;
      for (let x = 0; x < width; x += 1) {
        const inside = mask[y * width + x] ? 1 : 0;
        rowSum += inside;
        this.integral[currentRow + x + 1] = this.integral[previousRow + x + 1] + rowSum;
        if (inside) {
          if (first === width) first = x;
          last = x + 1;
        }
      }
      this.rowStart[y] = first;
      this.rowEnd[y] = last;
    }
  }

  count(bbox: BBox): number {
    const [left, top, right, bottom] = bbox;
    const a = top * this.stride + left;
    const b = top * this.stride + right;
    const c = bottom * this.stride + left;
    const d = bottom * this.stride + right;
    return this.integral[d] - this.integral[b] - this.integral[c] + this.integral[a];
  }

  rowVisibleRange(y: number, left: number, right: number): [number, number] | null {
    const start = Math.max(left, this.rowStart[y]);
    const end = Math.min(right, this.rowEnd[y]);
    return end > start ? [start, end] : null;
  }

  isSet(pixel: number): boolean {
    return this.mask[pixel] !== 0;
  }
}

export class TileSpatialIndex {
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cells: number[][];
  private readonly tileCells: number[][] = [];
  private marks: Uint32Array = new Uint32Array(16);
  private serial = 1;

  constructor(
    width: number,
    height: number,
    private readonly cellSize: number
  ) {
    this.gridWidth = Math.max(1, Math.ceil(width / cellSize));
    this.gridHeight = Math.max(1, Math.ceil(height / cellSize));
    this.cells = Array.from({ length: this.gridWidth * this.gridHeight }, () => []);
  }

  clear(): void {
    for (const cell of this.cells) cell.length = 0;
    this.tileCells.length = 0;
    this.marks.fill(0);
    this.serial = 1;
  }

  update(tileIndex: number, bbox: BBox | null): void {
    this.remove(tileIndex);
    if (!bbox) return;

    const cells = this.coveredCells(bbox);
    this.tileCells[tileIndex] = cells;
    for (const cellIndex of cells) this.cells[cellIndex].push(tileIndex);
    this.ensureMarkCapacity(tileIndex + 1);
  }

  remove(tileIndex: number): void {
    const occupied = this.tileCells[tileIndex];
    if (!occupied) return;
    for (const cellIndex of occupied) {
      const entries = this.cells[cellIndex];
      const at = entries.indexOf(tileIndex);
      if (at >= 0) entries.splice(at, 1);
    }
    this.tileCells[tileIndex] = [];
  }

  query(bbox: BBox): number[] {
    if (this.serial === 0xffffffff) {
      this.marks.fill(0);
      this.serial = 1;
    } else {
      this.serial += 1;
    }
    const serial = this.serial;
    const result: number[] = [];

    for (const cellIndex of this.coveredCells(bbox)) {
      for (const tileIndex of this.cells[cellIndex]) {
        this.ensureMarkCapacity(tileIndex + 1);
        if (this.marks[tileIndex] === serial) continue;
        this.marks[tileIndex] = serial;
        result.push(tileIndex);
      }
    }

    result.sort((a, b) => a - b);
    return result;
  }

  private ensureMarkCapacity(required: number): void {
    if (required <= this.marks.length) return;
    let nextLength = this.marks.length;
    while (nextLength < required) nextLength *= 2;
    const next = new Uint32Array(nextLength);
    next.set(this.marks);
    this.marks = next;
  }

  private coveredCells(bbox: BBox): number[] {
    const left = clamp(Math.floor(bbox[0] / this.cellSize), 0, this.gridWidth - 1);
    const top = clamp(Math.floor(bbox[1] / this.cellSize), 0, this.gridHeight - 1);
    const right = clamp(Math.floor(Math.max(bbox[0], bbox[2] - 1) / this.cellSize), 0, this.gridWidth - 1);
    const bottom = clamp(Math.floor(Math.max(bbox[1], bbox[3] - 1) / this.cellSize), 0, this.gridHeight - 1);
    const result: number[] = [];
    for (let cy = top; cy <= bottom; cy += 1) {
      for (let cx = left; cx <= right; cx += 1) result.push(cy * this.gridWidth + cx);
    }
    return result;
  }
}

export interface TargetLocalStats {
  mean: Vec3;
  std: Vec3;
  complexity: number;
}

/**
 * Weighted RGB moment summed-area tables. They make the repeated local
 * gradient lookup constant-time while preserving the target alpha weighting.
 */
export class TargetMomentIndex {
  private readonly stride: number;
  private readonly weight: Float64Array;
  private readonly red: Float64Array;
  private readonly green: Float64Array;
  private readonly blue: Float64Array;
  private readonly redSquared: Float64Array;
  private readonly greenSquared: Float64Array;
  private readonly blueSquared: Float64Array;

  constructor(
    targetStraight: Uint8ClampedArray,
    mask: Uint8Array,
    private readonly width: number,
    private readonly height: number
  ) {
    this.stride = width + 1;
    const length = (width + 1) * (height + 1);
    this.weight = new Float64Array(length);
    this.red = new Float64Array(length);
    this.green = new Float64Array(length);
    this.blue = new Float64Array(length);
    this.redSquared = new Float64Array(length);
    this.greenSquared = new Float64Array(length);
    this.blueSquared = new Float64Array(length);

    for (let y = 0; y < height; y += 1) {
      let rowWeight = 0;
      let rowRed = 0;
      let rowGreen = 0;
      let rowBlue = 0;
      let rowRedSquared = 0;
      let rowGreenSquared = 0;
      let rowBlueSquared = 0;
      const previousRow = y * this.stride;
      const currentRow = (y + 1) * this.stride;

      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        if (mask[pixel]) {
          const offset = pixel * 4;
          const alphaWeight = Math.max(targetStraight[offset + 3] / 255, 1.0e-3);
          const r = targetStraight[offset];
          const g = targetStraight[offset + 1];
          const b = targetStraight[offset + 2];
          rowWeight += alphaWeight;
          rowRed += r * alphaWeight;
          rowGreen += g * alphaWeight;
          rowBlue += b * alphaWeight;
          rowRedSquared += r * r * alphaWeight;
          rowGreenSquared += g * g * alphaWeight;
          rowBlueSquared += b * b * alphaWeight;
        }

        const at = currentRow + x + 1;
        const above = previousRow + x + 1;
        this.weight[at] = this.weight[above] + rowWeight;
        this.red[at] = this.red[above] + rowRed;
        this.green[at] = this.green[above] + rowGreen;
        this.blue[at] = this.blue[above] + rowBlue;
        this.redSquared[at] = this.redSquared[above] + rowRedSquared;
        this.greenSquared[at] = this.greenSquared[above] + rowGreenSquared;
        this.blueSquared[at] = this.blueSquared[above] + rowBlueSquared;
      }
    }
  }

  stats(x: number, y: number, radius: number): TargetLocalStats | null {
    const rad = Math.max(1, Math.round(radius));
    const left = Math.max(0, x - rad);
    const right = Math.min(this.width, x + rad + 1);
    const top = Math.max(0, y - rad);
    const bottom = Math.min(this.height, y + rad + 1);
    return this.statsForRect(left, top, right, bottom);
  }

  /** Exact weighted target moments for a clipped descriptor rectangle. */
  statsForBBox(bbox: BBox): TargetLocalStats | null {
    const clipped = bboxClip(bbox, this.width, this.height);
    if (!clipped) return null;
    return this.statsForRect(...clipped);
  }

  private statsForRect(
    left: number,
    top: number,
    right: number,
    bottom: number
  ): TargetLocalStats | null {
    const weight = this.sum(this.weight, left, top, right, bottom);
    if (weight <= 1.0e-6) return null;

    const mean: Vec3 = [
      this.sum(this.red, left, top, right, bottom) / weight,
      this.sum(this.green, left, top, right, bottom) / weight,
      this.sum(this.blue, left, top, right, bottom) / weight
    ];
    const varianceRed = Math.max(0, this.sum(this.redSquared, left, top, right, bottom) / weight - mean[0] * mean[0]);
    const varianceGreen = Math.max(0, this.sum(this.greenSquared, left, top, right, bottom) / weight - mean[1] * mean[1]);
    const varianceBlue = Math.max(0, this.sum(this.blueSquared, left, top, right, bottom) / weight - mean[2] * mean[2]);
    const std: Vec3 = [Math.sqrt(varianceRed), Math.sqrt(varianceGreen), Math.sqrt(varianceBlue)];
    return { mean, std, complexity: Math.hypot(std[0], std[1], std[2]) };
  }

  private sum(values: Float64Array, left: number, top: number, right: number, bottom: number): number {
    const a = top * this.stride + left;
    const b = top * this.stride + right;
    const c = bottom * this.stride + left;
    const d = bottom * this.stride + right;
    return values[d] - values[b] - values[c] + values[a];
  }
}

export class ErrorField {
  readonly cell: number;
  readonly gw: number;
  readonly gh: number;
  readonly errorMap: Float32Array;
  readonly cellW: Float64Array;
  readonly cellColor: Float32Array;
  readonly cellMaskCount: Int32Array;
  private cellPixels: Int32Array[] = [];
  private maskedPixels = new Int32Array(0);
  private focusPixels = new Int32Array(0);
  private totalSseValue = 0;
  private focusSseValue = 0;

  constructor(
    private readonly canvas: Float32Array,
    private readonly target: Float32Array,
    private readonly targetStraight: Uint8ClampedArray,
    private readonly mask: Uint8Array,
    private readonly width: number,
    private readonly height: number,
    cellSize: number,
    private readonly focusMask: Uint8Array = mask
  ) {
    this.cell = Math.max(4, Math.round(cellSize));
    this.gw = Math.ceil(width / this.cell);
    this.gh = Math.ceil(height / this.cell);
    this.errorMap = new Float32Array(width * height);
    this.cellW = new Float64Array(this.gw * this.gh);
    this.cellColor = new Float32Array(this.gw * this.gh * 3);
    this.cellMaskCount = new Int32Array(this.gw * this.gh);
    this.buildStaticCellColor();
    this.recomputeAll();
  }

  private cellIndex(cy: number, cx: number): number {
    return cy * this.gw + cx;
  }

  private cellBounds(cy: number, cx: number): BBox {
    const left = cx * this.cell;
    const top = cy * this.cell;
    return [left, top, Math.min(this.width, left + this.cell), Math.min(this.height, top + this.cell)];
  }

  private buildStaticCellColor(): void {
    const buckets: number[][] = Array.from({ length: this.gw * this.gh }, () => []);
    const masked: number[] = [];
    const focus: number[] = [];
    const colorSums = new Float64Array(this.gw * this.gh * 3);

    for (let y = 0; y < this.height; y += 1) {
      const cellRow = Math.floor(y / this.cell) * this.gw;
      for (let x = 0; x < this.width; x += 1) {
        const pixel = y * this.width + x;
        if (!this.mask[pixel]) continue;
        masked.push(pixel);
        if (!this.focusMask[pixel]) continue;
        const cell = cellRow + Math.floor(x / this.cell);
        const base = cell * 3;
        const offset = pixel * 4;
        colorSums[base] += this.targetStraight[offset];
        colorSums[base + 1] += this.targetStraight[offset + 1];
        colorSums[base + 2] += this.targetStraight[offset + 2];
        this.cellMaskCount[cell] += 1;
        buckets[cell].push(pixel);
        focus.push(pixel);
      }
    }

    for (let cell = 0; cell < this.cellMaskCount.length; cell += 1) {
      const count = this.cellMaskCount[cell];
      if (count > 0) {
        const base = cell * 3;
        this.cellColor[base] = colorSums[base] / count;
        this.cellColor[base + 1] = colorSums[base + 1] / count;
        this.cellColor[base + 2] = colorSums[base + 2] / count;
      }
    }

    this.cellPixels = buckets.map((pixels) => Int32Array.from(pixels));
    this.maskedPixels = Int32Array.from(masked);
    this.focusPixels = Int32Array.from(focus);
  }

  private pixelError(pixel: number): number {
    const offset = pixel * 4;
    const dr = this.canvas[offset] - this.target[offset];
    const dg = this.canvas[offset + 1] - this.target[offset + 1];
    const db = this.canvas[offset + 2] - this.target[offset + 2];
    const da = this.canvas[offset + 3] - this.target[offset + 3];
    return dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da;
  }

  recomputeAll(): void {
    this.errorMap.fill(0);
    this.cellW.fill(0);
    let total = 0;
    let focusTotal = 0;
    for (const pixel of this.maskedPixels) {
      const y = Math.floor(pixel / this.width);
      const x = pixel - y * this.width;
      const err = Math.fround(this.pixelError(pixel));
      this.errorMap[pixel] = err;
      total += err;
      if (this.focusMask[pixel]) {
        const cell = this.cellIndex(Math.floor(y / this.cell), Math.floor(x / this.cell));
        this.cellW[cell] += err;
        focusTotal += err;
      }
    }
    this.totalSseValue = total;
    this.focusSseValue = focusTotal;
  }

  updateBBox(bbox: BBox): void {
    const clipped = bboxClip(bbox, this.width, this.height);
    if (!clipped) return;
    const [left, top, right, bottom] = clipped;
    for (let y = top; y < bottom; y += 1) {
      const cellRow = Math.floor(y / this.cell) * this.gw;
      for (let x = left; x < right; x += 1) {
        const pixel = y * this.width + x;
        if (!this.mask[pixel]) continue;
        const previous = this.errorMap[pixel];
        const next = Math.fround(this.pixelError(pixel));
        const delta = next - previous;
        if (delta === 0) continue;
        this.errorMap[pixel] = next;
        this.totalSseValue += delta;
        if (this.focusMask[pixel]) {
          this.cellW[cellRow + Math.floor(x / this.cell)] += delta;
          this.focusSseValue += delta;
        }
      }
    }
  }

  get totalSse(): number {
    return this.totalSseValue;
  }

  /** Error mass that may be sampled for candidate focus selection. */
  get focusSse(): number {
    return this.focusSseValue;
  }

  snapshotState(): AutoCreateErrorFieldStateSnapshot {
    return {
      version: AUTO_CREATE_ERROR_FIELD_STATE_VERSION,
      cellSize: this.cell,
      gridWidth: this.gw,
      gridHeight: this.gh,
      totalSse: this.totalSseValue,
      focusSse: this.focusSseValue,
      cellWeights: Array.from(this.cellW)
    };
  }

  /**
   * Validates serialized incremental sums against the already reconstructed
   * per-pixel error map, then restores the exact serialized accumulation
   * order. `recomputeAll()` must have run for the current canvas first.
   */
  restoreSnapshotState(snapshot: AutoCreateErrorFieldStateSnapshot): boolean {
    if (
      !snapshot
      || typeof snapshot !== 'object'
      || snapshot.version !== AUTO_CREATE_ERROR_FIELD_STATE_VERSION
      || snapshot.cellSize !== this.cell
      || snapshot.gridWidth !== this.gw
      || snapshot.gridHeight !== this.gh
      || !Number.isFinite(snapshot.totalSse)
      || !Number.isFinite(snapshot.focusSse)
      || !Array.isArray(snapshot.cellWeights)
      || snapshot.cellWeights.length !== this.cellW.length
      || snapshot.cellWeights.some((value) => !Number.isFinite(value))
    ) return false;

    const maximumPixelError = (3 + ALPHA_MSE_WEIGHT) * 255 * 255;
    const close = (left: number, right: number, pixelCount: number) => {
      const physicalScale = Math.max(1, pixelCount) * maximumPixelError;
      const tolerance = Math.max(0.05, physicalScale * 2.0e-10);
      return Math.abs(left - right) <= tolerance;
    };
    for (let cell = 0; cell < this.cellW.length; cell += 1) {
      const serialized = snapshot.cellWeights[cell];
      const count = this.cellMaskCount[cell];
      const physicalScale = count * maximumPixelError;
      const tolerance = Math.max(0.05, Math.max(1, physicalScale) * 2.0e-10);
      if (
        serialized < -tolerance
        || serialized > physicalScale + tolerance
        || !close(serialized, this.cellW[cell], count)
      ) return false;
    }
    if (
      !close(snapshot.totalSse, this.totalSseValue, this.maskedPixels.length)
      || !close(snapshot.focusSse, this.focusSseValue, this.focusPixels.length)
    ) return false;
    const totalTolerance = Math.max(
      0.05,
      Math.max(1, this.maskedPixels.length * maximumPixelError) * 2.0e-10
    );
    const focusTolerance = Math.max(
      0.05,
      Math.max(1, this.focusPixels.length * maximumPixelError) * 2.0e-10
    );
    if (
      snapshot.totalSse < -totalTolerance
      || snapshot.totalSse > this.maskedPixels.length * maximumPixelError + totalTolerance
      || snapshot.focusSse < -focusTolerance
      || snapshot.focusSse > this.focusPixels.length * maximumPixelError + focusTolerance
    ) return false;

    this.cellW.set(snapshot.cellWeights);
    this.totalSseValue = snapshot.totalSse;
    this.focusSseValue = snapshot.focusSse;
    return true;
  }

  /**
   * Strictly conservative error bound for a candidate geometry. Whole edge
   * cells are included, so this stays O(number of cells) without understating
   * the score available to any visible pixel inside the rectangle.
   */
  focusSseUpperBound(bbox: BBox): number {
    const clipped = bboxClip(bbox, this.width, this.height);
    if (!clipped) return 0;
    const [left, top, right, bottom] = clipped;
    const cellLeft = Math.floor(left / this.cell);
    const cellTop = Math.floor(top / this.cell);
    const cellRight = Math.floor(Math.max(left, right - 1) / this.cell);
    const cellBottom = Math.floor(Math.max(top, bottom - 1) / this.cell);
    let upper = 0;
    for (let cy = cellTop; cy <= cellBottom; cy += 1) {
      const row = cy * this.gw;
      for (let cx = cellLeft; cx <= cellRight; cx += 1) {
        const cell = row + cx;
        // errorMap stores f32 values while candidate scoring uses doubles.
        // 0.02 per masked pixel exceeds half an f32 ULP at the maximum RGBA
        // error and also absorbs incremental summation drift.
        upper += Math.max(0, this.cellW[cell]) + this.cellMaskCount[cell] * 0.02;
      }
    }
    return upper;
  }

  /**
   * Tighter conservative rectangle bound used after cheap descriptor creation.
   * This scans only the candidate rectangle and still avoids variant
   * rasterization, alpha blending and after-SSE evaluation.
   */
  focusSseRectUpperBound(bbox: BBox): number {
    const clipped = bboxClip(bbox, this.width, this.height);
    if (!clipped) return 0;
    const [left, top, right, bottom] = clipped;
    let upper = 0;
    let focusedPixels = 0;
    for (let y = top; y < bottom; y += 1) {
      let pixel = y * this.width + left;
      for (let x = left; x < right; x += 1, pixel += 1) {
        if (!this.focusMask[pixel]) continue;
        upper += Math.max(0, this.errorMap[pixel]);
        focusedPixels += 1;
      }
    }
    return upper + focusedPixels * 0.02;
  }

  chooseFocus(rng: SeededRandom): { x: number; y: number; color: Vec3; cell: [number, number] } {
    const total = this.focusSseValue;

    if (!(total > 1.0e-9) || !Number.isFinite(total)) {
      return this.randomFocusPixel(rng);
    }

    let pick = rng.next() * total;
    let cellIndex = 0;
    for (; cellIndex < this.cellW.length; cellIndex += 1) {
      pick -= Math.max(0, this.cellW[cellIndex]);
      if (pick <= 0) break;
    }
    cellIndex = clamp(cellIndex, 0, this.cellW.length - 1);
    const cy = Math.floor(cellIndex / this.gw);
    const cx = cellIndex % this.gw;
    const candidates = this.cellPixels[cellIndex];
    const [left, top] = this.cellBounds(cy, cx);
    const pixel = candidates.length ? candidates[rng.integer(0, candidates.length)] : top * this.width + left;
    const x = pixel % this.width;
    const y = Math.floor(pixel / this.width);
    const colorBase = cellIndex * 3;
    const fallbackOffset = pixel * 4;
    const color: Vec3 = this.cellMaskCount[cellIndex] > 0
      ? [this.cellColor[colorBase], this.cellColor[colorBase + 1], this.cellColor[colorBase + 2]]
      : [this.targetStraight[fallbackOffset], this.targetStraight[fallbackOffset + 1], this.targetStraight[fallbackOffset + 2]];
    return { x, y, color, cell: [cy, cx] };
  }

  private randomFocusPixel(rng: SeededRandom): { x: number; y: number; color: Vec3; cell: [number, number] } {
    if (this.focusPixels.length) {
      const pixel = this.focusPixels[rng.integer(0, this.focusPixels.length)];
      const y = Math.floor(pixel / this.width);
      const x = pixel - y * this.width;
      const cx = Math.min(this.gw - 1, Math.floor(x / this.cell));
      const cy = Math.min(this.gh - 1, Math.floor(y / this.cell));
      const offset = pixel * 4;
      return {
        x,
        y,
        color: [this.targetStraight[offset], this.targetStraight[offset + 1], this.targetStraight[offset + 2]],
        cell: [cy, cx]
      };
    }
    return { x: 0, y: 0, color: [128, 128, 128], cell: [0, 0] };
  }
}
