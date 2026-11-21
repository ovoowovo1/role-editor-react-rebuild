import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { RoleDocument } from '../types/role';
import {
  ungroupInRole,
  type GroupRoleUpdate
} from '../lib/editor/editorGroupMutations';
import {
  createGroupFromLayerSelection,
  groupContainsHeadLayer,
  setGroupVisibilityIncludingHead,
  ungroupIncludingHead
} from '../lib/editor/headLayerMutations';

interface UseRoleGroupCommandsOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedLayerIds: string[];
  commitRole(nextRole: RoleDocument, afterSelectionIds?: string[]): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
  updateGroupRole(update: GroupRoleUpdate): void;
}

export function useRoleGroupCommands({
  role,
  roleRef,
  selectedLayerIds,
  commitRole,
  updateRole,
  updateGroupRole
}: UseRoleGroupCommandsOptions) {
  const groupSelected = useCallback(() => {
    const nextRole = createGroupFromLayerSelection(roleRef.current, selectedLayerIds);
    if (!nextRole) return;
    commitRole(nextRole);
  }, [commitRole, roleRef, selectedLayerIds]);

  const toggleGroupCollapsed = useCallback(
    (groupId: string) => updateGroupRole({ type: 'toggle-collapsed', groupId }),
    [updateGroupRole]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => updateGroupRole({ type: 'rename', groupId, name }),
    [updateGroupRole]
  );

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (groupContainsHeadLayer(roleRef.current, groupId)) {
        commitRole(setGroupVisibilityIncludingHead(roleRef.current, groupId, group.visible === false));
        return;
      }
      updateGroupRole({ type: 'set-visibility', groupId, visible: group.visible === false });
    },
    [commitRole, role.groups, roleRef, updateGroupRole]
  );

  const ungroup = useCallback(
    (groupId: string) => {
      const group = role.groups?.find((item) => item.id === groupId);
      if (group && groupContainsHeadLayer(roleRef.current, groupId)) {
        commitRole(ungroupIncludingHead(roleRef.current, groupId));
        return;
      }
      updateRole((current) => {
        ungroupInRole(current, groupId);
        return current;
      });
    },
    [commitRole, role.groups, roleRef, updateRole]
  );

  return {
    groupSelected,
    toggleGroupCollapsed,
    renameGroup,
    toggleGroupVisibility,
    ungroup
  };
}
