import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import {
  IMAGE_TO_DECO_PRESETS,
  bestPaletteMatch,
  buildDecoPalette,
  convertImageFileToDecos,
  visualWidthForOption,
  type ColorMatchAlgorithm,
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
  const getImageData = vi.fn();

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
        getImageData();
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
  return { getImageData };
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

const MATCH_MODES: readonly ColorMatchAlgorithm[] = ['rgb', 'weighted-rgb', 'luminance', 'cielab', 'hsv', 'hsl', 'brightness-color'];
type MatchFn = typeof bestPaletteMatch;

function matchFixtureDigest(match: MatchFn): string {
  // Stable golden of the previous matcher over high-entropy, fractional,
  // atypical/non-finite input, hue-wrap and near-duplicate color candidates.
  let seed = 0x5ac7fd1;
  const value = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const query: Array<[number, number, number]> = [
    [0, 0, 0], [255, 255, 255], [128, 128, 128], [255, 1, 0], [255, 0, 1],
    [10.313726, 19.3125, 9.625], [Number.NaN, 12, 35], [Infinity, 1, 2], [-Infinity, 1, 2]
  ];
  for (let i = 0; i < 180; i++) {
    query.push([(value() >>> 10) / 16384, (value() >>> 11) / 8192, (value() >>> 12) / 4096]);
  }
  const palettes = Array.from({ length: 6 }, (_, index) => {
    const entries = Array.from({ length: 8 * (index + 1) }, (_, i): DecoPaletteEntry => {
      const entry = paletteEntry(`${index}-${i}`, (value() >>> 8) / 65536, (value() >>> 8) / 65536, (value() >>> 8) / 65536);
      entry.hsv = { h: value() % 360, s: (value() % 128) / 128, v: (value() % 256) / 256 };
      entry.hsl = { h: value() % 360, s: (value() % 128) / 128, l: (value() % 256) / 256 };
      entry.lab = { l: (value() % 1000) / 10, a: (value() % 2560) / 10 - 128, b: (value() % 2560) / 10 - 128 };
      return entry;
    });
    const middle = entries[Math.floor(entries.length / 2)];
    entries.unshift({ ...middle, option: { ...middle.option, id: `tie-${index}` } });
    entries.push({ ...middle, r: middle.r + 2 ** -42, option: { ...middle.option, id: `near-${index}` } });
    entries.push({
      ...middle,
      option: { ...middle.option, id: `nonfinite-${index}` },
      r: NaN, luminance: Infinity, lab: { ...middle.lab, a: NaN },
      hsv: { ...middle.hsv, h: NaN }, hsl: { ...middle.hsl, s: NaN }
    });
    return entries;
  });

  const matches = MATCH_MODES.flatMap((mode) =>
    palettes.flatMap((palette) => query.map(([r, g, b]) => match(r, g, b, palette, mode)?.option.id))
  );
  return createHash('sha256').update(JSON.stringify(matches)).digest('hex');
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

  it('keeps the first palette entry when color distances tie', () => {
    const first = paletteEntry('first', 10, 20, 30);
    const second = paletteEntry('second', 10, 20, 30);

    for (const algorithm of ['cielab', 'weighted-rgb', 'rgb', 'luminance', 'hsv', 'hsl', 'brightness-color'] as const) {
      expect(bestPaletteMatch(10, 20, 30, [first, second], algorithm).option.id).toBe('first');
    }
  });

  it('matches the previous production matcher across all seven color spaces', () => {
    expect(matchFixtureDigest(bestPaletteMatch)).toBe('d051cf2ebfff78e00248ea7caf109aae9367ac50467aa74c0e1783cbb17da493');
  });

  it('keeps the first entry when no candidate has a comparable distance', () => {
    const first = paletteEntry('first', NaN, NaN, NaN);
    const second = paletteEntry('second', NaN, NaN, NaN);
    for (const entry of [first, second]) {
      entry.lab = { l: NaN, a: NaN, b: NaN };
      entry.hsv = { h: NaN, s: NaN, v: NaN };
      entry.hsl = { h: NaN, s: NaN, l: NaN };
    }
    for (const mode of MATCH_MODES) {
      expect(bestPaletteMatch(10, 20, 30, [first, second], mode)).toBe(first);
      expect(bestPaletteMatch(10, 20, 30, [], mode)).toBeUndefined();
    }
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

  it('reuses atlas readback across thresholds while applying minimum pixels per build', async () => {
    const mock = installImageCanvasMock({
      'mixed.png': {
        width: 2,
        height: 1,
        pixels: new Uint8ClampedArray([255, 0, 0, 10, 0, 255, 0, 11])
      }
    });
    const option = makePartOption('mixed', { icon: 'mixed.png' });
    const base = { ...IMAGE_TO_DECO_PRESETS.performance, alphaThreshold: 10, minSourceOpaquePixels: 1 };

    const first = await buildDecoPalette([option], base);
    const filtered = await buildDecoPalette([option], { ...base, minSourceOpaquePixels: 2 });
    const otherThreshold = await buildDecoPalette([option], { ...base, alphaThreshold: 11 });

    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ r: 0, g: 255, b: 0, opaquePixels: 1 });
    expect(filtered).toEqual([]);
    expect(otherThreshold).toEqual([]);
    expect(mock.getImageData).toHaveBeenCalledTimes(1);
  });

  it('shares one raster between concurrent thresholds without changing accepted colors or progress', async () => {
    const pixels = Uint8ClampedArray.of(1, 30, 90, 0, 5, 10, 15, 100, 80, 90, 100, 255);
    const mock = installImageCanvasMock({
      'concurrent-alpha.png': { width: 3, height: 1, pixels }
    });
    const option = makePartOption('concurrent-alpha', { icon: 'concurrent-alpha.png' });
    const base = { ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1 };
    const progress = vi.fn();
    const results = await Promise.all([Number.NaN, -0.5, 0, 99.99, 100, 254.9, 255, Infinity].map((alphaThreshold) =>
      buildDecoPalette([option], { ...base, alphaThreshold }, progress)
    ));
    const channels = results.map((palette) => palette.map(({ r, g, b, opaquePixels }) => [r, g, b, opaquePixels]));
    expect(channels).toEqual([
      [[86 / 3, 130 / 3, 205 / 3, 3]],
      [[86 / 3, 130 / 3, 205 / 3, 3]],
      [[42.5, 50, 57.5, 2]], [[42.5, 50, 57.5, 2]],
      [[80, 90, 100, 1]], [[80, 90, 100, 1]], [], []
    ]);
    expect(mock.getImageData).toHaveBeenCalledTimes(1);
    expect(progress.mock.calls).toEqual(Array.from({ length: 8 }, () => [{ stage: 'palette', done: 1, total: 1 }]));
  });

  it('bounds retained palettes and only rerasterizes an option evicted from the cache', async () => {
    const pixels = Uint8ClampedArray.of(34, 56, 78, 255);
    const mock = installImageCanvasMock({
      'alpha-limit.png': { width: 1, height: 1, pixels }
    });
    const options = Array.from({ length: 513 }, (_, index) =>
      makePartOption(`alpha-limit-${index}`, { icon: 'alpha-limit.png' })
    );
    const base = { ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1 };
    await buildDecoPalette(options, base);
    await buildDecoPalette([options[512]], { ...base, alphaThreshold: 100 });
    expect(mock.getImageData).toHaveBeenCalledTimes(513);
    await buildDecoPalette([options[0]], base);
    expect(mock.getImageData).toHaveBeenCalledTimes(514);
  });

  it('bounds retained raw pixel bytes before any threshold-table promotion', async () => {
    const images: Record<string, FakeImageData> = {};
    const options = Array.from({ length: 3 }, (_, index) => {
      const icon = `alpha-byte-limit-${index}.png`;
      images[icon] = { width: 1024, height: 1024, pixels: new Uint8ClampedArray(4 * 1024 * 1024) };
      images[icon].pixels.set([34, 56, 78, 255]);
      return makePartOption(`alpha-byte-limit-${index}`, { icon });
    });
    const mock = installImageCanvasMock(images);
    const base = { ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1 };

    await expect(buildDecoPalette(options, base)).resolves.toHaveLength(3);
    await expect(buildDecoPalette([options[2]], { ...base, alphaThreshold: 100 })).resolves.toHaveLength(1);
    expect(mock.getImageData).toHaveBeenCalledTimes(3);
    await expect(buildDecoPalette([options[0]], base)).resolves.toHaveLength(1);
    expect(mock.getImageData).toHaveBeenCalledTimes(4);
  });

  it('retries a failed canvas readback on the same option even under a new threshold', async () => {
    const pixels = Uint8ClampedArray.of(34, 56, 78, 200);
    const { getImageData } = installImageCanvasMock({
      'alpha-readback-retry.png': { width: 1, height: 1, pixels }
    });
    getImageData.mockImplementationOnce(() => { throw new Error('transient readback'); });
    const option = makePartOption('alpha-readback-retry', { icon: 'alpha-readback-retry.png' });
    const base = { ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1 };

    await expect(buildDecoPalette([option], base)).resolves.toEqual([]);
    await expect(buildDecoPalette([option], { ...base, alphaThreshold: 180 })).resolves.toMatchObject([
      { r: 34, g: 56, b: 78, opaquePixels: 1 }
    ]);
    expect(getImageData).toHaveBeenCalledTimes(2);
  });

  it('evicts rejected image and palette promises so a transient source failure can retry', async () => {
    const images: Record<string, FakeImageData> = {};
    const mock = installImageCanvasMock(images);
    const option = makePartOption('retry', { icon: 'transient-retry.png' });
    const options = { ...IMAGE_TO_DECO_PRESETS.performance, alphaThreshold: 0, minSourceOpaquePixels: 1 };

    await expect(buildDecoPalette([option], options)).resolves.toEqual([]);
    images['transient-retry.png'] = {
      width: 1,
      height: 1,
      pixels: new Uint8ClampedArray([12, 34, 56, 255])
    };

    await expect(buildDecoPalette([option], options)).resolves.toMatchObject([
      { r: 12, g: 34, b: 56, opaquePixels: 1 }
    ]);
    expect(mock.getImageData).toHaveBeenCalledTimes(1);
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

  it('keeps row-major asset IDs and fractional geometry in the converted output', async () => {
    installImageCanvasMock({
      'geometry-red.png': { width: 1, height: 1, pixels: Uint8ClampedArray.of(255, 0, 0, 255) },
      'geometry-blue.png': { width: 1, height: 1, pixels: Uint8ClampedArray.of(0, 0, 255, 255) },
      'blob:target': {
        width: 3, height: 2,
        pixels: Uint8ClampedArray.of(
          255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 0,
          0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255
        )
      }
    });
    const options = {
      ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1, gapFactor: 0.7,
      targetScaleMultiplier: 1.5, targetRatio: 0.25, maxLayers: 4
    };
    const result = await convertImageFileToDecos(new File(['x'], 'geometry.png'), [
      makePartOption('red', { icon: 'geometry-red.png' }),
      makePartOption('blue', { icon: 'geometry-blue.png' })
    ], options);

    const scaleX = (0.7 / 50) * 1.5;
    expect(result).toMatchObject({
      opaquePixels: 5, skippedPixels: 1, generatedPixels: 4, truncated: true,
      previewDataUrl: 'data:image/png;base64,mock',
      warnings: ['Layer limit reached. Generated 4 of 5 visible pixels.']
    });
    expect(result.decorations.map(({ assetId, name, x, y, scaleX, scaleY }) =>
      ({ assetId, name, x, y, scaleX, scaleY })
    )).toEqual([
      { assetId: 'red', name: 'geometry 0001', x: -0.7, y: -0.35, scaleX, scaleY: scaleX * 0.25 },
      { assetId: 'blue', name: 'geometry 0002', x: 0, y: -0.35, scaleX, scaleY: scaleX * 0.25 },
      { assetId: 'blue', name: 'geometry 0003', x: -0.7, y: 0.35, scaleX, scaleY: scaleX * 0.25 },
      { assetId: 'red', name: 'geometry 0004', x: 0, y: 0.35, scaleX, scaleY: scaleX * 0.25 }
    ]);
  });

  it('reuses a palette readback across conversions without changing decoration order, stats, or warnings', async () => {
    const mock = installImageCanvasMock({
      'red-255-cache.png': { width: 1, height: 1, pixels: new Uint8ClampedArray([255, 0, 0, 255]) },
      'red-254-cache.png': { width: 1, height: 1, pixels: new Uint8ClampedArray([254, 0, 0, 255]) },
      'blob:target': {
        width: 3,
        height: 1,
        pixels: new Uint8ClampedArray([
          255, 0, 0, 255,
          255, 0, 0, 255,
          254, 0, 0, 255
        ])
      }
    });
    let algorithmReads = 0;
    const options = {
      maxSize: 3,
      alphaThreshold: 10,
      gapFactor: 2,
      targetScaleMultiplier: 1,
      targetRatio: 1,
      maxLayers: 3,
      minSourceOpaquePixels: 1
    } as ImageToDecoConversionOptions;
    Object.defineProperty(options, 'colorAlgorithm', {
      get: () => {
        algorithmReads += 1;
        return 'rgb';
      }
    });
    const decoOptions = [
      makePartOption('red-255-cache', { icon: 'red-255-cache.png' }),
      makePartOption('red-254-cache', { icon: 'red-254-cache.png' })
    ];

    const first = await convertImageFileToDecos(new File(['x'], 'memo.png'), decoOptions, options);
    const firstReadCount = mock.getImageData.mock.calls.length;
    expect(algorithmReads).toBe(2);
    const second = await convertImageFileToDecos(new File(['x'], 'memo.png'), decoOptions, options);

    expect(first.decorations.map(({ id: _id, ...decoration }) => decoration)).toEqual(
      second.decorations.map(({ id: _id, ...decoration }) => decoration)
    );
    expect(first.decorations.map((decoration) => decoration.assetId)).toEqual([
      'red-255-cache',
      'red-255-cache',
      'red-254-cache'
    ]);
    expect({ ...first, decorations: [] }).toEqual({ ...second, decorations: [] });
    expect(mock.getImageData.mock.calls.length - firstReadCount).toBe(1);
    expect(algorithmReads).toBe(4);
  });

  it('preserves every progress notification without forcing a frame for each cheap stripe', async () => {
    const pixels = new Uint8ClampedArray(256 * 4);
    for (let offset = 0; offset < pixels.length; offset += 4) pixels.set([255, 0, 0, 255], offset);
    installImageCanvasMock({
      'frame-budget.png': { width: 1, height: 1, pixels: Uint8ClampedArray.of(255, 0, 0, 255) },
      'blob:target': { width: 1, height: 256, pixels }
    });
    const options = {
      ...IMAGE_TO_DECO_PRESETS.performance, maxSize: 256, maxLayers: 3, minSourceOpaquePixels: 1
    };
    const decoOptions = Array.from({ length: 65 }, (_, i) => makePartOption(`frame-budget-${i}`, { icon: 'frame-budget.png' }));
    const frame = vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; });
    Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: frame });
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      const progress = vi.fn();
      const result = await convertImageFileToDecos(new File(['x'], 'frame-budget.png'), decoOptions, options, progress);
      expect(frame).toHaveBeenCalledTimes(2);
      expect(progress.mock.calls.flatMap(([item]) => item.stage === 'palette' ? [item.done] : []))
        .toEqual([1, 17, 33, 49, 65]);
      expect(progress.mock.calls.flatMap(([item]) => item.stage === 'pixels' ? [item.done] : []))
        .toEqual([...Array.from({ length: 32 }, (_, i) => 1 + i * 8), 256]);
      expect(result).toMatchObject({ opaquePixels: 256, generatedPixels: 3, truncated: true });
      expect(result.decorations.map(({ assetId, y }) => [assetId, y])).toEqual([
        ['frame-budget-0', -255], ['frame-budget-0', -253], ['frame-budget-0', -251]
      ]);
    } finally {
      now.mockRestore();
    }
  });

  it('still yields between expensive palette entries before the next progress boundary', async () => {
    const pixels = Uint8ClampedArray.of(10, 20, 30, 255);
    const { getImageData } = installImageCanvasMock({
      'frame-budget-slow.png': { width: 1, height: 1, pixels }
    });
    let clock = 0;
    getImageData.mockImplementation(() => { clock += 9; });
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const frame = vi.fn((callback: FrameRequestCallback) => { callback(clock); return 1; });
    Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: frame });
    const options = { ...IMAGE_TO_DECO_PRESETS.performance, minSourceOpaquePixels: 1 };
    const decoOptions = Array.from({ length: 3 }, (_, i) => makePartOption(`slow-${i}`, { icon: 'frame-budget-slow.png' }));
    try {
      await expect(buildDecoPalette(decoOptions, options)).resolves.toHaveLength(3);
      expect(frame).toHaveBeenCalledTimes(3);
    } finally {
      now.mockRestore();
    }
  });
});
