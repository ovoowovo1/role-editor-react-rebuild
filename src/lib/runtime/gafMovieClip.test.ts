import { Sprite, Texture } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import type { GafFrameInstanceSerialized, GafRuntimeManifest } from '../../types/gafRuntime';
import { GafMovieClip } from './gafMovieClip';
import { decorationRuntimeManifest } from './gafRuntimeManifest';

describe('GAF timeline render order', () => {
  it('sorts immutable frames only once across clips, keeping source order on equal z', () => {
    const firstZ = vi.fn(() => 2);
    const makeInstance = (objectId: string, zIndex: number): GafFrameInstanceSerialized => ({
      objectId,
      zIndex,
      alpha: 1,
      maskId: null,
      colorTransform: null,
      matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
    });
    const high = makeInstance('high', 2);
    Object.defineProperty(high, 'zIndex', { get: firstZ });
    const instances = [high, makeInstance('low', 1), makeInstance('highSecond', 2)];
    const metadata = {
      linkage: '',
      framesCount: 1,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      pivot: { x: 0, y: 0 }
    };
    const manifest: GafRuntimeManifest = {
      elements: {},
      timelinesByLinkage: {},
      timelinesById: {
        parent: {
          ...metadata,
          id: 'parent',
          animationObjects: Object.fromEntries(instances.map(({ objectId }) => [
            objectId, { regionId: 'child', type: 'timeline', mask: false }
          ])),
          namedParts: { high: 'high', low: 'low', highSecond: 'highSecond' },
          frames: { '1': instances }
        },
        child: { ...metadata, id: 'child', animationObjects: {}, frames: {} }
      }
    };
    const makeClip = () => new GafMovieClip(new Set(), {
      kind: 'timeline', manifest, timelineId: 'parent', textureUrl: 'unused'
    });
    const clip = makeClip();
    expect(firstZ).toHaveBeenCalled();
    firstZ.mockClear();

    const secondClip = makeClip();
    clip.gotoAndStop(1);
    expect(firstZ).not.toHaveBeenCalled();
    expect(instances.map((instance) => instance.objectId)).toEqual(['high', 'low', 'highSecond']);
    for (const rendered of [clip, secondClip]) {
      expect(rendered.children.map((child) => child.name)).toEqual(['low', 'high', 'highSecond']);
      rendered.destroy({ children: true });
    }
  });
});

describe('shared frame-one geometry ownership', () => {
  it('uses separate sprites and subtextures and keeps the second clip alive after destroying the first', () => {
    const manifest = decorationRuntimeManifest!;
    const timelineId = manifest.timelinesByLinkage.third_xmas_deco_05;
    const texture = Texture.fromBuffer(new Uint8Array(2048 * 2048 * 4), 2048, 2048);
    const fromSource = vi.spyOn(Texture, 'from').mockReturnValue(texture);
    const makeClip = (failed = new Set<string>()) => new GafMovieClip(failed, {
      kind: 'timeline', manifest, timelineId, textureUrl: 'fake-atlas.png', timelineScale: manifest.timelineScale,
      frameOneDisplayList: true
    });
    const failed = makeClip(new Set(['fake-atlas.png']));
    const first = makeClip();
    const second = makeClip();
    try {
      expect(failed.children).toHaveLength(0);
      expect(first.children).toHaveLength(3);
      expect(second.children).toHaveLength(3);
      for (let index = 0; index < first.children.length; index += 1) {
        const left = first.children[index] as Sprite;
        const right = second.children[index] as Sprite;
        expect(left).not.toBe(right);
        expect(left.texture).not.toBe(right.texture);
        expect(left.texture.baseTexture).toBe(right.texture.baseTexture);
        expect(left.alpha).toBe(right.alpha);
        left.transform.updateLocalTransform();
        right.transform.updateLocalTransform();
        expect(left.localTransform).toEqual(right.localTransform);
      }
      first.destroy({ children: true, texture: true, baseTexture: false });
      expect(second.children.every((child) => !child.destroyed)).toBe(true);
      expect((second.children[0] as Sprite).texture.baseTexture).toBe(texture.baseTexture);
      expect(texture.baseTexture.destroyed).toBe(false);
    } finally {
      failed.destroy({ children: true });
      if (!first.destroyed) first.destroy({ children: true, texture: true, baseTexture: false });
      second.destroy({ children: true, texture: true, baseTexture: false });
      fromSource.mockRestore();
      texture.destroy(true);
    }
  });
});
