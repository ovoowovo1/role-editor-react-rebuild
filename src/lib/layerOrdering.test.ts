import { describe, expect, it } from 'vitest';
import { GROUP_ROW_PREFIX, HEAD_ATOM, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import {
  DEFAULT_INSERT_SETTINGS,
  getInsertVirtualIndex,
  insertDecorations,
  settingsForScope
} from './editorInsertSettings';
import {
  atomToLayerId,
  atomsForRole,
  deriveRoleFromAtoms,
  getHeadLayerIndex,
  layerIdsForRole,
  layerIdToAtom,
  orderedLayerIds,
  rowIdToAtoms
} from './layerOrdering';

function layer(id: string): DecorationLayer {
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
    opacity: 1
  };
}

function group(id: string, members: NonNullable<DecorationGroup['members']>): DecorationGroup {
  return {
    id,
    name: id,
    itemIds: members.filter((member) => member.type === 'layer').map((member) => member.id),
    members,
    visible: true,
    collapsed: false
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
    headLayerIndex: 1,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('layer ordering and insert settings', () => {
  it('maps head atoms and clamps head layer indexes', () => {
    expect(layerIdToAtom(HEAD_LAYER_ID)).toBe(HEAD_ATOM);
    expect(atomToLayerId(HEAD_ATOM)).toBe(HEAD_LAYER_ID);
    expect(getHeadLayerIndex(role({ headLayerIndex: 99 }))).toBe(3);
    expect(atomsForRole(role())).toEqual(['a', HEAD_ATOM, 'b', 'c']);
    expect(layerIdsForRole(role())).toEqual(['a', HEAD_LAYER_ID, 'b', 'c']);
    expect(orderedLayerIds(role(), ['c', HEAD_LAYER_ID, 'a'])).toEqual(['a', HEAD_LAYER_ID, 'c']);
  });

  it('resolves row ids into role atoms including grouped descendants', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'c' }
        ])
      ]
    });

    expect(rowIdToAtoms(current, HEAD_ROW_ID)).toEqual([HEAD_ATOM]);
    expect(rowIdToAtoms(current, `${ITEM_ROW_PREFIX}b`)).toEqual(['b']);
    expect(rowIdToAtoms(current, `${GROUP_ROW_PREFIX}g1`)).toEqual(['a', 'c']);
  });

  it('derives decorations and head index from atom order', () => {
    const extra = new Map([['x', layer('x')]]);
    const next = deriveRoleFromAtoms(role(), ['c', 'x', HEAD_ATOM, 'a'], extra);

    expect(next.decorations.map((item) => item.id)).toEqual(['c', 'x', 'a']);
    expect(next.headLayerIndex).toBe(2);
  });

  it('computes virtual insert indexes and inserts decorations around head', () => {
    const current = role();

    expect(getInsertVirtualIndex(current, { ...DEFAULT_INSERT_SETTINGS, placement: 'top' })).toBe(0);
    expect(getInsertVirtualIndex(current, { ...DEFAULT_INSERT_SETTINGS, placement: 'bottom' })).toBe(4);
    expect(getInsertVirtualIndex(current, { ...DEFAULT_INSERT_SETTINGS, placement: 'after_index', index: '2' })).toBe(2);
    expect(getInsertVirtualIndex(current, { ...DEFAULT_INSERT_SETTINGS, placement: 'after_index', index: 'bad' })).toBe(4);
    expect(settingsForScope(DEFAULT_INSERT_SETTINGS, false).placement).toBe('bottom');

    const next = insertDecorations(current, [layer('x')], { ...DEFAULT_INSERT_SETTINGS, placement: 'after_index', index: '1' });
    expect(next.decorations.map((item) => item.id)).toEqual(['a', 'x', 'b', 'c']);
    expect(next.headLayerIndex).toBe(2);
  });
});
