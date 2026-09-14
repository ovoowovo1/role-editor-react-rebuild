import { describe, expect, it } from 'vitest';
import { makeDecorationLayer, makeRoleDocument, makeDecorationGroup } from '../../test/roleFixtures';
import { applyTransformUpdate } from './editorTransformUpdates';
import { applySingleTransformPatchToSelectedRole, nudgeSelectedRole, flipSelectedRole, applyGroupTransformToSelectedRole } from './editorGroupTransformCommands';
import { snapshotGroupSelection, DECO_GROUP_IDENTITY } from './decoGroupTransform';
import { createHistoryIdPool, makeBaseRoleHistoryEntry } from './editorRoleHistoryPatch';

function frozenRole() {
  const role = makeRoleDocument({
    positionRange: 60,
    decorations: [makeDecorationLayer('a'), makeDecorationLayer('b', { x: 10 }), makeDecorationLayer('c')],
    groups: [makeDecorationGroup('g', { itemIds: ['a', 'b'] })]
  });
  role.decorations.forEach(Object.freeze);
  role.groups!.forEach(group => { Object.freeze(group.itemIds); Object.freeze(group); });
  Object.freeze(role.decorations); Object.freeze(role.groups); Object.freeze(role);
  return role;
}

describe('immutable transform updates', () => {
  it('keeps other layers, groups and parts and does not mutate the previous document', () => {
    const role = frozenRole();
    const next = applyTransformUpdate(role, r => nudgeSelectedRole(r, ['a'], 1, 2));
    expect(next.decorations[0]).toMatchObject({ x: 1, y: 2 });
    expect(role.decorations[0]).toMatchObject({ x: 0, y: 0 });
    expect(next.decorations[1]).toBe(role.decorations[1]);
    expect(next.groups).toBe(role.groups);
    expect(next.headLayer).toBe(role.headLayer);
    expect(next.parts).toBe(role.parts);
  });

  it('keeps no-op documents and produces no history patch for equal, empty or clamped edits', () => {
    const role = frozenRole();
    for (const updater of [
      (r: typeof role) => nudgeSelectedRole(r, ['a'], 0, 0),
      (r: typeof role) => nudgeSelectedRole(r, ['missing'], 1, 0),
      (r: typeof role) => applySingleTransformPatchToSelectedRole(r, ['a'], { scale: 1, rotate: 360 })
    ]) {
      const next = applyTransformUpdate(role, updater);
      expect(next).toBe(role);
      expect(next.updatedAt).toBe(role.updatedAt);
      expect(makeBaseRoleHistoryEntry(role, next, createHistoryIdPool())).toBeNull();
    }
    const boundary = makeRoleDocument({ positionRange: 60, decorations: [makeDecorationLayer('a', { x: 60 })] });
    expect(applyTransformUpdate(boundary, r => nudgeSelectedRole(r, ['a'], 10, 0))).toBe(boundary);
  });

  it('supports group transforms and flipping while retaining unselected layers', () => {
    const role = frozenRole();
    const snapshot = snapshotGroupSelection(role.decorations.slice(0, 2))!;
    const moved = applyTransformUpdate(role, r => applyGroupTransformToSelectedRole(r, ['a', 'b'], snapshot, { ...DECO_GROUP_IDENTITY, dx: 5 }));
    expect(moved.decorations.map(d => d.x)).toEqual([5, 15, 0]);
    expect(moved.decorations[2]).toBe(role.decorations[2]);
    const flipped = applyTransformUpdate(role, r => flipSelectedRole(r, ['a'], 'horizontal'));
    expect(flipped.decorations[0].scaleX).toBe(-1);
    expect(flipped.decorations[1]).toBe(role.decorations[1]);
  });
});
