import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { RoleDocument } from '../types/role';
import { moveSelectedToBoundaryInRole } from '../lib/editor/editorDecorationMutations';
import { reorderBaseEditorLayersImmutable, type LayerReorderOptions } from '../lib/editor/editorLayerDrag';
import { reorderGroupWithoutUngrouping } from '../lib/editor/editorGroupReorder';
import { reorderIncludingHead } from '../lib/editor/headLayerMutations';

interface UseRoleLayerCommandsOptions {
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  selectedLayerIds: string[];
  commitRole(nextRole: RoleDocument): void;
  setRole(updater: (current: RoleDocument) => RoleDocument, mode: 'history' | 'silent'): void;
  updateRole(updater: (current: RoleDocument) => RoleDocument, commit?: boolean): void;
}

export function useRoleLayerCommands({
  roleRef,
  selectedDecorationIds,
  selectedLayerIds,
  commitRole,
  setRole,
  updateRole
}: UseRoleLayerCommandsOptions) {
  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string, options: LayerReorderOptions = {}) => {
      if (activeRowId === overRowId) return;

      const nextRole = reorderGroupWithoutUngrouping(roleRef.current, activeRowId, overRowId, options);
      if (nextRole) {
        commitRole(nextRole);
        return;
      }

      const headNextRole = reorderIncludingHead(roleRef.current, activeRowId, overRowId, selectedLayerIds, options);
      if (headNextRole) {
        commitRole(headNextRole);
        return;
      }

      setRole(
        (current) => reorderBaseEditorLayersImmutable(current, activeRowId, overRowId, selectedDecorationIds, options) ?? current,
        'history'
      );
    },
    [commitRole, roleRef, selectedDecorationIds, selectedLayerIds, setRole]
  );

  const moveSelectedToBoundary = useCallback(
    (boundary: 'top' | 'bottom') => {
      if (!selectedDecorationIds.length) return;
      updateRole((current) => {
        moveSelectedToBoundaryInRole(current, selectedDecorationIds, boundary);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  return {
    reorderDecorations,
    moveSelectedToBoundary
  };
}
