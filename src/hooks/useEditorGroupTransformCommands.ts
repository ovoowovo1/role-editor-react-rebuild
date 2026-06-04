import { useCallback, type MutableRefObject } from 'react';
import type { RoleDocument, TransformValues } from '../types/role';
import type {
  DecoGroupParentTransform,
  DecoGroupSnapshot
} from '../lib/editor/decoGroupTransform';
import {
  getFirstSelected,
  positionRangeFromRole
} from '../lib/editor/editorRoleUtils';
import {
  applyGroupTransformToSelectedRole,
  applySingleTransformPatchToSelectedRole,
  nextGroupTransformForNudge,
  nextGroupTransformForPatch,
  nudgeSelectedRole,
  syncGroupTransformToActualFirstPosition,
  type ValueBounds
} from '../lib/editor/editorGroupTransformCommands';
import { useEditorGroupTransformAdjustCommands } from './useEditorGroupTransformAdjustCommands';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

export function useEditorGroupTransformCommands({
  role,
  roleRef,
  selectedDecorationIds,
  updateRole,
  groupTransformRef,
  scaleBounds,
  ensureGroupSnapshot,
  setCurrentGroupTransform
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  updateRole: UpdateRole;
  groupTransformRef: MutableRefObject<DecoGroupParentTransform>;
  scaleBounds: ValueBounds;
  ensureGroupSnapshot(): DecoGroupSnapshot | null;
  setCurrentGroupTransform(next: DecoGroupParentTransform): void;
}) {
  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      const isMultiSelect = selectedDecorationIds.length > 1 && !!snapshot;

      if (isMultiSelect && snapshot) {
        const currentRole = roleRef.current;
        const first = getFirstSelected(currentRole, selectedDecorationIds);
        if (!first) return;

        const currentGroupTransform = syncGroupTransformToActualFirstPosition(groupTransformRef.current, snapshot, first);
        const boundedGroupTransform = nextGroupTransformForPatch({
          currentTransform: currentGroupTransform,
          snapshot,
          first,
          patch,
          scaleBounds,
          positionRange: positionRangeFromRole(currentRole)
        });

        setCurrentGroupTransform(boundedGroupTransform);

        updateRole(
          (current) => applyGroupTransformToSelectedRole(current, selectedDecorationIds, snapshot, boundedGroupTransform),
          commit
        );
        return;
      }

      updateRole((current) => applySingleTransformPatchToSelectedRole(current, selectedDecorationIds, patch), commit);
    },
    [ensureGroupSnapshot, groupTransformRef, roleRef, scaleBounds, selectedDecorationIds, setCurrentGroupTransform, updateRole]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const first = getFirstSelected(roleRef.current, selectedDecorationIds);
        const currentGroupTransform = first
          ? syncGroupTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
          : groupTransformRef.current;
        const boundedParent = nextGroupTransformForNudge(
          currentGroupTransform,
          snapshot,
          dx,
          dy,
          positionRangeFromRole(roleRef.current)
        );
        updateRole(
          (current) => applyGroupTransformToSelectedRole(current, selectedDecorationIds, snapshot, boundedParent),
          commit
        );
        setCurrentGroupTransform(boundedParent);
        return;
      }
      updateRole((current) => nudgeSelectedRole(current, selectedDecorationIds, dx, dy), commit);
    },
    [ensureGroupSnapshot, groupTransformRef, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]
  );

  const adjustCommands = useEditorGroupTransformAdjustCommands({
    role,
    roleRef,
    selectedDecorationIds,
    updateRole,
    groupTransformRef,
    ensureGroupSnapshot,
    setCurrentGroupTransform,
    updateSelectedTransform
  });

  return {
    updateSelectedTransform,
    nudgeSelected,
    ...adjustCommands
  };
}
