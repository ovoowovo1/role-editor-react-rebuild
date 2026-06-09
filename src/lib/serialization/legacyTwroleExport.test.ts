import { ungzip } from 'pako';
import { describe, expect, it, vi } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import { buildLegacyCompactPayload, createRoleJsonBlobWithThumb, createTwroleBlobWithThumb } from './legacyTwroleExport';
import { md5Hex } from './md5';

vi.mock('../stage/fullRoleRenderer', () => ({
  renderFullRoleToDataUrl: vi.fn(async () => ({
    dataUrl: 'data:image/png;base64,ZmFrZS10aHVtYg==',
    width: 256,
    height: 256,
    alphaPixels: 4,
    nonTransparentBounds: { minX: 110, minY: 120, maxX: 111, maxY: 121 },
    warnings: [],
    missingTextureCount: 0
  }))
}));

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
  const groups: DecorationGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      itemIds: ['a', HEAD_LAYER_ID],
      members: [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: HEAD_LAYER_ID }
      ],
      visible: true,
      collapsed: false
    }
  ];
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'royal',
    gender: 'female',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 2, hand: 3, foot: 4, cape: 5 },
    partScales: { head: 1.5, hand: 1.1, foot: 1.2, cape: 1.3 },
    headLayerIndex: 1,
    headLayer: { x: 3, y: 4, scaleX: 1.5, scaleY: 1.5, rotation: 45, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('hidden', { visible: false }), layer('b')],
    groups,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('legacy twrole export', () => {
  it('hashes strings with MD5 for legacy thumb hashes', () => {
    expect(md5Hex('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
  });

  it('builds compact payload with camp/gender dr and bottom-to-top visible decos', () => {
    const payload = buildLegacyCompactPayload(role());

    expect(payload.data.dr).toBe(5);
    expect(payload.data.cr.head).toEqual({ f: 2, s: 1.5 });
    expect(payload.data.cr.cape).toEqual({ f: 5, s: 1.3 });
    expect(payload.data.cr.deco.map((item) => item.c)).toEqual(['b', 'head', 'a']);
    expect(payload.data.cr.deco[1].r).toBeCloseTo(Math.PI / 4);
    expect(payload.decoGroups).toHaveLength(1);
  });

  it('exports JSON with a rendered thumb and hash', async () => {
    const blob = await createRoleJsonBlobWithThumb(role());
    const payload = JSON.parse(await blob.text());

    expect(payload.hash).toBe(md5Hex(payload.thumb.dataUrl));
    expect(payload.hash).not.toBe('');
    expect(payload.thumb.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(payload.thumb.pivot).toEqual({ x: 18, y: 8 });
    expect(payload.data.cr.deco.map((item: { c: string }) => item.c)).toEqual(['b', 'head', 'a']);
  });

  it('exports twrole gzip with a rendered thumb and hash', async () => {
    const blob = await createTwroleBlobWithThumb(role());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const payload = JSON.parse(ungzip(bytes.slice(2), { to: 'string' }) as string);

    expect(Array.from(bytes.slice(0, 2))).toEqual([0, 1]);
    expect(payload.hash).toBe(md5Hex(payload.thumb.dataUrl));
    expect(payload.thumb.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(typeof payload.thumb.pivot.x).toBe('number');
    expect(typeof payload.thumb.pivot.y).toBe('number');
  });
});
