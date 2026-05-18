import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument, TransformValues } from '../types/role';
import { normalizeDegrees } from '../lib/math';
import {
  snapshotGroupSelection,
  snapshotKeyFromIds,
  type DecoGroupParentTransform,
  type DecoGroupSnapshot
} from '../lib/editor/decoGroupTransform';
import {
  getFirstSelected,
  orderedSelectedDecorations,
  positionRangeFromRole
} from '../lib/editor/editorRoleUtils';
import {
  applyGroupTransformToSelectedRole,
  applySingleTransformPatchToSelectedRole,
  editValuesForGroupTransform,
  flipSelectedRole,
  groupRatioBoundsForSnapshot,
  groupScaleBoundsForSnapshot,
  makeDefaultGroupTransform,
  nextGroupTransformForFlip,
  nextGroupTransformForNudge,
  nextGroupTransformForPatch,
  nudgeSelectedRole,
  selectionRatioBounds,
  selectionScaleBounds,
  syncGroupTransformToActualFirstPosition
} from '../lib/editor/editorGroupTransformCommands';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

const LARGE_SELECTION_SNAPSHOT_CAP = 80;

export function useEditorGroupTransform({
  role,
  roleRef,
  selectedDecorationIds,
  selectedDecorations,
  updateRole
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  selectedDecorations: DecorationLayer[];
  updateRole: UpdateRole;
}) {
  const [groupSnapshot, setGroupSnapshot] = useState<DecoGroupSnapshot | null>(null);
  const [groupTransform, setGroupTransform] = useState<DecoGroupParentTransform>(() => makeDefaultGroupTransform());
  const groupTransformRef = useRef<DecoGroupParentTransform>(groupTransform);

  const setCurrentGroupTransform = useCallback((next: DecoGroupParentTransform) => {
    groupTransformRef.current = next;
    setGroupTransform(next);
  }, []);

  const resetGroupTransform = useCallback(() => {
    setCurrentGroupTransform(makeDefaultGroupTransform());
  }, [setCurrentGroupTransform]);

  const selectionKey = useMemo(() => {
    if (selectedDecorationIds.length > LARGE_SELECTION_SNAPSHOT_CAP) return '';
    return snapshotKeyFromIds(selectedDecorationIds);
  }, [selectedDecorationIds]);
  useEffect(() => {
    if (selectedDecorationIds.length < 2) {
      setGroupSnapshot(null);
      resetGroupTransform();
      return;
    }
    if (selectedDecorationIds.length > LARGE_SELECTION_SNAPSHOT_CAP) {
      setGroupSnapshot(null);
      resetGroupTransform();
      return;
    }
    const currentRole = roleRef.current;
    const ordered = orderedSelectedDecorations(currentRole, selectedDecorationIds);
    const snapshot = snapshotGroupSelection(ordered);
    setGroupSnapshot(snapshot);
    resetGroupTransform();
  }, [selectionKey, resetGroupTransform]); // eslint-disable-line react-hooks/exhaustive-deps

  const editValues = useMemo<TransformValues>(
    () => editValuesForGroupTransform(role, selectedDecorationIds, groupSnapshot, groupTransform),
    [role, selectedDecorationIds, groupSnapshot, groupTransform]
  );

  const groupScaleBounds = useMemo(() => groupScaleBoundsForSnapshot(groupSnapshot), [groupSnapshot]);
  const scaleBounds = useMemo(
    () => selectionScaleBounds(selectedDecorations, groupScaleBounds),
    [groupScaleBounds, selectedDecorations]
  );
  const selectionScaleMin = scaleBounds.min;
  const selectionScaleMax = scaleBounds.max;

  const groupRatioBounds = useMemo(() => groupRatioBoundsForSnapshot(groupSnapshot), [groupSnapshot]);
  const ratioBounds = useMemo(
    () => selectionRatioBounds(selectedDecorations, groupRatioBounds),
    [groupRatioBounds, selectedDecorations]
  );
  const selectionRatioMin = ratioBounds.min;
  const selectionRatioMax = ratioBounds.max;

  const ensureGroupSnapshot = useCallback((): DecoGroupSnapshot | null => {
    if (groupSnapshot) return groupSnapshot;
    if (selectedDecorationIds.length < 2) return null;
    const currentRole = roleRef.current;
    const ordered = orderedSelectedDecorations(currentRole, selectedDecorationIds);
    const snapshot = snapshotGroupSelection(ordered);
    if (snapshot) {
      setGroupSnapshot(snapshot);
    }
    return snapshot;
  }, [groupSnapshot, selectedDecorationIds, roleRef]);

  useEffect(() => {
    if (!groupSnapshot || selectedDecorationIds.length < 2) return;
    const first = getFirstSelected(role, selectedDecorationIds);
    if (!first) return;

    const syncedTransform = syncGroupTransformToActualFirstPosition(groupTransformRef.current, groupSnapshot, first);
    if (syncedTransform !== groupTransformRef.current) {
      setCurrentGroupTransform(syncedTransform);
    }
  }, [groupSnapshot, role, selectedDecorationIds, setCurrentGroupTransform]);

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
    [ensureGroupSnapshot, roleRef, scaleBounds, selectedDecorationIds, setCurrentGroupTransform, updateRole]
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
    [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]
  );

  const rotateSelectedBy = useCallback(
    (degrees: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      const current = snapshot && selectedDecorationIds.length > 1
        ? groupTransformRef.current.rotationDeg
        : getFirstSelected(role, selectedDecorationIds)?.rotation ?? 0;
      updateSelectedTransform({ rotate: normalizeDegrees(current + degrees) }, commit);
    },
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
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
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
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
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
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
  }, [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]);

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
  }, [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, updateRole]);

  return {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical
  };
}
