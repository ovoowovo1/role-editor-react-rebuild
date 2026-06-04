import { useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import type { DecorationLayer, RoleDocument, TransformValues } from '../types/role';
import { transformValuesFromSingleDeco } from '../lib/editor/editorTransformHistory';
import { patchDecorationForSelectionDrag } from '../lib/editor/editorSelectionCommands';
import { selectionIdsForCommand } from '../lib/editor/editorRoleCommands';
import { useEditorGroupTransform } from './useEditorGroupTransform';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

export function useRoleTransformCommands({
  role,
  roleRef,
  selectedDecorationIds,
  stableSelectedIds,
  baseSelectedDecorations,
  selectedIdsRef,
  updateRole,
  withImmediateHistory,
  withTransformHistory
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  stableSelectedIds: string[];
  baseSelectedDecorations: DecorationLayer[];
  selectedIdsRef: MutableRefObject<string[]>;
  updateRole: UpdateRole;
  withImmediateHistory(action: () => void, restoreIds?: string[]): void;
  withTransformHistory(action: () => void, restoreIds?: string[]): void;
}) {
  const {
    editValues: editValuesRaw,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    updateSelectedTransform: updateSelectedTransformRaw,
    nudgeSelected: nudgeSelectedRaw,
    rotateSelectedBy: rotateSelectedByRaw,
    scaleSelectedBy: scaleSelectedByRaw,
    ratioSelectedBy: ratioSelectedByRaw,
    flipSelected: flipSelectedRaw,
    flipSelectedVertical: flipSelectedVerticalRaw
  } = useEditorGroupTransform({
    role,
    roleRef,
    selectedDecorationIds,
    selectedDecorations: baseSelectedDecorations,
    updateRole
  });

  const editValues = useMemo<TransformValues>(() => {
    const decoIds = stableSelectedIds.filter((id) => id !== HEAD_LAYER_ID);
    if (decoIds.length === 1) {
      const deco = role.decorations.find((item) => item.id === decoIds[0]);
      if (deco) return transformValuesFromSingleDeco(deco);
    }
    return editValuesRaw;
  }, [editValuesRaw, role.decorations, stableSelectedIds]);

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit?: boolean) => {
      const selectionBefore = selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current);

      const runUpdate = () => {
        const selectedIds = selectionIdsForCommand(selectionBefore, selectedIdsRef.current);
        updateRole((current) => patchDecorationForSelectionDrag(current, id, patch, selectedIds), commit);
      };

      if (commit) withImmediateHistory(runUpdate, selectionBefore);
      else runUpdate();
    },
    [selectedIdsRef, stableSelectedIds, updateRole, withImmediateHistory]
  );

  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit?: boolean) => {
      const selectionBefore = selectionIdsForCommand(stableSelectedIds, selectedIdsRef.current);
      if (commit) withTransformHistory(() => updateSelectedTransformRaw(patch, false), selectionBefore);
      else updateSelectedTransformRaw(patch, commit);
    },
    [selectedIdsRef, stableSelectedIds, updateSelectedTransformRaw, withTransformHistory]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => withTransformHistory(() => nudgeSelectedRaw(dx, dy, false)),
    [nudgeSelectedRaw, withTransformHistory]
  );

  const rotateSelectedBy = useCallback(
    (degrees: number) => withTransformHistory(() => rotateSelectedByRaw(degrees, false)),
    [rotateSelectedByRaw, withTransformHistory]
  );

  const scaleSelectedBy = useCallback(
    (amount: number) => withTransformHistory(() => scaleSelectedByRaw(amount, false)),
    [scaleSelectedByRaw, withTransformHistory]
  );

  const ratioSelectedBy = useCallback(
    (amount: number) => withTransformHistory(() => ratioSelectedByRaw(amount, false)),
    [ratioSelectedByRaw, withTransformHistory]
  );

  const flipSelected = useCallback(
    () => withTransformHistory(() => flipSelectedRaw(false)),
    [flipSelectedRaw, withTransformHistory]
  );

  const flipSelectedVertical = useCallback(
    () => withTransformHistory(() => flipSelectedVerticalRaw(false)),
    [flipSelectedVerticalRaw, withTransformHistory]
  );

  return {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    updateDecoration,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical
  };
}
