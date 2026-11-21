import type { DecorationLayer, PartOption } from '../../types/role';
import { DEFAULT_FILL_COLOR } from '../../constants/conversion';
import { createId, round } from '../math';
import {
  bestPaletteMatch,
  buildDecoPalette,
  visualWidthForOption,
  type ImageToDecoConversionOptions
} from './imageToDeco';

export interface BrushFillPoint {
  x: number;
  y: number;
  radius: number;
}

export interface BrushFillMask {
  points: BrushFillPoint[];
}

export type BrushFillSource =
  | { type: 'color'; color: string }
  | { type: 'deco'; assetId: string };

export interface BrushFillConversionResult {
  decorations: DecorationLayer[];
  generatedPixels: number;
  sampledPixels: number;
  paletteSize: number;
  truncated: boolean;
  warnings: string[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface BrushMaskSpatialIndex {
  cellSize: number;
  rows: Map<number, Map<number, BrushFillPoint[]>>;
  widePoints: BrushFillPoint[];
}

function positiveRadiusMedian(points: BrushFillPoint[]): number {
  const radii = points
    .map((point) => point.radius)
    .filter((radius) => Number.isFinite(radius) && radius > 0)
    .sort((a, b) => a - b);
  if (!radii.length) return 0;
  const middle = Math.floor(radii.length / 2);
  return radii.length % 2 === 0
    ? (radii[middle - 1] + radii[middle]) / 2
    : radii[middle];
}

function buildBrushMaskSpatialIndex(mask: BrushFillMask, step: number): BrushMaskSpatialIndex {
  const cellSize = Math.max(step, 2 * positiveRadiusMedian(mask.points), 1);
  const rows = new Map<number, Map<number, BrushFillPoint[]>>();
  const widePoints: BrushFillPoint[] = [];

  for (const point of mask.points) {
    // The legacy distance check squares radius, so a negative imported radius
    // behaves like its absolute value. Keep that edge-case semantics in the index.
    const radius = Math.abs(point.radius);
    if (Number.isNaN(radius) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (!Number.isFinite(radius)) {
      widePoints.push(point);
      continue;
    }
    const minCellX = Math.floor((point.x - radius) / cellSize);
    const maxCellX = Math.floor((point.x + radius) / cellSize);
    const minCellY = Math.floor((point.y - radius) / cellSize);
    const maxCellY = Math.floor((point.y + radius) / cellSize);
    const coveredCellCount = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);

    if (coveredCellCount > 64 ||
      !Number.isSafeInteger(minCellX) || !Number.isSafeInteger(maxCellX) ||
      !Number.isSafeInteger(minCellY) || !Number.isSafeInteger(maxCellY)) {
      widePoints.push(point);
      continue;
    }

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      let row = rows.get(cellY);
      if (!row) {
        row = new Map();
        rows.set(cellY, row);
      }
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const bucket = row.get(cellX);
        if (bucket) bucket.push(point);
        else row.set(cellX, [point]);
      }
    }
  }

  return { cellSize, rows, widePoints };
}

function pointIsInsideCircle(point: BrushFillPoint, x: number, y: number): boolean {
  const dx = x - point.x;
  const dy = y - point.y;
  return dx * dx + dy * dy <= point.radius * point.radius;
}

/** Builds the exact mask lookup used by brush conversion. The callback is useful for structural perf tests. */
export function createBrushMaskPointTester(
  mask: BrushFillMask,
  step: number,
  onCandidateCompared?: (point: BrushFillPoint) => void
): (x: number, y: number) => boolean {
  return makeBrushMaskPointTester(buildBrushMaskSpatialIndex(mask, step), onCandidateCompared);
}

function makeBrushMaskPointTester(
  index: BrushMaskSpatialIndex,
  onCandidateCompared?: (point: BrushFillPoint) => void
): (x: number, y: number) => boolean {
  return (x, y) => {
    const cellX = Math.floor(x / index.cellSize);
    const cellY = Math.floor(y / index.cellSize);
    const bucket = index.rows.get(cellY)?.get(cellX);
    if (bucket) {
      for (const point of bucket) {
        onCandidateCompared?.(point);
        if (pointIsInsideCircle(point, x, y)) return true;
      }
    }
    for (const point of index.widePoints) {
      onCandidateCompared?.(point);
      if (pointIsInsideCircle(point, x, y)) return true;
    }
    return false;
  };
}

const MAX_WIDE_BRUSH_AXIS_SAMPLES = 128 * 1024;
const MIN_SPARSE_BRUSH_SAMPLES = 16 * 1024;
type SampleSpan = [first: number, end: number];

function canVisitAxis(start: number, end: number, step: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(step) &&
    start <= end && start + step > start && end + step > end;
}

function lowerBound(low: number, high: number, isPast: (index: number) => boolean): number {
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (isPast(middle)) high = middle;
    else low = middle + 1;
  }
  return low;
}

function isSparseWideBrush(index: BrushMaskSpatialIndex, width: number, height: number, step: number): boolean {
  if (width > MAX_WIDE_BRUSH_AXIS_SAMPLES || width * height < MIN_SPARSE_BRUSH_SAMPLES) return false;
  let occupiedAreaUpperBound = 0;
  for (const row of index.rows.values()) occupiedAreaUpperBound += row.size * (index.cellSize + step) ** 2;
  for (const { radius } of index.widePoints) occupiedAreaUpperBound += (2 * Math.abs(radius) + step) ** 2;
  // Overlaps can only make this upper bound larger. Stay on the original
  // streaming scan when the bounds are small or likely dense.
  return occupiedAreaUpperBound < (width * step) * (height * step) / 2;
}

function wideCircleSpan(xs: readonly number[], point: BrushFillPoint, split: number, y: number): SampleSpan | null {
  const dy = y - point.y;
  if (dy * dy > point.radius * point.radius) return null;
  const inside = (i: number) => pointIsInsideCircle(point, xs[i], y);
  const hasLeft = split > 0 && inside(split - 1);
  const hasRight = split < xs.length && inside(split);
  if (!hasLeft && !hasRight) return null;

  // On each side of the center the original predicate is monotone on
  // ordered samples; keep its arithmetic instead of rounding sqrt bounds.
  return [
    hasLeft ? lowerBound(0, split, inside) : split,
    hasRight ? lowerBound(split, xs.length, (i) => !inside(i)) : split
  ];
}

/** Skip empty cells even if a large circle was too wide to expand into the index. */
function visitSparseWideBrushSamples(
  index: BrushMaskSpatialIndex,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  step: number,
  containsPoint: (x: number, y: number) => boolean,
  onHit: (x: number, y: number) => void
): boolean {
  const width = (endX - startX) / step + 1;
  const height = (endY - startY) / step + 1;
  if (!isSparseWideBrush(index, width, height, step)) return false;

  const xs: number[] = [];
  const xByColumn = new Map<number, SampleSpan>();
  for (let x = startX; x <= endX; x += step) {
    const first = xs.length;
    // Repeated additions can make actual sample count differ from the
    // estimate. Fall back before a large allocation or any output.
    if (first >= MAX_WIDE_BRUSH_AXIS_SAMPLES) return false;
    xs.push(x);
    const column = Math.floor(x / index.cellSize);
    const span = xByColumn.get(column);
    if (span) span[1] = first + 1;
    else xByColumn.set(column, [first, first + 1]);
  }
  const wide = index.widePoints.map((point) => ({
    point,
    split: lowerBound(0, xs.length, (i) => xs[i] >= point.x)
  }));
  const spans: SampleSpan[] = [];
  for (let y = startY; y <= endY; y += step) {
    spans.length = 0;
    const row = index.rows.get(Math.floor(y / index.cellSize));
    if (row) {
      for (const column of row.keys()) {
        const span = xByColumn.get(column);
        if (span) spans.push(span);
      }
    }
    for (const { point, split } of wide) {
      const span = wideCircleSpan(xs, point, split, y);
      if (span) spans.push(span);
    }
    if (spans.length > 1) spans.sort((a, b) => a[0] - b[0]);

    let consumed = 0;
    for (const [first, end] of spans) {
      for (let i = Math.max(first, consumed); i < end; i += 1) {
        if (containsPoint(xs[i], y)) onHit(xs[i], y);
      }
      consumed = Math.max(consumed, end);
    }
  }
  return true;
}

/**
 * Visits the same row-major sample grid as the full scan, without evaluating
 * cells that the existing point tester would immediately reject. In particular,
 * x/y still advance by repeated addition, not by multiplication: changing that
 * arithmetic can move a borderline sample into or out of a circle.
 */
function visitBrushSamples(
  index: BrushMaskSpatialIndex,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  step: number,
  onHit: (x: number, y: number) => void
): void {
  if (index.widePoints.length) {
    const containsPoint = makeBrushMaskPointTester(index);
    if (visitSparseWideBrushSamples(index, startX, endX, startY, endY, step, containsPoint, onHit)) return;
    for (let y = startY; y <= endY; y += step) {
      for (let x = startX; x <= endX; x += step) {
        if (containsPoint(x, y)) onHit(x, y);
      }
    }
    return;
  }

  if (!index.rows.size) return;
  const usedColumns = new Set<number>();
  const columnsByRow = new Map<number, number[]>();
  for (const [cellY, row] of index.rows) {
    const columns = [...row.keys()].sort((a, b) => a - b);
    columnsByRow.set(cellY, columns);
    for (const column of columns) usedColumns.add(column);
  }

  // Build the one-dimensional x grid once. Reuse the exact coordinates for
  // each y instead of repeating the same x values across the whole rectangle.
  const xsByColumn = new Map<number, number[]>();
  for (let x = startX; x <= endX; x += step) {
    const column = Math.floor(x / index.cellSize);
    if (!usedColumns.has(column)) continue;
    const xs = xsByColumn.get(column);
    if (xs) xs.push(x);
    else xsByColumn.set(column, [x]);
  }

  let previousCellY = Number.NaN;
  let spans: { xs: number[]; bucket: BrushFillPoint[] }[] = [];
  for (let y = startY; y <= endY; y += step) {
    const cellY = Math.floor(y / index.cellSize);
    if (cellY !== previousCellY) {
      previousCellY = cellY;
      spans = [];
      const row = index.rows.get(cellY);
      for (const column of columnsByRow.get(cellY) ?? []) {
        const xs = xsByColumn.get(column);
        const bucket = row?.get(column);
        if (xs && bucket) spans.push({ xs, bucket });
      }
    }
    for (const { xs, bucket } of spans) {
      for (const x of xs) {
        for (const point of bucket) {
          if (!pointIsInsideCircle(point, x, y)) continue;
          onHit(x, y);
          break;
        }
      }
    }
  }
}

export function brushMaskBounds(mask: BrushFillMask): Bounds | null {
  if (!mask.points.length) return null;
  return mask.points.reduce<Bounds>(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x - point.radius),
      minY: Math.min(bounds.minY, point.y - point.radius),
      maxX: Math.max(bounds.maxX, point.x + point.radius),
      maxY: Math.max(bounds.maxY, point.y + point.radius)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  );
}

export function maskContainsPoint(mask: BrushFillMask, x: number, y: number): boolean {
  return mask.points.some((point) => pointIsInsideCircle(point, x, y));
}

export function parseHexColor(value: string): { r: number; g: number; b: number } {
  const hex = value.trim().replace(/^#/, '');
  const normalized = hex.length === 3
    ? hex.split('').map((char) => `${char}${char}`).join('')
    : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return DEFAULT_FILL_COLOR;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function createFillDecoration(
  option: PartOption,
  x: number,
  y: number,
  index: number,
  options: ImageToDecoConversionOptions
): DecorationLayer {
  const itemScale = (options.gapFactor / visualWidthForOption(option)) * options.targetScaleMultiplier;
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: `Brush Fill ${String(index).padStart(4, '0')}`,
    x: round(x, 3),
    y: round(y, 3),
    scaleX: itemScale,
    scaleY: itemScale * options.targetRatio,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

async function resolveBrushFillOption(
  source: BrushFillSource,
  decoOptions: PartOption[],
  options: ImageToDecoConversionOptions
): Promise<{ option: PartOption; paletteSize: number }> {
  if (source.type === 'deco') {
    const option = decoOptions.find((item) => item.id === source.assetId);
    if (!option) throw new Error('Selected deco asset is not available.');
    return { option, paletteSize: decoOptions.length };
  }

  const palette = await buildDecoPalette(decoOptions, options);
  if (!palette.length) {
    throw new Error('No usable deco colors were found in the current asset palette.');
  }
  const color = parseHexColor(source.color);
  const entry = bestPaletteMatch(color.r, color.g, color.b, palette, options.colorAlgorithm);
  return { option: entry.option, paletteSize: palette.length };
}

export async function convertBrushFillToDecos(
  mask: BrushFillMask,
  source: BrushFillSource,
  decoOptions: PartOption[],
  options: ImageToDecoConversionOptions
): Promise<BrushFillConversionResult> {
  if (!decoOptions.length) {
    throw new Error('No deco assets are available for this camp.');
  }

  const bounds = brushMaskBounds(mask);
  if (!bounds) {
    throw new Error('Draw a range on the stage before filling.');
  }

  const { option, paletteSize } = await resolveBrushFillOption(source, decoOptions, options);
  const step = Math.max(0.5, options.gapFactor);
  const startX = Math.floor(bounds.minX / step) * step;
  const startY = Math.floor(bounds.minY / step) * step;
  const endX = Math.ceil(bounds.maxX / step) * step;
  const endY = Math.ceil(bounds.maxY / step) * step;
  const maxLayers = Math.max(0, Math.floor(options.maxLayers));
  const decorations: DecorationLayer[] = [];
  let sampledPixels = 0;
  let truncated = false;

  if (canVisitAxis(startX, endX, step) && canVisitAxis(startY, endY, step)) {
    const index = buildBrushMaskSpatialIndex(mask, step);
    visitBrushSamples(index, startX, endX, startY, endY, step, (x, y) => {
      sampledPixels += 1;
      if (decorations.length >= maxLayers) {
        truncated = true;
        return;
      }
      decorations.push(createFillDecoration(option, x, y, decorations.length + 1, options));
    });
  }

  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`Layer limit reached. Generated ${decorations.length} of ${sampledPixels} brush samples.`);
  }
  if (!decorations.length) {
    warnings.push('Brush range is too small for the current gap setting.');
  }

  return {
    decorations,
    generatedPixels: decorations.length,
    sampledPixels,
    paletteSize,
    truncated,
    warnings
  };
}
