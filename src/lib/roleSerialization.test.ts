import { describe, expect, it } from 'vitest';
import { gzip } from 'pako';
import type { DecorationLayer, RoleDocument } from '../types/role';
import {
  createTwroleBlob,
  exportOriginalLikeRoleConfig,
  isMissingDecoAssetId,
  makeMissingDecoAssetId,
  normalizeImportedRole,
  parseRoleBytes
} from './roleSerialization';

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 1,
    y: 2,
    scaleX: 1,
    scaleY: 1,
    rotation: 90,
    visible: true,
    opacity: 1,
    ...patch
  };
}

function role(patch: Partial<RoleDocument> = {}): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'twilight',
    gender: 'male',
    positionRange: 60,
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 1, hand: 1, foot: 1, cape: 1 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 1,
    headLayer: { x: 3, y: 4, scaleX: 1.2, scaleY: 1.2, rotation: 45, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('role serialization', () => {
  it('marks unknown deco ids as missing placeholders', () => {
    const assetId = makeMissingDecoAssetId('missing_deco');

    expect(assetId).toBe('deco:missing:missing_deco');
    expect(isMissingDecoAssetId(assetId)).toBe(true);
    expect(isMissingDecoAssetId('normal')).toBe(false);
  });

  it('normalizes schema v1 roles and warns about missing deco symbols', () => {
    const result = normalizeImportedRole({
      ...role({
        positionRange: '20000' as unknown as number,
        headLayerIndex: '99' as unknown as number,
        decorations: [
          { code: 'missing_deco', x: '5', y: '6', sx: '-2', sy: '0.5', r: Math.PI / 2 }
        ] as unknown as DecorationLayer[]
      })
    });

    expect(result.role.positionRange).toBe(10000);
    expect(result.role.headLayerIndex).toBe(1);
    expect(result.role.decorations[0]).toMatchObject({
      code: 'missing_deco',
      x: 5,
      y: 6,
      scaleX: -2,
      scaleY: 0.5,
      rotation: 90
    });
    expect(isMissingDecoAssetId(result.role.decorations[0].assetId)).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('Missing deco symbols'))).toBe(true);
  });

  it('parses JSON role bytes', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'json-role' })));

    const result = parseRoleBytes(bytes);

    expect(result.role.name).toBe('json-role');
    expect(result.role.decorations).toHaveLength(2);
  });

  it('parses raw gzip and base64 gzip JSON role bytes', () => {
    const json = JSON.stringify(role({ name: 'gzip-role' }));
    const compressed = gzip(json);
    const base64 = Buffer.from(compressed).toString('base64');

    expect(parseRoleBytes(compressed).role.name).toBe('gzip-role');
    expect(parseRoleBytes(new TextEncoder().encode(base64)).role.name).toBe('gzip-role');
  });

  it('round-trips exported twrole bytes through the legacy parser path', async () => {
    const blob = createTwroleBlob(role());
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const result = parseRoleBytes(bytes);

    expect(result.role.decorations).toHaveLength(2);
    expect(result.role.headLayer).toMatchObject({ x: 3, y: 4, rotation: 45 });
    expect(result.warnings[0]).toContain('legacy or foreign role file');
  });

  it('exports an original-like config with the head layer and radians', () => {
    const config = exportOriginalLikeRoleConfig(role());

    expect(config.head).toEqual({ f: 1, s: 1.2 });
    expect(config.deco).toHaveLength(3);
    expect(config.deco[0]).toMatchObject({ c: 'b' });
    expect(config.deco[1]).toMatchObject({ c: 'head', x: 3, y: 4 });
    expect(config.deco[1].r).toBeCloseTo(Math.PI / 4);
  });
});
