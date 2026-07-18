import { beforeEach, describe, expect, it, vi } from 'vitest';
import { partOptions } from '../../../mock/options';
import { decorationRuntimeManifest } from '../../runtime/gafRuntimeManifest';
import { resolveGafFrameOneDisplayList } from '../../runtime/gafFrameDisplayList';

interface RecordedDraw {
  alpha: number;
  matrix: [number, number, number, number, number, number];
  region: [number, number, number, number];
}

const canvasFixture = vi.hoisted(() => ({
  canvases: [] as Array<{ width: number; height: number; draws: RecordedDraw[] }>
}));

vi.mock('./platform', async (importOriginal) => {
  const original = await importOriginal<typeof import('./platform')>();
  return {
    ...original,
    createCanvas(width: number, height: number) {
      const canvas = { width, height, draws: [] as RecordedDraw[] };
      canvasFixture.canvases.push(canvas);
      return canvas;
    },
    get2d(canvas: { draws: RecordedDraw[] }) {
      let alpha = 1;
      let matrix: RecordedDraw['matrix'] = [1, 0, 0, 1, 0, 0];
      const stack: Array<{ alpha: number; matrix: RecordedDraw['matrix'] }> = [];
      return {
        imageSmoothingEnabled: true,
        clearRect: vi.fn(),
        save() {
          stack.push({ alpha, matrix: [...matrix] as RecordedDraw['matrix'] });
        },
        restore() {
          const restored = stack.pop();
          if (restored) {
            alpha = restored.alpha;
            matrix = restored.matrix;
          }
        },
        get globalAlpha() {
          return alpha;
        },
        set globalAlpha(value: number) {
          alpha = value;
        },
        setTransform(a: number, b: number, c: number, d: number, tx: number, ty: number) {
          matrix = [a, b, c, d, tx, ty];
        },
        drawImage(_image: unknown, x: number, y: number, width: number, height: number) {
          canvas.draws.push({ alpha, matrix: [...matrix] as RecordedDraw['matrix'], region: [x, y, width, height] });
        }
      };
    }
  };
});

import {
  gafFrameOneDisplayListSignature,
  rasterizeDecorationFrameOne
} from './gafSourceRaster';

function option(code: string) {
  const found = partOptions.deco.find((candidate) => candidate.code === code);
  if (!found) throw new Error(`Missing test decoration ${code}`);
  return found;
}

describe('AutoCreate exact GAF source raster', () => {
  beforeEach(() => {
    canvasFixture.canvases.length = 0;
  });

  for (const code of ['third_deco_05', 'third_xmas_deco_05', 'royal_xmas_deco_06']) {
    it(`draws the complete native frame-one display list for ${code}`, () => {
      if (!decorationRuntimeManifest) throw new Error('Expected decoration runtime manifest');
      const sourceOption = option(code);
      const displayList = resolveGafFrameOneDisplayList(decorationRuntimeManifest, code);
      const raster = rasterizeDecorationFrameOne(sourceOption, {} as ImageBitmap);

      expect(raster).not.toBeNull();
      const canvas = canvasFixture.canvases[0];
      expect(canvas.width).toBe(raster!.width);
      expect(canvas.height).toBe(raster!.height);
      expect(canvas.draws).toHaveLength(displayList.length);
      const originX = raster!.localCenterX - raster!.width / 2;
      const originY = raster!.localCenterY - raster!.height / 2;

      for (let index = 0; index < displayList.length; index += 1) {
        const item = displayList[index];
        const draw = canvas.draws[index];
        expect(draw.region).toEqual([
          item.region.x,
          item.region.y,
          item.region.width,
          item.region.height
        ]);
        expect(draw.alpha).toBeCloseTo(item.alpha, 7);
        expect(draw.matrix).toEqual([
          item.matrix.a,
          item.matrix.b,
          item.matrix.c,
          item.matrix.d,
          item.matrix.tx - originX,
          item.matrix.ty - originY
        ]);
      }
    });
  }

  it('includes the full display-list policy in the v3 source signature input', () => {
    const rotatedHalfAlpha = gafFrameOneDisplayListSignature(option('third_deco_05'));
    const layered = gafFrameOneDisplayListSignature(option('third_xmas_deco_05'));

    expect(rotatedHalfAlpha).toContain(':0.500000:');
    expect(layered.split(';')).toHaveLength(3);
    expect(layered).not.toBe(rotatedHalfAlpha);
  });
});
