import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../../constants/layers';
import type { RoleDocument } from '../../types/role';
import type { LayerReorderOptions } from './editorLayerDrag';
import { syncGroups } from './editorRoleUtils';
import { directParentGroup, membersForGroup, withGroupMembers } from './groupTree';
import { atomsForRole, deriveRoleFromAtoms, rowIdToAtoms } from './layerOrdering';

export function reorderGroupWithoutUngrouping(
  role: RoleDocument,
  activeRowId: string,
  overRowId: string,
  options: LayerReorderOptions = {}
): RoleDocument | null {
  if (options.intent === 'join-group') return null;
  if (!activeRowId.startsWith(GROUP_ROW_PREFIX)) return null;
  const activeGroupId = activeRowId.slice(GROUP_ROW_PREFIX.length);
  const movingAtoms = rowIdToAtoms(role, activeRowId);
  const overAtoms = rowIdToAtoms(role, overRowId);
  if (!movingAtoms.length || !overAtoms.length) return null;
  const overSet = new Set(overAtoms);
  if (movingAtoms.some((atom) => overSet.has(atom))) return null;

  const originalAtoms = atomsForRole(role);
  const movingSet = new Set(movingAtoms);
  const remainingAtoms: typeof originalAtoms = [];
  let sourceStart = -1;
  let overStart = -1;
  let firstRemainingOver = -1;
  let lastRemainingOver = -1;
  for (let index = 0; index < originalAtoms.length; index += 1) {
    const atom = originalAtoms[index];
    if (movingSet.has(atom)) {
      if (sourceStart < 0) sourceStart = index;
      continue;
    }
    if (overSet.has(atom)) {
      if (overStart < 0) {
        overStart = index;
        firstRemainingOver = remainingAtoms.length;
      }
      lastRemainingOver = remainingAtoms.length;
    }
    remainingAtoms.push(atom);
  }
  if (sourceStart < 0 || overStart < 0) return null;

  const insertAfter = options.placement === 'after' || (options.placement !== 'before' && sourceStart < overStart);
  const targetIndex = insertAfter ? lastRemainingOver + 1 : firstRemainingOver;
  const nextAtoms = [...remainingAtoms.slice(0, targetIndex), ...movingAtoms, ...remainingAtoms.slice(targetIndex)];
  const nextRole = deriveRoleFromAtoms(role, nextAtoms);
  const sourceParent = directParentGroup(role.groups ?? [], { type: 'group', id: activeGroupId });
  const targetMember = overRowId.startsWith(GROUP_ROW_PREFIX)
    ? { type: 'group' as const, id: overRowId.slice(GROUP_ROW_PREFIX.length) }
    : overRowId === HEAD_ROW_ID
      ? { type: 'layer' as const, id: HEAD_LAYER_ID }
      : { type: 'layer' as const, id: overRowId.startsWith(ITEM_ROW_PREFIX) ? overRowId.slice(ITEM_ROW_PREFIX.length) : overRowId };
  const targetParent = directParentGroup(role.groups ?? [], targetMember);
  if (sourceParent && sourceParent.id !== targetParent?.id) {
    nextRole.groups = (nextRole.groups ?? []).map((group) => {
      if (group.id !== sourceParent.id) return group;
      return withGroupMembers(
        group,
        membersForGroup(group).filter((member) => !(member.type === 'group' && member.id === activeGroupId)),
        nextRole.groups ?? []
      );
    });
  }
  return syncGroups(nextRole);
}

