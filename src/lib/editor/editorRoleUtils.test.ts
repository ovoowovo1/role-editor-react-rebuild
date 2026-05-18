import { describe, expect, it } from 'vitest';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { clampDecoRatio, clampDecoScaleForLayer, positionRangeFromRole, syncGroups } from './editorRoleUtils';

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1,
    ...patch
  };
}

function role(patch: Partial<RoleDocument> = {}): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'x',
    gender: 'male',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 0, hand: 0, foot: 0, cape: 0 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 10,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor role utils', () => {
  it('normalizes position ranges', () => {
    expect(positionRangeFromRole(role({ positionRange: 120 }))).toBe(120);
    expect(positionRangeFromRole(role({ positionRange: '80' as unknown as number }))).toBe(80);
    expect(positionRangeFromRole(role({ positionRange: -1 }))).toBe(60);
    expect(positionRangeFromRole(role({ positionRange: 20000 }))).toBe(10000);
  });

  it('clamps decoration ratio and scale by layer type', () => {
    expect(clampDecoRatio(-9)).toBe(5);
    expect(clampDecoScaleForLayer(-9, layer('deco'))).toBe(5);
    expect(clampDecoScaleForLayer(0.5, layer('head', { code: 'head' }))).toBe(1);
    expect(clampDecoScaleForLayer(3, layer('head', { code: 'head' }))).toBe(2);
  });

  it('syncs head layer bounds and removes invalid groups', () => {
    const synced = syncGroups(role({
      groups: [
        {
          id: 'g1',
          name: 'Group 1',
          itemIds: ['a', 'missing'],
          members: [
            { type: 'layer', id: 'a' },
            { type: 'layer', id: 'missing' }
          ],
          visible: true,
          collapsed: false
        }
      ]
    }));

    expect(synced.headLayerIndex).toBe(2);
    expect(synced.groups).toEqual([]);
  });
});
