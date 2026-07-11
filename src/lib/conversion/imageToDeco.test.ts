import { afterEach, describe, expect, it, vi } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import {
  IMAGE_TO_DECO_PRESETS,
  bestPaletteMatch,
  buildDecoPalette,
  convertImageFileToDecos,
  visualWidthForOption,
  type DecoPaletteEntry,
  type ImageToDecoConversionOptions
} from './imageToDeco';

const originalDocument = globalThis.document;
const originalImage = globalThis.Image;
const originalRaf = globalThis.requestAnimationFrame;
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

interface FakeImageData { width: number; height: number; pixels: Uint8ClampedArray; }

function installImageCanvasMock(images: Record<string, FakeImageData>) {
  class FakeImage {
    naturalWidth = 0;
    naturalHeight = 0;
    width = 0;
    height = 0;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private value = '';
    set src(value: string) {
      this.value = value;
      const image = images[value];
      queueMicrotask(() => {
        if (!image) return this.onerror?.();
        this.naturalWidth = this.width = image.width;
        this.naturalHeight = this.height = image.height;
        this.onload?.();
      });
    }
    get src() { return this.value; }
  }

  const createCanvas = () => {
    let drawn: FakeImageData | null = null;
    const context = {
      drawImage(image: FakeImage) { drawn = images[image.src] ?? null; },
      clearRect() {},
      getImageData() {
        return { data: drawn?.pixels ?? new Uint8ClampedArray(4) };
      }
    };
    return {
      width: 1,
      height: 1,
      getContext: () => context,
      toDataURL: () => 'data:image/png;base64,mock'
    };
  };

  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => createCanvas() } });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: FakeImage });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (callback: FrameRequestCallback) => { callback(0); return 1; } });
  URL.createObjectURL = vi.fn(() => 'blob:target');
  URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: originalImage });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: originalRaf });
  URL.createObjectURL = originalCreateObjectUrl;
  URL.revokeObjectURL = originalRevokeObjectUrl;
});

function paletteEntry(id: string, r: number, g: number, b: number): DecoPaletteEntry {
  return {
    option: makePartOption(id),
    r,
    g,
    b,
    lab: { l: r + g + b, a: r - g, b: g - b },
    hsv: { h: 0, s: 0, v: 0 },
    hsl: { h: 0, s: 0, l: 0 },
    luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b,
    opaquePixels: 10,
    visualWidth: 50
  };
}

describe('image to deco helpers', () => {
  it('uses atlas runtime display width before atlas width and fallback size', () => {
    expect(visualWidthForOption(makePartOption('plain'))).toBe(50);
    expect(visualWidthForOption(makePartOption('atlas', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        pivotX: 0,
        pivotY: 0,
        scale: 1
      }
    }))).toBe(24);
    expect(visualWidthForOption(makePartOption('runtime', {
      atlas: {
        texture: 'atlas.png',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        pivotX: 0,
        pivotY: 0,
        scale: 1,
        runtimeDisplayWidth: 72
      }
    }))).toBe(72);
  });

  it('matches nearest palette entry by selected color algorithm', () => {
    const palette = [
      paletteEntry('red', 250, 10, 10),
      paletteEntry('green', 10, 250, 10),
      paletteEntry('blue', 10, 10, 250)
    ];

    expect(bestPaletteMatch(240, 20, 20, palette, 'rgb').option.id).toBe('red');
    expect(bestPaletteMatch(20, 230, 30, palette, 'weighted-rgb').option.id).toBe('green');
    expect(bestPaletteMatch(30, 30, 220, palette, 'luminance').option.id).toBe('blue');
    expect(bestPaletteMatch(30, 30, 220, palette, 'cielab').option.id).toBe('blue');
    expect(bestPaletteMatch(240, 20, 20, palette, 'hsv').option.id).toBe('red');
    expect(bestPaletteMatch(20, 230, 30, palette, 'hsl').option.id).toBeDefined();
    expect(bestPaletteMatch(30, 30, 220, palette, 'brightness-color').option.id).toBe('blue');
  });

  it('builds a palette, skips transparent and broken sources, and reports progress', async () => {
    installImageCanvasMock({
      'red.png': { width: 1, height: 1, pixels: new Uint8ClampedArray([250, 10, 10, 255]) },
      'clear.png': { width: 1, height: 1, pixels: new Uint8ClampedArray([0, 0, 0, 0]) }
    });
    const progress = vi.fn();
    const options = { ...IMAGE_TO_DECO_PRESETS.performance, alphaThreshold: 10, minSourceOpaquePixels: 1 };

    const palette = await buildDecoPalette([
      makePartOption('red', { icon: 'red.png' }),
      makePartOption('clear', { icon: 'clear.png' }),
      makePartOption('broken', { icon: 'missing.png' })
    ], options, progress);

    expect(palette).toHaveLength(1);
    expect(palette[0]).toMatchObject({ r: 250, g: 10, b: 10, opaquePixels: 1 });
    expect(progress).toHaveBeenLastCalledWith({ stage: 'palette', done: 3, total: 3 });
  });

  it('converts pixels, skips transparency, limits layers, resizes, and emits progress warnings', async () => {
    installImageCanvasMock({
      'red.png': { width: 1, height: 1, pixels: new Uint8ClampedArray([255, 0, 0, 255]) },
      'blob:target': { width: 3, height: 1, pixels: new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 0]) }
    });
    const options: ImageToDecoConversionOptions = {
      maxSize: 2, alphaThreshold: 10, gapFactor: 2, targetScaleMultiplier: 1, targetRatio: 1,
      colorAlgorithm: 'rgb', maxLayers: 1, minSourceOpaquePixels: 1
    };
    const progress = vi.fn();

    const result = await convertImageFileToDecos(new File(['x'], 'sample.png'), [makePartOption('red', { icon: 'red.png' })], options, progress);

    expect(result).toMatchObject({ sourceWidth: 3, outputWidth: 2, outputHeight: 1, opaquePixels: 2, generatedPixels: 1, truncated: true });
    expect(result.warnings).toHaveLength(2);
    expect(result.previewDataUrl).toBe('data:image/png;base64,mock');
    expect(progress).toHaveBeenCalledWith({ stage: 'image', done: 1, total: 1 });
  });
});
