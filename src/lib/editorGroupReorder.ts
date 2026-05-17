import { GROUP_ROW_PREFIX, HEAD_LAYER_ID, HEAD_ROW_ID, ITEM_ROW_PREFIX } from '../constants/layers';
import type { RoleDocument } from '../types/role';
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
  if (movingAtoms.some((atom) => overAtoms.includes(atom))) return null;

  const originalAtoms = atomsForRole(role);
  const movingSet = new Set(movingAtoms);
  const overSet = new Set(overAtoms);
  const sourceIndexes = originalAtoms.map((atom, index) => (movingSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  const overIndexes = originalAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!sourceIndexes.length || !overIndexes.length) return null;

  const sourceStart = Math.min(...sourceIndexes);
  const overStart = Math.min(...overIndexes);
  const remainingAtoms = originalAtoms.filter((atom) => !movingSet.has(atom));
  const remainingOverIndexes = remainingAtoms.map((atom, index) => (overSet.has(atom) ? index : -1)).filter((index) => index >= 0);
  if (!remainingOverIndexes.length) return null;

  const targetIndex = options.placement === 'before'
    ? Math.min(...remainingOverIndexes)
    : options.placement === 'after'
      ? Math.max(...remainingOverIndexes) + 1
      : sourceStart < overStart
        ? Math.max(...remainingOverIndexes) + 1
        : Math.min(...remainingOverIndexes);
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

