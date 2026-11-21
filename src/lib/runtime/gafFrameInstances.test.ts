import { describe, expect, it, vi } from 'vitest';
import type { GafPackedTimeline, GafRuntimeManifest, GafTimelineSerialized } from '../../types/gafRuntime';
import { gafFrameInstances } from './gafFrameInstances';

const metadata = {
  id: '71',
  linkage: 'preview',
  framesCount: 2,
  bounds: { x: 0, y: 0, width: 1, height: 1 },
  pivot: { x: 0, y: 0 },
  animationObjects: {}
};
const matrix = { a: 1.2, b: -0.01, c: 0.02, d: 1, tx: 17, ty: -23 };

describe('GAF frame instance reading', () => {
  it('decodes packed frames lazily in source order with exact transforms and optional values', () => {
    const color = [1, 1, 0.2, 1, 3, 4, 5];
    const timeline: GafPackedTimeline = {
      ...metadata,
      packedFrames: { '1': [['9', 2, 0.75, 0], ['6', 1, 1, 0, 'mask', color]], '2': [['6', 5, 1, 0, 'mask']] }
    };
    const manifest: GafRuntimeManifest = {
      elements: {},
      timelinesById: { '71': timeline },
      timelinesByLinkage: { preview: '71' },
      matrixPool: [[1.2, -0.01, 0.02, 1, 17, -23]]
    };
    const decoded = gafFrameInstances(manifest, timeline, '1');
    expect(decoded).toEqual([
      { objectId: '9', zIndex: 2, alpha: 0.75, matrix, maskId: null, colorTransform: null },
      { objectId: '6', zIndex: 1, alpha: 1, matrix, maskId: 'mask', colorTransform: color }
    ]);
    expect(gafFrameInstances(manifest, timeline, '1')).toBe(decoded);
    expect(gafFrameInstances(manifest, timeline, '2')[0]).toMatchObject({ maskId: 'mask', colorTransform: null });
    expect(gafFrameInstances(manifest, timeline, '3')).toEqual([]);
  });

  it('reads exact little-endian actor matrices once, only when a packed frame needs one', () => {
    const raw = Buffer.alloc(48);
    const expected = {
      a: Math.fround(0.105),
      b: Math.fround(-0.17),
      c: Math.fround(7.123456),
      d: 1.25,
      tx: -8192.25,
      ty: 0
    };
    Object.values(expected).forEach((value, index) => raw.writeFloatLE(value, 24 + index * 4));
    const timeline: GafPackedTimeline = {
      ...metadata,
      packedFrames: { '1': [['1', 0, 1, 1]], '2': [['2', 1, 0.9, 1]] }
    };
    const manifest: GafRuntimeManifest = {
      elements: {}, timelinesById: { '71': timeline }, timelinesByLinkage: { preview: '71' },
      matrixPoolFloat32LE: raw.toString('base64')
    };
    const atobSpy = vi.spyOn(globalThis, 'atob');
    try {
      expect(gafFrameInstances(manifest, timeline, '999')).toEqual([]);
      expect(atobSpy).not.toHaveBeenCalled();
      expect(gafFrameInstances(manifest, timeline, '1')[0].matrix).toEqual(expected);
      expect(gafFrameInstances(manifest, timeline, '2')[0].matrix).toEqual(expected);
      expect(atobSpy).toHaveBeenCalledExactlyOnceWith(manifest.matrixPoolFloat32LE);
    } finally {
      atobSpy.mockRestore();
    }
  });

  it('keeps plain legacy and standalone decoration frames supported', () => {
    const frames = { '1': [{ objectId: '1', zIndex: 0, alpha: 1, matrix, maskId: null, colorTransform: null }] };
    const timeline: GafTimelineSerialized = { ...metadata, frames };
    const manifest: GafRuntimeManifest = { elements: {}, timelinesById: {}, timelinesByLinkage: {} };
    expect(gafFrameInstances(manifest, timeline, '1')).toBe(frames['1']);
    expect(gafFrameInstances(manifest, timeline, '2')).toEqual([]);
  });
});
