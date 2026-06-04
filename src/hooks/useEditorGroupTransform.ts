import type { MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument } from '../types/role';
import { useEditorGroupTransformCommands } from './useEditorGroupTransformCommands';
import { useEditorGroupTransformState } from './useEditorGroupTransformState';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

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
  const {
    editValues,
    groupTransformRef,
    scaleBounds,
    ensureGroupSnapshot,
    setCurrentGroupTransform,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax
  } = useEditorGroupTransformState({
    role,
    roleRef,
    selectedDecorationIds,
    selectedDecorations
  });

  const transformCommands = useEditorGroupTransformCommands({
    role,
    roleRef,
    selectedDecorationIds,
    updateRole,
    groupTransformRef,
    scaleBounds,
    ensureGroupSnapshot,
    setCurrentGroupTransform
  });

  return {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    ...transformCommands
  };
}
