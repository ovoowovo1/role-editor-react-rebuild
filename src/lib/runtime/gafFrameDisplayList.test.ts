import { describe, expect, it } from 'vitest';
import type { GafRuntimeManifest, GafTimelineSerialized } from '../../types/gafRuntime';
import { decorationRuntimeManifest } from './gafRuntimeManifest';
import { resolveGafFrameOneDisplayList } from './gafFrameDisplayList';

function expectMatrix(
  actual: { a: number; b: number; c: number; d: number; tx: number; ty: number },
  expected: { a: number; b: number; c: number; d: number; tx: number; ty: number }
): void {
  expect(actual.a).toBeCloseTo(expected.a, 6);
  expect(actual.b).toBeCloseTo(expected.b, 6);
  expect(actual.c).toBeCloseTo(expected.c, 6);
  expect(actual.d).toBeCloseTo(expected.d, 6);
  expect(actual.tx).toBeCloseTo(expected.tx, 6);
  expect(actual.ty).toBeCloseTo(expected.ty, 6);
}

function decorations(): GafRuntimeManifest {
  if (!decorationRuntimeManifest) throw new Error('Expected generated decoration runtime manifest');
  return decorationRuntimeManifest;
}

describe('GAF frame-one display-list resolver', () => {
  it('resolves third_deco_05 alpha, rotation and timeline-scaled translation', () => {
    const items = resolveGafFrameOneDisplayList(decorations(), 'third_deco_05');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      order: 0,
      zIndexPath: [0],
      objectIdPath: ['551'],
      timelineId: '319',
      elementId: '160',
      alpha: 0.5,
      region: { x: 1016, y: 624, width: 20, height: 18 }
    });
    expectMatrix(items[0].matrix, {
      a: 0,
      b: -1,
      c: 1,
      d: 0,
      tx: -8.600000381469727,
      ty: 9.800000190734863
    });
  });

  it('preserves the three-layer painter order for third_xmas_deco_05', () => {
    const items = resolveGafFrameOneDisplayList(decorations(), 'third_xmas_deco_05');

    expect(items.map((item) => item.objectId)).toEqual(['823', '433', '825']);
    expect(items.map((item) => item.zIndexPath)).toEqual([[0], [1], [2]]);
    expect(items.map((item) => item.alpha)).toEqual([1, 0.39800000190734863, 1]);
    expect(items.map((item) => item.elementId)).toEqual(['822', '42', '824']);
    expectMatrix(items[0].matrix, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: -2.4000000953674316,
      ty: -17.200000762939453
    });
    expectMatrix(items[1].matrix, {
      a: 0.00012209266424179077,
      b: -1,
      c: 1,
      d: 0.00001526111736893654,
      tx: -2.4000000953674316,
      ty: 11.399999618530273
    });
    expectMatrix(items[2].matrix, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: -24.799999237060547,
      ty: -12.199999809265137
    });
  });

  it('preserves royal_xmas_deco_06 pivot placement and z-order', () => {
    const items = resolveGafFrameOneDisplayList(decorations(), 'royal_xmas_deco_06');

    expect(items.map((item) => item.objectId)).toEqual(['827', '433', '441']);
    expect(items.map((item) => item.elementId)).toEqual(['826', '42', '50']);
    expectMatrix(items[0].matrix, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: -0.6000000238418579,
      ty: -13.800000190734863
    });
    expectMatrix(items[1].matrix, {
      a: 0.00013735424727201462,
      b: -0.9999542236328125,
      c: 0.999969482421875,
      d: 0.00001526111736893654,
      tx: -2.799999952316284,
      ty: 12.199999809265137
    });
    expectMatrix(items[2].matrix, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: -26.100000381469727,
      ty: -11.800000190734863
    });
  });

  it('flattens nested timelines while composing affine, pivot, scale and alpha', () => {
    const child: GafTimelineSerialized = {
      id: 'child',
      linkage: 'child',
      framesCount: 1,
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      pivot: { x: 0, y: 0 },
      animationObjects: {
        leaf: { regionId: 'element', type: 'texture', mask: false }
      },
      frames: {
        '1': [{
          objectId: 'leaf',
          zIndex: 4,
          alpha: 0.25,
          maskId: null,
          colorTransform: null,
          matrix: { a: 1, b: 0, c: 0, d: 1, tx: 1, ty: 2 }
        }]
      }
    };
    const root: GafTimelineSerialized = {
      id: 'root',
      linkage: 'nested-test',
      framesCount: 1,
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      pivot: { x: 0, y: 0 },
      animationObjects: {
        childInstance: { regionId: 'child', type: 'timeline', mask: false },
        top: { regionId: 'top-element', type: 'texture', mask: false }
      },
      frames: {
        '1': [
          {
            objectId: 'top',
            zIndex: 2,
            alpha: 1,
            maskId: null,
            colorTransform: null,
            matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
          },
          {
            objectId: 'childInstance',
            zIndex: 1,
            alpha: 0.5,
            maskId: null,
            colorTransform: null,
            matrix: { a: 0, b: 1, c: -1, d: 0, tx: 10, ty: 20 }
          }
        ]
      }
    };
    const manifest: GafRuntimeManifest = {
      timelineScale: 2,
      elements: {
        element: {
          atlasID: 'atlas',
          elementAtlasID: 'element',
          region: { x: 0, y: 0, width: 8, height: 9 },
          pivotX: 4,
          pivotY: 6,
          scaleX: 2,
          scaleY: 3,
          linkageName: ''
        },
        'top-element': {
          atlasID: 'atlas',
          elementAtlasID: 'top-element',
          region: { x: 8, y: 0, width: 1, height: 1 },
          pivotX: 0,
          pivotY: 0,
          scaleX: 1,
          scaleY: 1,
          linkageName: ''
        }
      },
      timelinesById: { root, child },
      timelinesByLinkage: { 'nested-test': 'root' }
    };

    const items = resolveGafFrameOneDisplayList(manifest, 'nested-test');

    expect(items.map((item) => item.objectId)).toEqual(['leaf', 'top']);
    expect(items[0].zIndexPath).toEqual([1, 4]);
    expect(items[0].objectIdPath).toEqual(['childInstance', 'leaf']);
    expect(items[0].alpha).toBe(0.125);
    expectMatrix(items[0].matrix, {
      a: 0,
      b: 0.5,
      c: -1 / 3,
      d: 0,
      tx: 8,
      ty: 20
    });
  });
});
