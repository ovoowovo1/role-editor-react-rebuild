import type { Container } from 'pixi.js';
import type { DecorationLayer } from '../../types/role';
import { displayTransformPatchForDecoration } from '../../lib/stage/characterStageHelpers';
import type { DecoDisplayRecord } from './types';

const DEFAULT_CELL_SIZE = 32;
const MAX_COVERED_CELLS_PER_ENTRY = 64;
const FALLBACK_HALF_EXTENT = 8;
const DET_EPSILON = 1e-12;

export interface DecorationHitEntry {
  id: string;
  orderIndex: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  tx: number;
  ty: number;
  a: number;
  b: number;
  c: number;
  d: number;
  det: number;
  localMinX: number;
  localMinY: number;
  localMaxX: number;
  localMaxY: number;
}

export interface DecorationHitIndex {
  cellSize: number;
  rows: Map<number, Map<number, DecorationHitEntry[]>>;
  wideEntries: DecorationHitEntry[];
  entriesById: Map<string, DecorationHitEntry>;
}

function localBoundsForContainer(container: Container): {
  localMinX: number;
  localMinY: number;
  localMaxX: number;
  localMaxY: number;
} {
  const bounds = container.getLocalBounds();
  if (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width > 0 &&
    bounds.height > 0
  ) {
    return {
      localMinX: bounds.x,
      localMinY: bounds.y,
      localMaxX: bounds.x + bounds.width,
      localMaxY: bounds.y + bounds.height
    };
  }
  return {
    localMinX: -FALLBACK_HALF_EXTENT,
    localMinY: -FALLBACK_HALF_EXTENT,
    localMaxX: FALLBACK_HALF_EXTENT,
    localMaxY: FALLBACK_HALF_EXTENT
  };
}

export function createDecorationHitEntry(
  deco: DecorationLayer,
  record: DecoDisplayRecord,
  orderIndex: number
): DecorationHitEntry | null {
  if (!deco.visible || deco.opacity <= 0) return null;

  const patch = displayTransformPatchForDecoration(deco);
  const cos = Math.cos(patch.rotationRadians);
  const sin = Math.sin(patch.rotationRadians);
  const a = cos * patch.scaleX;
  const b = sin * patch.scaleX;
  const c = -sin * patch.scaleY;
  const d = cos * patch.scaleY;
  const det = a * d - b * c;
  if (Math.abs(det) <= DET_EPSILON) return null;

  const { localMinX, localMinY, localMaxX, localMaxY } = localBoundsForContainer(record.container);
  const x0 = a * localMinX + c * localMinY + patch.x;
  const y0 = b * localMinX + d * localMinY + patch.y;
  const x1 = a * localMaxX + c * localMinY + patch.x;
  const y1 = b * localMaxX + d * localMinY + patch.y;
  const x2 = a * localMinX + c * localMaxY + patch.x;
  const y2 = b * localMinX + d * localMaxY + patch.y;
  const x3 = a * localMaxX + c * localMaxY + patch.x;
  const y3 = b * localMaxX + d * localMaxY + patch.y;

  const minX = Math.min(x0, x1, x2, x3);
  const minY = Math.min(y0, y1, y2, y3);
  const maxX = Math.max(x0, x1, x2, x3);
  const maxY = Math.max(y0, y1, y2, y3);
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    id: deco.id,
    orderIndex,
    minX,
    minY,
    maxX,
    maxY,
    tx: patch.x,
    ty: patch.y,
    a,
    b,
    c,
    d,
    det,
    localMinX,
    localMinY,
    localMaxX,
    localMaxY
  };
}

function insertEntry(index: DecorationHitIndex, entry: DecorationHitEntry): void {
  index.entriesById.set(entry.id, entry);
  const minCellX = Math.floor(entry.minX / index.cellSize);
  const maxCellX = Math.floor(entry.maxX / index.cellSize);
  const minCellY = Math.floor(entry.minY / index.cellSize);
  const maxCellY = Math.floor(entry.maxY / index.cellSize);
  const coveredCells = (maxCellX - minCellX + 1) * (maxCellY - minCellY + 1);

  if (
    coveredCells > MAX_COVERED_CELLS_PER_ENTRY ||
    !Number.isSafeInteger(minCellX) ||
    !Number.isSafeInteger(maxCellX) ||
    !Number.isSafeInteger(minCellY) ||
    !Number.isSafeInteger(maxCellY)
  ) {
    index.wideEntries.push(entry);
    return;
  }

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    let row = index.rows.get(cellY);
    if (!row) {
      row = new Map();
      index.rows.set(cellY, row);
    }
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const bucket = row.get(cellX);
      if (bucket) bucket.push(entry);
      else row.set(cellX, [entry]);
    }
  }
}

export function buildDecorationHitIndex(
  decorations: readonly DecorationLayer[],
  decoDisplays: ReadonlyMap<string, DecoDisplayRecord>,
  layerOrder?: readonly string[],
  cellSize = DEFAULT_CELL_SIZE
): DecorationHitIndex {
  const index: DecorationHitIndex = {
    cellSize: Math.max(1, cellSize),
    rows: new Map(),
    wideEntries: [],
    entriesById: new Map()
  };

  const orderById = new Map<string, number>();
  if (layerOrder?.length) {
    for (let i = 0; i < layerOrder.length; i += 1) {
      orderById.set(layerOrder[i], i);
    }
  }

  for (let i = 0; i < decorations.length; i += 1) {
    const deco = decorations[i];
    const record = decoDisplays.get(deco.id);
    if (!record) continue;
    // Canonical decoration array is top-first when no explicit layerOrder exists.
    const orderIndex = orderById.get(deco.id) ?? (decorations.length - 1 - i);
    const entry = createDecorationHitEntry(deco, record, orderIndex);
    if (entry) insertEntry(index, entry);
  }

  return index;
}

function entryContainsPoint(entry: DecorationHitEntry, x: number, y: number): boolean {
  if (x < entry.minX || x > entry.maxX || y < entry.minY || y > entry.maxY) {
    return false;
  }
  const dx = x - entry.tx;
  const dy = y - entry.ty;
  const localX = (entry.d * dx - entry.c * dy) / entry.det;
  const localY = (-entry.b * dx + entry.a * dy) / entry.det;
  return (
    localX >= entry.localMinX &&
    localX <= entry.localMaxX &&
    localY >= entry.localMinY &&
    localY <= entry.localMaxY
  );
}

/**
 * Returns the topmost visible decoration ID at `(x, y)` in `disguiseRoot`
 * local coordinates, or `null` if no decoration is under the point.
 */
export function hitTestDecorationAt(
  index: DecorationHitIndex | null | undefined,
  x: number,
  y: number
): string | null {
  if (!index || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  let bestId: string | null = null;
  let bestOrder = -Infinity;

  const cellX = Math.floor(x / index.cellSize);
  const cellY = Math.floor(y / index.cellSize);
  const bucket = index.rows.get(cellY)?.get(cellX);
  if (bucket) {
    for (let i = 0; i < bucket.length; i += 1) {
      const entry = bucket[i];
      if (entry.orderIndex <= bestOrder) continue;
      if (entryContainsPoint(entry, x, y)) {
        bestOrder = entry.orderIndex;
        bestId = entry.id;
      }
    }
  }

  for (let i = 0; i < index.wideEntries.length; i += 1) {
    const entry = index.wideEntries[i];
    if (entry.orderIndex <= bestOrder) continue;
    if (entryContainsPoint(entry, x, y)) {
      bestOrder = entry.orderIndex;
      bestId = entry.id;
    }
  }

  return bestId;
}

/**
 * Returns all visible decoration IDs whose bounds intersect the given
 * `disguiseRoot`-local rectangle.
 */
export function hitTestDecorationsInRect(
  index: DecorationHitIndex | null | undefined,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): string[] {
  if (!index) return [];
  const left = Math.min(minX, maxX);
  const right = Math.max(minX, maxX);
  const top = Math.min(minY, maxY);
  const bottom = Math.max(minY, maxY);
  if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) {
    return [];
  }

  const minCellX = Math.floor(left / index.cellSize);
  const maxCellX = Math.floor(right / index.cellSize);
  const minCellY = Math.floor(top / index.cellSize);
  const maxCellY = Math.floor(bottom / index.cellSize);

  const matched = new Map<string, number>();

  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    const row = index.rows.get(cellY);
    if (!row) continue;
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      const bucket = row.get(cellX);
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i += 1) {
        const entry = bucket[i];
        if (matched.has(entry.id)) continue;
        if (entry.maxX < left || entry.minX > right || entry.maxY < top || entry.minY > bottom) continue;
        matched.set(entry.id, entry.orderIndex);
      }
    }
  }

  for (let i = 0; i < index.wideEntries.length; i += 1) {
    const entry = index.wideEntries[i];
    if (matched.has(entry.id)) continue;
    if (entry.maxX < left || entry.minX > right || entry.maxY < top || entry.minY > bottom) continue;
    matched.set(entry.id, entry.orderIndex);
  }

  return Array.from(matched.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
