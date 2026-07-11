import { describe, expect, it } from 'vitest';
import { splitGafManifestPayload } from './gafManifestPayload.mjs';

function payload(patch = {}) {
  return {
    schemaVersion: 2,
    source: 'test',
    assetManifest: { actor: '/actor.gaf' },
    decorationGafSymbols: ['deco'],
    decorationAtlasFrameData: { deco: { x: 0 } },
    actorAtlasFrameData: { actor: [{ x: 0 }] },
    actorFallbackFrameCounts: { head: 1, hand: 1, foot: 1, cape: 1 },
    ...patch
  };
}

describe('GAF manifest payload split', () => {
  it('keeps catalog data out of runtime and runtime data out of metadata', () => {
    const { metadata, runtime } = splitGafManifestPayload(payload({
      decorationRuntime: { name: 'decoration' },
      assetsRuntime: { name: 'assets' },
      actorRuntime: {
        name: 'actor',
        timelinesByLinkage: { actor01_body: 'body' },
        timelinesById: {
          body: { sequences: { IDLE: { startFrame: 3, endFrame: 6 } } }
        }
      }
    }));

    expect(metadata).not.toHaveProperty('decorationRuntime');
    expect(metadata).not.toHaveProperty('assetsRuntime');
    expect(metadata).not.toHaveProperty('actorRuntime');
    expect(metadata.actorBodyAnimationSequences).toEqual({ IDLE: { startFrame: 3, endFrame: 6 } });
    expect(runtime).not.toHaveProperty('assetManifest');
    expect(runtime).not.toHaveProperty('decorationGafSymbols');
    expect(runtime).toMatchObject({
      decorationRuntime: { name: 'decoration' },
      assetsRuntime: { name: 'assets' },
      actorRuntime: { name: 'actor' }
    });
  });

  it('omits unavailable fallback runtimes instead of creating truthy empty objects', () => {
    const { metadata, runtime } = splitGafManifestPayload(payload());

    expect(metadata.actorBodyAnimationSequences).toEqual({});
    expect(runtime).toEqual({ schemaVersion: 2, source: 'test' });
  });
});
