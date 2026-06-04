import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument, TransformValues } from '../types/role';
import {
  snapshotGroupSelection,
  snapshotKeyFromIds,
  type DecoGroupParentTransform,
  type DecoGroupSnapshot
} from '../lib/editor/decoGroupTransform';
import {
  getFirstSelected,
  orderedSelectedDecorations
} from '../lib/editor/editorRoleUtils';
import {
  editValuesForGroupTransform,
  groupRatioBoundsForSnapshot,
  groupScaleBoundsForSnapshot,
  makeDefaultGroupTransform,
  selectionRatioBounds,
  selectionScaleBounds,
  syncGroupTransformToActualFirstPosition
} from '../lib/editor/editorGroupTransformCommands';

const LARGE_SELECTION_SNAPSHOT_CAP = 80;

export function useEditorGroupTransformState({
  role,
  roleRef,
  selectedDecorationIds,
  selectedDecorations
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  selectedDecorations: DecorationLayer[];
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

  const groupRatioBounds = useMemo(() => groupRatioBoundsForSnapshot(groupSnapshot), [groupSnapshot]);
  const ratioBounds = useMemo(
    () => selectionRatioBounds(selectedDecorations, groupRatioBounds),
    [groupRatioBounds, selectedDecorations]
  );

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

  return {
    editValues,
    groupTransformRef,
    scaleBounds,
    ensureGroupSnapshot,
    setCurrentGroupTransform,
    selectionScaleMin: scaleBounds.min,
    selectionScaleMax: scaleBounds.max,
    selectionRatioMin: ratioBounds.min,
    selectionRatioMax: ratioBounds.max
  };
}
