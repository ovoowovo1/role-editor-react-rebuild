import { describe, expect, it } from 'vitest';
import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../../types/role';
import {
  LOCAL_HISTORY_LIMIT,
  applyDecorationTransformTarget,
  applyTranslateDelta,
  captureDecorationTransforms,
  applyRoleHistoryPatch,
  createHistoryIdPool,
  createRoleHistoryPatch,
  makeRoleHistoryEntry,
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
      past = pushLocalHistoryEntry(past, makeRoleHistoryEntry(role({ name: `past-${index}` }), role())!);
      future = pushLocalFutureEntry(future, makeRoleHistoryEntry(role({ name: `future-${index}` }), role())!);
    }

    expect(past).toHaveLength(LOCAL_HISTORY_LIMIT);
    expect(future).toHaveLength(LOCAL_HISTORY_LIMIT);
    expect(past[0].kind === 'patch' && past[0].patch.name?.before).toBe('past-5');
    expect(future[0].kind === 'patch' && future[0].patch.name?.before).toBe(`future-${LOCAL_HISTORY_LIMIT + 4}`);
  });

  it('stores visibility changes as compact typed arrays without a full role snapshot', () => {
    const before = role({ decorations: [layer('a'), layer('b'), layer('c')] });
    const after = role({
      decorations: [layer('a', { visible: false }), layer('b'), layer('c', { visible: false })]
    });
    const patch = createRoleHistoryPatch(before, after, createHistoryIdPool());

    expect(patch).not.toBeNull();
    expect(patch).not.toHaveProperty('role');
    expect(patch?.decorations.fields).toEqual([]);
    expect(patch?.decorations.presence).toEqual([]);
    expect(patch?.decorations.visibility?.indices).toEqual(new Uint32Array([0, 2]));
    expect(patch?.decorations.visibility?.before).toEqual(new Uint8Array([1, 1]));
    expect(patch?.decorations.visibility?.after).toEqual(new Uint8Array([0, 0]));
  });

  it('round-trips visibility, head, scalar, structural, and group changes through a patch', () => {
    const before = role({
      name: 'before',
      headLayerIndex: 1,
      headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
      decorations: [layer('a'), layer('b')],
      groups: [group('parent', [{ type: 'layer', id: 'a' }, { type: 'layer', id: 'b' }])]
    });
    const after = role({
      name: 'after',
      headLayerIndex: 0,
      headLayer: { x: 3, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: false, opacity: 1 },
      decorations: [layer('b', { x: 8 }), layer('c', { visible: false })],
      groups: [group('parent', [{ type: 'layer', id: 'b' }]), group('child', [{ type: 'layer', id: 'c' }])]
    });
    const patch = createRoleHistoryPatch(before, after, createHistoryIdPool());

    expect(patch).not.toBeNull();
    const restoredBefore = applyRoleHistoryPatch(after, patch!, 'before');
    const restoredAfter = applyRoleHistoryPatch(restoredBefore, patch!, 'after');
    expect(restoredBefore).toEqual(before);
    expect(restoredAfter).toEqual(after);
  });

  it('does not create a patch for updatedAt-only changes', () => {
    const before = role({ updatedAt: 'before' });
    const after = role({ updatedAt: 'after' });

    expect(createRoleHistoryPatch(before, after)).toBeNull();
  });

  it('shares patch selection arrays when entries move between local stacks', () => {
    const selectionIds = ['a', 'b'];
    const entry = makeRoleHistoryEntry(role(), role({ name: 'next' }), selectionIds, selectionIds)!;
    const pushed = pushLocalHistoryEntry([], entry)[0];

    expect(pushed.kind).toBe('patch');
    if (pushed.kind === 'patch') expect(pushed.selectionIds).toBe(selectionIds);
  });

  it('keeps 10,000-layer visibility history compact across 200 entries', () => {
    const layerCount = 10_000;
    const historyCount = 200;
    const pool = createHistoryIdPool();
    let before = role({
      decorations: Array.from({ length: layerCount }, (_, index) => layer(`layer-${index}`))
    });
    const patches = [];

    for (let historyIndex = 0; historyIndex < historyCount; historyIndex += 1) {
      const visible = historyIndex % 2 === 1;
      const after = {
        ...before,
        decorations: before.decorations.map((item) => ({ ...item, visible })),
        updatedAt: `history-${historyIndex}`
      };
      const patch = createRoleHistoryPatch(before, after, pool);
      expect(patch).not.toBeNull();
      patches.push(patch!);
      before = after;
    }

    expect(pool.ids).toHaveLength(layerCount);
    expect(new Set(patches.map((patch) => patch.idPool)).size).toBe(1);
    expect(patches.every((patch) => patch.decorations.fields.length === 0)).toBe(true);
    expect(patches.every((patch) => patch.decorations.presence.length === 0)).toBe(true);
    expect(patches.every((patch) => patch.decorations.visibility?.indices.length === layerCount)).toBe(true);
    expect(patches.every((patch) => !('role' in patch))).toBe(true);

    const compactVisibilityBytes = patches.reduce(
      (total, patch) => total + (patch.decorations.visibility?.indices.byteLength ?? 0) +
        (patch.decorations.visibility?.before.byteLength ?? 0) +
        (patch.decorations.visibility?.after.byteLength ?? 0),
      0
    );
    expect(compactVisibilityBytes).toBe(layerCount * historyCount * (Uint32Array.BYTES_PER_ELEMENT + 2));
  });
});
