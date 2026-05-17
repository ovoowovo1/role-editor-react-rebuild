import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import {
  LOCAL_HISTORY_LIMIT,
  applyDecorationTransformTarget,
  applyTranslateDelta,
  captureDecorationTransforms,
  makeSnapshotEntry,
  pushLocalFutureEntry,
  pushLocalHistoryEntry,
  removeSelectedDecos,
  sameTransformTarget,
  validSelectionIds,
  type LocalHistoryEntry
} from './editorTransformHistory';

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
    headLayerIndex: 2,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b'), layer('c')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

describe('editor transform history', () => {
  it('applies translation only to real selected decoration ids', () => {
    const current = role({ decorations: [layer('a', { x: 1, y: 2 }), layer('b', { x: 3, y: 4 })] });

    const next = applyTranslateDelta(current, ['a', HEAD_LAYER_ID], 2.25, -1.25);

    expect(next.decorations[0]).toMatchObject({ x: 3.25, y: 0.75 });
    expect(next.decorations[1]).toMatchObject({ x: 3, y: 4 });
    expect(applyTranslateDelta(current, ['a'], 0, 0)).toBe(current);
  });

  it('captures and reapplies decoration transform snapshots', () => {
    const current = role({ decorations: [layer('a', { x: 1, rotation: 30 }), layer('b', { y: 2 })] });
    const target = captureDecorationTransforms(current, ['b', 'a', HEAD_LAYER_ID]);

    const changed = role({ decorations: [layer('a', { x: 99 }), layer('b', { y: 99 })] });
    const restored = applyDecorationTransformTarget(changed, target);

    expect(target.map((item) => item.id)).toEqual(['a', 'b']);
    expect(restored.decorations[0]).toMatchObject({ x: 1, rotation: 30 });
    expect(restored.decorations[1]).toMatchObject({ y: 2 });
    expect(sameTransformTarget(target, captureDecorationTransforms(restored, ['a', 'b']))).toBe(true);
  });

  it('removes selected decorations, shifts head index, and prunes invalid groups', () => {
    const current = role({
      groups: [
        group('g1', [
          { type: 'layer', id: 'a' },
          { type: 'layer', id: 'b' }
        ])
      ]
    });

    const next = removeSelectedDecos(current, ['a']);

    expect(next?.decorations.map((item) => item.id)).toEqual(['b', 'c']);
    expect(next?.headLayerIndex).toBe(1);
    expect(next?.groups).toEqual([]);
    expect(removeSelectedDecos(current, [HEAD_LAYER_ID])).toBeNull();
  });

  it('keeps valid unique selection ids including head', () => {
    expect(validSelectionIds(role(), ['a', 'missing', HEAD_LAYER_ID, 'a', 'b'])).toEqual(['a', HEAD_LAYER_ID, 'b']);
  });

  it('bounds local history and future entries to the history limit', () => {
    let past: LocalHistoryEntry[] = [];
    let future: LocalHistoryEntry[] = [];
    for (let index = 0; index < LOCAL_HISTORY_LIMIT + 5; index += 1) {
      past = pushLocalHistoryEntry(past, makeSnapshotEntry(role({ name: `past-${index}` })));
      future = pushLocalFutureEntry(future, makeSnapshotEntry(role({ name: `future-${index}` })));
    }

    expect(past).toHaveLength(LOCAL_HISTORY_LIMIT);
    expect(future).toHaveLength(LOCAL_HISTORY_LIMIT);
    expect(past[0].kind === 'snapshot' && past[0].role.name).toBe('past-5');
    expect(future[0].kind === 'snapshot' && future[0].role.name).toBe(`future-${LOCAL_HISTORY_LIMIT + 4}`);
  });
});
