import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SourceTile } from './internalTypes';
import { AutoCreateDiagnosticsCollector } from './diagnostics';
import { VariantCache, variantGeometry } from './variantCache';

class FakeCanvasContext {
  clearCount = 0;

  constructor(private readonly canvas: FakeOffscreenCanvas) {}

  setTransform(..._values: number[]): void {}

  clearRect(..._values: number[]): void {
    this.clearCount += 1;
  }

  save(): void {}

  restore(): void {}

  translate(..._values: number[]): void {}

  scale(..._values: number[]): void {}

  rotate(..._values: number[]): void {}

  drawImage(..._values: unknown[]): void {}

  getImageData(..._values: number[]): ImageData {
    return {
      data: FakeOffscreenCanvas.imageData?.length === this.canvas.width * this.canvas.height * 4
        ? new Uint8ClampedArray(FakeOffscreenCanvas.imageData)
        : new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4),
      width: this.canvas.width,
      height: this.canvas.height,
      colorSpace: 'srgb'
    } as ImageData;
  }
}

class FakeOffscreenCanvas {
  static readonly created: FakeOffscreenCanvas[] = [];
  static imageData: Uint8ClampedArray | null = null;

  readonly context = new FakeCanvasContext(this);
  getContextCount = 0;

  constructor(public width: number, public height: number) {
    FakeOffscreenCanvas.created.push(this);
  }

  getContext(..._values: unknown[]): FakeCanvasContext {
    this.getContextCount += 1;
    return this.context;
  }
}

function source(idx: number, thumbW = 4, thumbH = 3): SourceTile {
  return {
    idx,
    thumbW,
    thumbH,
    canvas: {} as OffscreenCanvas
  } as SourceTile;
}

describe('auto-create variant cache', () => {
  beforeEach(() => {
    FakeOffscreenCanvas.created.length = 0;
    FakeOffscreenCanvas.imageData = null;
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes exact raster geometry without changing continuous rotations', () => {
    const input = source(1, 10, 6);

    expect(variantGeometry(input, -1.25, 0.5, 0)).toEqual({
      resizedWidth: 13,
      resizedHeight: 3,
      width: 13,
      height: 3,
      rotation: 0
    });

    const rotated = variantGeometry(input, 1, 1, 12.3456789);
    expect(rotated.rotation).toBe(12.3456789);
    expect(rotated.width).toBe(Math.ceil(10 * Math.abs(Math.cos(12.3456789 * Math.PI / 180)) + 6 * Math.abs(Math.sin(12.3456789 * Math.PI / 180))));
    expect(rotated.height).toBe(Math.ceil(10 * Math.abs(Math.sin(12.3456789 * Math.PI / 180)) + 6 * Math.abs(Math.cos(12.3456789 * Math.PI / 180))));
  });

  it('reuses canvas contexts and only clears an unchanged backing store', () => {
    const cache = new VariantCache(16);

    cache.get(source(1), 1, 1, 0);
    expect(FakeOffscreenCanvas.created).toHaveLength(1);
    expect(FakeOffscreenCanvas.created[0].getContextCount).toBe(1);
    expect(FakeOffscreenCanvas.created[0].context.clearCount).toBe(0);

    cache.get(source(2), 1, 1, 0);
    expect(FakeOffscreenCanvas.created[0].getContextCount).toBe(1);
    expect(FakeOffscreenCanvas.created[0].context.clearCount).toBe(1);

    cache.get(source(3, 8, 3), 1, 1, 0);
    expect(FakeOffscreenCanvas.created[0].getContextCount).toBe(1);
    expect(FakeOffscreenCanvas.created[0].context.clearCount).toBe(1);

    cache.get(source(4), 1, 1, 30);
    expect(FakeOffscreenCanvas.created).toHaveLength(2);
    expect(FakeOffscreenCanvas.created[1].getContextCount).toBe(1);
  });

  it('records exact visible alpha bounds while scanning each raster once', () => {
    const pixels = new Uint8ClampedArray(4 * 3 * 4);
    pixels[(1 * 4 + 1) * 4 + 3] = 8;
    pixels[(2 * 4 + 3) * 4 + 3] = 255;
    FakeOffscreenCanvas.imageData = pixels;

    const transformed = new VariantCache(16).get(source(1, 4, 3), 1, 1, 0);

    expect(transformed.alphaBounds).toEqual([1, 1, 4, 3]);
    expect(Array.from(transformed.alphaRowStart)).toEqual([4, 1, 3]);
    expect(Array.from(transformed.alphaRowEnd)).toEqual([0, 2, 4]);
    expect(transformed.alphaSum).toBe(263);
  });

  it('keeps exact LRU order without deleting and reinserting cache hits', () => {
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const cache = new VariantCache(16, diagnostics);

    for (let idx = 0; idx < 16; idx += 1) cache.get(source(idx), 1, 1, 0);
    cache.get(source(0), 1, 1, 0);
    cache.get(source(16), 1, 1, 0);
    cache.get(source(0), 1, 1, 0);
    cache.get(source(1), 1, 1, 0);

    expect(diagnostics.snapshot().counters).toMatchObject({
      variantCacheHits: 2,
      variantCacheMisses: 18,
      variantCacheEvictions: 2
    });
  });

  it('supports transient renders and promotes only accepted values', () => {
    const diagnostics = new AutoCreateDiagnosticsCollector();
    const cache = new VariantCache(16, diagnostics);
    const input = source(7);

    const first = cache.get(input, 1, 1, 17.25, false);
    const second = cache.get(input, 1, 1, 17.25, false);
    expect(second).not.toBe(first);

    cache.remember(input, 1, 1, 17.25, first);
    expect(cache.get(input, 1, 1, 17.25, false)).toBe(first);
    expect(diagnostics.snapshot().counters).toMatchObject({
      variantCacheHits: 1,
      variantCacheMisses: 2,
      variantCacheEvictions: 0
    });
  });
});
