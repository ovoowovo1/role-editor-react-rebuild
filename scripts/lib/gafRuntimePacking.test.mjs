import { describe, expect, it } from 'vitest';
import { encodeActorFloat32MatrixPool, packGafRuntimeManifest, splitPackedWeaponRuntime } from './gafRuntimePacking.mjs';

describe('build-time GAF packing', () => {
  it('reuses identical matrices without changing values, painter order or source fields', () => {
    const matrix = { a: 1, b: 0.12345678912345678, c: -1.25, d: 2, tx: 100, ty: 50 };
    const first = { objectId: '7', zIndex: 1, alpha: 0.25, matrix, maskId: null, colorTransform: null };
    const second = { ...first, objectId: '3', zIndex: 0, maskId: 'mask' };
    const third = { ...first, objectId: '4', colorTransform: [1, 1, 0.5, 1, 0, 0, 0] };
    const actorRuntime = {
      timelinesById: {
        a: { frames: { '1': [first, second] } },
        b: { frames: { '1': [third], '2': [] } }
      }
    };
    const fallback = { schemaVersion: 2, source: 'fallback' };
    const input = { ...fallback, actorRuntime };
    const packed = packGafRuntimeManifest(input);
    expect(packed.actorRuntime.matrixPool).toEqual([[1, 0.12345678912345678, -1.25, 2, 100, 50]]);
    expect(packed.actorRuntime.timelinesById).toEqual({
      a: { packedFrames: { '1': [['7', 1, 0.25, 0], ['3', 0, 0.25, 0, 'mask']] } },
      b: { packedFrames: { '1': [['4', 1, 0.25, 0, null, third.colorTransform]], '2': [] } }
    });
    expect(input.actorRuntime.timelinesById.a.frames['1']).toEqual([first, second]);
    expect(packGafRuntimeManifest(fallback)).toEqual(fallback);
  });
});

it('splits unchanged weapon data, keeping only exact timeline eligibility keys at startup', () => {
  const assetsRuntime = {
    timelinesById: { '10': { id: '10' }, '11': { id: '11' } },
    timelinesByLinkage: { equipped: '10', '11': '11', blank: '', missing: null }
  };
  const actorRuntime = { timelinesById: {} };
  const split = splitPackedWeaponRuntime({ assetsRuntime, actorRuntime, source: 'parsed' });
  expect(split.weaponRuntime).toBe(assetsRuntime);
  expect(split.startupRuntime).toEqual({
    actorRuntime, source: 'parsed', weaponRuntimeTimelineKeys: ['10', '11', 'equipped']
  });
  expect(splitPackedWeaponRuntime({ source: 'fallback' })).toEqual({
    startupRuntime: { source: 'fallback', weaponRuntimeTimelineKeys: [] },
    weaponRuntime: null
  });
});


describe('exact actor Float32 matrix encoding', () => {
  it('uses little-endian, preserves every value and canonicalizes signed zero, without changing other pools', () => {
    const exact = [1, Math.fround(0.13), -0, 1, -120.5, 0];
    const decorationRuntime = { matrixPool: [exact] };
    const assetsRuntime = { matrixPool: [exact] };
    const before = { actorRuntime: { matrixPool: [exact], timelineScale: 2 }, decorationRuntime, assetsRuntime };
    const actor = encodeActorFloat32MatrixPool(before);
    expect(actor.actorRuntime.matrixPool).toBeUndefined();
    expect(actor.actorRuntime.timelineScale).toBe(2);
    expect(actor.decorationRuntime).toBe(decorationRuntime);
    expect(actor.assetsRuntime).toBe(assetsRuntime);
    const binary = Buffer.from(actor.actorRuntime.matrixPoolFloat32LE, 'base64');
    expect(binary.length).toBe(24);
    expect(binary.toString('hex', 0, 4)).toBe('0000803f');
    expect(Array.from({ length: 6 }, (_, i) => binary.readFloatLE(i * 4))).toEqual(JSON.parse(JSON.stringify(exact)));
    expect(before.actorRuntime.matrixPool).toEqual([exact]);
    expect(encodeActorFloat32MatrixPool(before)).toEqual(actor);
  });

  it('does not treat sparse matrix arrays as valid data', () => {
    const sparseValues = { actorRuntime: { matrixPool: [Array(6)] } };
    const sparseMatrices = { actorRuntime: { matrixPool: Array(1) } };
    expect(encodeActorFloat32MatrixPool(sparseValues)).toBe(sparseValues);
    expect(encodeActorFloat32MatrixPool(sparseMatrices)).toBe(sparseMatrices);
  });

  it.each([0.13, Infinity, NaN])('retains the original pool if any value %s is inexact or invalid', (value) => {
    const unencoded = { actorRuntime: { matrixPool: [[1, 0, 0, 1, value, 2]] } };
    expect(encodeActorFloat32MatrixPool(unencoded)).toBe(unencoded);
  });
});
