import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { RoleDocument } from '../types/role';
import {
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupInRole
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
  commitRole(nextRole: RoleDocument): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
}

export function useRoleGroupCommands({
  role,
  roleRef,
  selectedLayerIds,
  commitRole,
  updateRole
}: UseRoleGroupCommandsOptions) {
  const groupSelected = useCallback(() => {
    const nextRole = createGroupFromLayerSelection(roleRef.current, selectedLayerIds);
    if (!nextRole) return;
    commitRole(nextRole);
  }, [commitRole, roleRef, selectedLayerIds]);

  const toggleGroupCollapsed = useCallback(
    (groupId: string) => {
      updateRole((current) => {
        toggleGroupCollapsedInRole(current, groupId);
        return current;
      });
    },
    [updateRole]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) => {
      updateRole((current) => {
        renameGroupInRole(current, groupId, name);
        return current;
      });
    },
    [updateRole]
  );

  const setGroupVisible = useCallback(
    (groupId: string, visible: boolean) => {
      updateRole((current) => {
        setGroupVisibleInRole(current, groupId, visible);
        return current;
      });
    },
    [updateRole]
  );

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      const group = role.groups?.find((item) => item.id === groupId);
      if (!group) return;
      if (groupContainsHeadLayer(roleRef.current, groupId)) {
        commitRole(setGroupVisibilityIncludingHead(roleRef.current, groupId, group.visible === false));
        return;
      }
      setGroupVisible(groupId, group.visible === false);
    },
    [commitRole, role.groups, roleRef, setGroupVisible]
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
