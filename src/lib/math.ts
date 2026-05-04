export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Clamp (x,y) to a disc of given radius (matches original DecoController.overBorder). */
export function clampToDisc(x: number, y: number, radius: number): { x: number; y: number } {
  const r = Math.max(0.001, radius);
  const len2 = x * x + y * y;
  if (len2 <= r * r) return { x, y };
  const k = r / Math.sqrt(len2);
  return { x: x * k, y: y * k };
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizeDegrees(value: number): number {
  let out = value % 360;
  if (out > 180) out -= 360;
  if (out < -180) out += 360;
  return round(out, 3);
}

export function createId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function moveBlock<T>(items: T[], moving: T[], targetIndex: number): T[] {
  const movingSet = new Set(moving);
  const remaining = items.filter((item) => !movingSet.has(item));
  const boundedIndex = clamp(targetIndex, 0, remaining.length);
  return [...remaining.slice(0, boundedIndex), ...moving, ...remaining.slice(boundedIndex)];
}

export function safeNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
