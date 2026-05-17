import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { buildLegacyCompactPayload } from './legacyTwroleExport';

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
  it('builds compact payload with camp/gender dr and bottom-to-top visible decos', () => {
    const payload = buildLegacyCompactPayload(role());

    expect(payload.data.dr).toBe(5);
    expect(payload.data.cr.head).toEqual({ f: 2, s: 1.5 });
    expect(payload.data.cr.cape).toEqual({ f: 5, s: 1.3 });
    expect(payload.data.cr.deco.map((item) => item.c)).toEqual(['b', 'head', 'a']);
    expect(payload.data.cr.deco[1].r).toBeCloseTo(Math.PI / 4);
    expect(payload.decoGroups).toHaveLength(1);
  });
});
