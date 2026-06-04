import { useCallback, type MutableRefObject } from 'react';
import type { RoleDocument, TransformValues } from '../types/role';
import { normalizeDegrees } from '../lib/math';
import type {
  DecoGroupParentTransform,
  DecoGroupSnapshot
} from '../lib/editor/decoGroupTransform';
import { getFirstSelected } from '../lib/editor/editorRoleUtils';
import {
  applyGroupTransformToSelectedRole,
  flipSelectedRole,
  nextGroupTransformForFlip,
  syncGroupTransformToActualFirstPosition
} from '../lib/editor/editorGroupTransformCommands';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

export function useEditorGroupTransformAdjustCommands({
  role,
  roleRef,
  selectedDecorationIds,
  updateRole,
  groupTransformRef,
  ensureGroupSnapshot,
  setCurrentGroupTransform,
  updateSelectedTransform
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  updateRole: UpdateRole;
  groupTransformRef: MutableRefObject<DecoGroupParentTransform>;
  ensureGroupSnapshot(): DecoGroupSnapshot | null;
  setCurrentGroupTransform(next: DecoGroupParentTransform): void;
  updateSelectedTransform(patch: Partial<TransformValues>, commit?: boolean): void;
}) {
  const rotateSelectedBy = useCallback(
    (degrees: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      const current = snapshot && selectedDecorationIds.length > 1
        ? groupTransformRef.current.rotationDeg
        : getFirstSelected(role, selectedDecorationIds)?.rotation ?? 0;
      updateSelectedTransform({ rotate: normalizeDegrees(current + degrees) }, commit);
    },
    [ensureGroupSnapshot, groupTransformRef, role, selectedDecorationIds, updateSelectedTransform]
  );

  const scaleSelectedBy = useCallback(
    (amount: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const currentGroupTransform = groupTransformRef.current;
        const signX = currentGroupTransform.scaleX >= 0 ? 1 : -1;
        const target = Math.abs(currentGroupTransform.scaleX) + amount;
        updateSelectedTransform({ scale: target * signX }, commit);
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const signX = first.scaleX >= 0 ? 1 : -1;
      updateSelectedTransform({ scale: (Math.abs(first.scaleX) + amount) * signX }, commit);
    },
    [ensureGroupSnapshot, groupTransformRef, role, selectedDecorationIds, updateSelectedTransform]
  );

  const ratioSelectedBy = useCallback(
    (amount: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const currentGroupTransform = groupTransformRef.current;
        const ratio = currentGroupTransform.scaleY / (currentGroupTransform.scaleX || 1);
        updateSelectedTransform({ ratio: ratio + amount }, commit);
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const ratio = first.scaleY / (first.scaleX || 1);
      updateSelectedTransform({ ratio: ratio + amount }, commit);
    },
    [ensureGroupSnapshot, groupTransformRef, role, selectedDecorationIds, updateSelectedTransform]
  );

  const flipSelected = useCallback((commit = true) => {
    const snapshot = ensureGroupSnapshot();
    if (snapshot && selectedDecorationIds.length > 1) {
      const first = getFirstSelected(roleRef.current, selectedDecorationIds);
      const currentGroupTransform = first
        ? syncGroupTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
        : groupTransformRef.current;
      const nextParent = nextGroupTransformForFlip(currentGroupTransform, 'horizontal');
      updateRole(
        (current) => applyGroupTransformToSelectedRole(current, selectedDecorationIds, snapshot, nextParent),
        commit
      );
      setCurrentGroupTransform(nextParent);
      return;
    }
    updateRole((current) => flipSelectedRole(current, selectedDecorationIds, 'horizontal'), commit);
  }, [ensureGroupSnapshot, groupTransformRef, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]);

  const flipSelectedVertical = useCallback((commit = true) => {
    const snapshot = ensureGroupSnapshot();
    if (snapshot && selectedDecorationIds.length > 1) {
      const first = getFirstSelected(roleRef.current, selectedDecorationIds);
      const currentGroupTransform = first
        ? syncGroupTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
        : groupTransformRef.current;
      const nextParent = nextGroupTransformForFlip(currentGroupTransform, 'vertical');
      updateRole(
        (current) => applyGroupTransformToSelectedRole(current, selectedDecorationIds, snapshot, nextParent),
        commit
      );
      setCurrentGroupTransform(nextParent);
      return;
    }
    updateRole((current) => flipSelectedRole(current, selectedDecorationIds, 'vertical'), commit);
  }, [ensureGroupSnapshot, groupTransformRef, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]);

  return {
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical
  };
}
