import type { AutoCreateCanvas, SourceTile, TransformedImage } from './internalTypes';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import { createCanvas, get2d } from './platform';

export interface VariantGeometry {
  resizedWidth: number;
  resizedHeight: number;
  width: number;
  height: number;
  rotation: number;
}

interface CanvasSlot {
  canvas: AutoCreateCanvas;
  context: ReturnType<typeof get2d>;
}

interface VariantCacheNode {
  key: string;
  value: TransformedImage;
  older: VariantCacheNode | null;
  newer: VariantCacheNode | null;
}

export function variantGeometry(
  source: SourceTile,
  sxInternal: number,
  syInternal: number,
  rDeg: number
): VariantGeometry {
  const resizedWidth = Math.max(1, Math.round(source.thumbW * Math.max(1.0e-6, Math.abs(sxInternal))));
  const resizedHeight = Math.max(1, Math.round(source.thumbH * Math.max(1.0e-6, Math.abs(syInternal))));
  const rotation = Number.isFinite(rDeg) && Math.abs(rDeg) > 1.0e-9 ? rDeg : 0;
  if (rotation === 0) {
    return { resizedWidth, resizedHeight, width: resizedWidth, height: resizedHeight, rotation };
  }

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  return {
    resizedWidth,
    resizedHeight,
    width: Math.max(1, Math.ceil(resizedWidth * cos + resizedHeight * sin)),
    height: Math.max(1, Math.ceil(resizedWidth * sin + resizedHeight * cos)),
    rotation
  };
}

export class VariantCache {
  private readonly cache = new Map<string, VariantCacheNode>();
  private readonly capacity: number;
  private oldest: VariantCacheNode | null = null;
  private newest: VariantCacheNode | null = null;
  private resizeSlot: CanvasSlot | null = null;
  private rotateSlot: CanvasSlot | null = null;

  constructor(
    maxItems: number,
    private readonly diagnostics: AutoCreateDiagnosticsCollector | null = null
  ) {
    this.capacity = Math.max(16, maxItems);
  }

  get(
    source: SourceTile,
    sxInternal: number,
    syInternal: number,
    rDeg: number,
    cacheResult = true
  ): TransformedImage {
    const geometry = variantGeometry(source, sxInternal, syInternal, rDeg);
    // The old quantized key could map transforms with different raster sizes to
    // the same entry. Key by the actual raster inputs instead: rounded size,
    // flip flags, and exact rotation. Scales that render identically still share.
    const key = this.keyFor(source, geometry, sxInternal, syInternal);
    const cached = this.cache.get(key);
    if (cached) {
      this.diagnostics?.add('variantCacheHits');
      this.touch(cached);
      return cached.value;
    }

    this.diagnostics?.add('variantCacheMisses');
    const transformed = this.diagnostics
      ? this.diagnostics.measure('variantTransform', () => this.transform(source, geometry, sxInternal < 0, syInternal < 0))
      : this.transform(source, geometry, sxInternal < 0, syInternal < 0);
    this.diagnostics?.add('variantPixelsRasterized', transformed.width * transformed.height);
    if (cacheResult) this.insert(key, transformed);
    return transformed;
  }

  remember(
    source: SourceTile,
    sxInternal: number,
    syInternal: number,
    rDeg: number,
    value: TransformedImage
  ): void {
    const geometry = variantGeometry(source, sxInternal, syInternal, rDeg);
    const key = this.keyFor(source, geometry, sxInternal, syInternal);
    const cached = this.cache.get(key);
    if (cached) {
      cached.value = value;
      this.touch(cached);
      return;
    }
    this.insert(key, value);
  }

  private keyFor(
    source: SourceTile,
    geometry: VariantGeometry,
    sxInternal: number,
    syInternal: number
  ): string {
    return `${source.idx}|${geometry.resizedWidth}|${geometry.resizedHeight}|${sxInternal < 0 ? 1 : 0}|${syInternal < 0 ? 1 : 0}|${geometry.rotation}`;
  }

  private touch(node: VariantCacheNode): void {
    if (node === this.newest) return;

    if (node.older) node.older.newer = node.newer;
    else this.oldest = node.newer;
    if (node.newer) node.newer.older = node.older;

    node.older = this.newest;
    node.newer = null;
    if (this.newest) this.newest.newer = node;
    else this.oldest = node;
    this.newest = node;
  }

  private insert(key: string, value: TransformedImage): void {
    const node: VariantCacheNode = {
      key,
      value,
      older: this.newest,
      newer: null
    };
    if (this.newest) this.newest.newer = node;
    else this.oldest = node;
    this.newest = node;
    this.cache.set(key, node);

    if (this.cache.size <= this.capacity || !this.oldest) return;
    const evicted = this.oldest;
    this.oldest = evicted.newer;
    if (this.oldest) this.oldest.older = null;
    else this.newest = null;
    this.cache.delete(evicted.key);
    this.diagnostics?.add('variantCacheEvictions');
  }

  private prepareCanvas(slot: CanvasSlot | null, width: number, height: number): CanvasSlot {
    const fresh = slot == null;
    const prepared = slot ?? (() => {
      const canvas = createCanvas(width, height);
      return { canvas, context: get2d(canvas) };
    })();
    const resized = !fresh && (prepared.canvas.width !== width || prepared.canvas.height !== height);
    if (prepared.canvas.width !== width) prepared.canvas.width = width;
    if (prepared.canvas.height !== height) prepared.canvas.height = height;
    const { context } = prepared;
    // Assigning either canvas dimension resets both context state and pixels.
    // A newly-created canvas is blank as well, so only reset and clear when the
    // exact same backing store is reused.
    if (!fresh && !resized) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
    }
    return prepared;
  }

  private transform(source: SourceTile, geometry: VariantGeometry, flipX: boolean, flipY: boolean): TransformedImage {
    const { resizedWidth: newW, resizedHeight: newH, rotation: rDeg } = geometry;
    this.resizeSlot = this.prepareCanvas(this.resizeSlot, newW, newH);
    const { canvas: resizeCanvas, context: resizeContext } = this.resizeSlot;
    resizeContext.save();
    resizeContext.translate(flipX ? newW : 0, flipY ? newH : 0);
    resizeContext.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    resizeContext.drawImage(source.canvas as CanvasImageSource, 0, 0, source.thumbW, source.thumbH, 0, 0, newW, newH);
    resizeContext.restore();

    let finalCanvas = resizeCanvas;
    let finalContext = resizeContext;
    if (rDeg !== 0) {
      const rad = (rDeg * Math.PI) / 180;
      const rotW = geometry.width;
      const rotH = geometry.height;
      this.rotateSlot = this.prepareCanvas(this.rotateSlot, rotW, rotH);
      const { canvas: rotateCanvas, context: rotateContext } = this.rotateSlot;
      rotateContext.save();
      rotateContext.translate(rotW / 2, rotH / 2);
      rotateContext.rotate(rad);
      rotateContext.drawImage(resizeCanvas as CanvasImageSource, -newW / 2, -newH / 2);
      rotateContext.restore();
      finalCanvas = rotateCanvas;
      finalContext = rotateContext;
    }

    const width = finalCanvas.width;
    const height = finalCanvas.height;
    const data = finalContext.getImageData(0, 0, width, height).data;
    const alphaRowStart = new Int32Array(height);
    const alphaRowEnd = new Int32Array(height);
    this.diagnostics?.add('variantRastersAllocated');
    let alphaSum = 0;
    let alphaLeft = width;
    let alphaTop = height;
    let alphaRight = 0;
    let alphaBottom = 0;

    for (let y = 0; y < height; y += 1) {
      let start = width;
      let end = 0;
      let offset = y * width * 4 + 3;
      for (let x = 0; x < width; x += 1, offset += 4) {
        const alpha = data[offset];
        alphaSum += alpha;
        if (alpha <= 0) continue;
        if (start === width) start = x;
        end = x + 1;
      }
      alphaRowStart[y] = start;
      alphaRowEnd[y] = end;
      if (end > start) {
        if (start < alphaLeft) alphaLeft = start;
        if (end > alphaRight) alphaRight = end;
        if (alphaTop === height) alphaTop = y;
        alphaBottom = y + 1;
      }
    }

    const alphaBounds: [number, number, number, number] = alphaSum > 0
      ? [alphaLeft, alphaTop, alphaRight, alphaBottom]
      : [0, 0, 0, 0];
    return { width, height, data, alphaBounds, alphaRowStart, alphaRowEnd, alphaSum };
  }
}
