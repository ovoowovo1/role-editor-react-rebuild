import type { AutoCreateTwroleResult } from '../lib/conversion/autoCreateTwrole';

export type RgbaTuple = readonly [red: number, green: number, blue: number, alpha: number];

export interface SyntheticRgbaFixture {
  width: number;
  height: number;
  straight: Uint8ClampedArray;
  premult: Float32Array;
  mask: Uint8Array;
  maskCount: number;
}

type PixelFactory = (x: number, y: number) => RgbaTuple;

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function makeRgbaPixels(
  width: number,
  height: number,
  pixel: RgbaTuple | PixelFactory
): Uint8ClampedArray {
  const safeWidth = Math.max(0, Math.trunc(width));
  const safeHeight = Math.max(0, Math.trunc(height));
  const data = new Uint8ClampedArray(safeWidth * safeHeight * 4);

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      const rgba = typeof pixel === 'function' ? pixel(x, y) : pixel;
      const offset = (y * safeWidth + x) * 4;
      data[offset] = clampByte(rgba[0]);
      data[offset + 1] = clampByte(rgba[1]);
      data[offset + 2] = clampByte(rgba[2]);
      data[offset + 3] = clampByte(rgba[3]);
    }
  }

  return data;
}

export function referencePremultiply(straight: Uint8ClampedArray): Float32Array {
  if (straight.length % 4 !== 0) throw new Error('RGBA data length must be divisible by four.');
  const premult = new Float32Array(straight.length);

  for (let offset = 0; offset < straight.length; offset += 4) {
    const alpha = straight[offset + 3];
    const alphaFraction = alpha / 255;
    premult[offset] = straight[offset] * alphaFraction;
    premult[offset + 1] = straight[offset + 1] * alphaFraction;
    premult[offset + 2] = straight[offset + 2] * alphaFraction;
    premult[offset + 3] = alpha;
  }

  return premult;
}

export function makeAlphaMask(straight: Uint8ClampedArray, alphaThreshold = 10): Uint8Array {
  if (straight.length % 4 !== 0) throw new Error('RGBA data length must be divisible by four.');
  const mask = new Uint8Array(straight.length / 4);

  for (let pixel = 0, offset = 3; pixel < mask.length; pixel += 1, offset += 4) {
    mask[pixel] = straight[offset] > alphaThreshold ? 1 : 0;
  }

  return mask;
}

export function makeSyntheticRgbaFixture(
  width: number,
  height: number,
  pixel: RgbaTuple | PixelFactory,
  alphaThreshold = 10
): SyntheticRgbaFixture {
  const safeWidth = Math.max(0, Math.trunc(width));
  const safeHeight = Math.max(0, Math.trunc(height));
  const straight = makeRgbaPixels(safeWidth, safeHeight, pixel);
  const mask = makeAlphaMask(straight, alphaThreshold);
  let maskCount = 0;
  for (const value of mask) maskCount += value;

  return {
    width: safeWidth,
    height: safeHeight,
    straight,
    premult: referencePremultiply(straight),
    mask,
    maskCount
  };
}

export function normalizeAutoCreateResult(result: AutoCreateTwroleResult) {
  const { previewDataUrl: _previewDataUrl, decorations, ...stableResult } = result;
  return {
    ...stableResult,
    decorations: decorations.map(({ id: _id, ...decoration }) => ({ ...decoration })),
    exportJson: {
      deco: result.exportJson.deco.map((entry) => ({ ...entry }))
    },
    warnings: [...result.warnings]
  };
}
