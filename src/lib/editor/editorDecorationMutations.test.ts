import { describe, expect, it } from 'vitest';
import type { DecorationGroup, DecorationLayer, EditorClipboardItem, RoleDocument } from '../../types/role';
import {
  deleteSelectedFromRole,
  mirrorCopySelectedInRole,
  pasteClipboardIntoRole,
  setSelectedVisibleInRole
} from './editorDecorationMutations';

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
    rotation: 30,
    visible: true,
    opacity: 1,
    ...patch
  };
}

function role(): RoleDocument {
  const groups: DecorationGroup[] = [
    {
      id: 'g1',
      name: 'Group 1',
      itemIds: ['a', 'c'],
      members: [
        { type: 'layer', id: 'a' },
        { type: 'layer', id: 'c' }
      ],
      visible: true,
      collapsed: false
    }
  ];
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'x',
    gender: 'male',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 0, hand: 0, foot: 0, cape: 0 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 2,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c')],
    groups,
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('editor decoration mutations', () => {
  it('sets visibility only for selected decorations', () => {
    const current = role();

    setSelectedVisibleInRole(current, ['a', 'c'], false);

    expect(current.decorations.map((item) => [item.id, item.visible])).toEqual([
      ['a', false],
      ['b', true],
      ['c', false]
    ]);
  });

  it('deletes selected decorations and shifts the head layer index', () => {
    const current = role();

    deleteSelectedFromRole(current, ['a', 'c']);

    expect(current.decorations.map((item) => item.id)).toEqual(['b']);
    expect(current.headLayerIndex).toBe(1);
    expect(current.groups[0].members).toEqual([]);
    expect(current.groups[0].itemIds).toEqual([]);
  });

  it('pastes clipboard items after the selection and moves the head layer', () => {
    const current = role();
    const clipboard: EditorClipboardItem[] = [
      { code: 'x', assetId: 'x', name: 'x', x: 1, y: 2, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
      { code: 'y', assetId: 'y', name: 'y', x: 3, y: 4, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 }
    ];

    const pastedIds = pasteClipboardIntoRole(current, clipboard, ['a'], 5);

    expect(pastedIds).toHaveLength(2);
    expect(current.decorations.map((item) => item.code)).toEqual(['a', 'x', 'y', 'b', 'c']);
    expect(current.decorations[1]).toMatchObject({ x: 6, y: 7 });
    expect(current.decorations[2]).toMatchObject({ x: 8, y: 9 });
    expect(current.headLayerIndex).toBe(4);
  });

  it('creates mirrored copies with normalized rotation', () => {
    const current = role();

    const copiedIds = mirrorCopySelectedInRole(current, ['a'], 'horizontal');

    expect(copiedIds).toHaveLength(1);
    expect(current.decorations.map((item) => item.id)).toHaveLength(4);
    expect(current.decorations[1]).toMatchObject({ code: 'a', x: -1, scaleX: -1, rotation: -30 });
    expect(current.headLayerIndex).toBe(3);
  });
});
