import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import {
  toggleLayerSelection
} from '../lib/editor/headLayerMutations';
import { selectedLayerIdsForGroup } from '../lib/editor/editorSelectionCommands';
import { layerIdsForRole } from '../lib/editor/layerOrdering';
import { selectionIdsToRestoreForRole } from '../lib/editor/editorRoleCommands';
import {
  decorationSelectionIndex, orderedIndexedDecorations, retainEqualArray,
  stableIndexedSelectionIds, validIndexedLayerIds, type DecorationSelectionIndex
} from '../lib/editor/editorSelectionIndex';
import type { DecorationTransformTarget } from '../lib/editor/editorHistoryTypes';
import type { RoleDocument } from '../types/role';

interface UseRoleSelectionOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
}

function useStableArray<T>(values: T[]): T[] {
  const previous = useRef(values);
  previous.current = retainEqualArray(previous.current, values);
  return previous.current;
}

export interface RoleSelectionState {
  selectedLayerIds: string[];
  setSelectedLayerIds: Dispatch<SetStateAction<string[]>>;
  selectedIdsRef: MutableRefObject<string[]>;
  transientBeforeRef: MutableRefObject<RoleDocument | null>;
  transientTransformBeforeRef: MutableRefObject<DecorationTransformTarget[] | null>;
  transientSelectionBeforeRef: MutableRefObject<string[]>;
  selectedDecorationIds: string[];
  stableSelectedIds: string[];
  stableSelectedDecorations: RoleDocument['decorations'];
  baseSelectedDecorations: RoleDocument['decorations'];
  restoreSelection(ids: string[]): void;
  selectDecoration(id: string, additive?: boolean): void;
  clearSelection(): void;
  selectMultipleDecorations(ids: string[]): void;
  selectAllDecorations(): void;
  selectGroup(groupId: string, additive?: boolean): void;
}

export function useRoleSelection({ role, roleRef }: UseRoleSelectionOptions): RoleSelectionState {
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const transientBeforeRef = useRef<RoleDocument | null>(null);
  const transientTransformBeforeRef = useRef<DecorationTransformTarget[] | null>(null);
  const transientSelectionBeforeRef = useRef<string[]>([]);
  const previousIndex = useRef<DecorationSelectionIndex>();
  const index = useMemo(() => {
    const next = decorationSelectionIndex(role.decorations, previousIndex.current);
    previousIndex.current = next;
    return next;
  }, [role.decorations]);

  const selectedDecorationIds = useStableArray(useMemo(
    () => selectedLayerIds.filter(id => index.positions.has(id)),
    [index, selectedLayerIds]
  ));

  useEffect(() => {
    setSelectedLayerIds((ids) => {
      const nextIds = validIndexedLayerIds(index, ids);
      return nextIds.length === ids.length ? ids : nextIds;
    });
  }, [index]);

  useEffect(() => {
    if (selectedLayerIds.length) {
      selectedIdsRef.current = selectedLayerIds;
    } else if (!transientBeforeRef.current && !transientTransformBeforeRef.current) {
      selectedIdsRef.current = [];
    }
  }, [selectedLayerIds]);

  const stableSelectedIds = useStableArray(useMemo(() => {
    return stableIndexedSelectionIds(
      index,
      selectedLayerIds,
      Boolean(transientBeforeRef.current || transientTransformBeforeRef.current),
      transientSelectionBeforeRef.current,
      selectedIdsRef.current
    );
  }, [index, role, selectedLayerIds]));

  const stableSelectedDecorations = useStableArray(useMemo(
    () => orderedIndexedDecorations(role.decorations, index, stableSelectedIds),
    [role.decorations, index, stableSelectedIds]
  ));

  const baseSelectedDecorations = useStableArray(useMemo(
    () => orderedIndexedDecorations(role.decorations, index, selectedDecorationIds),
    [role.decorations, index, selectedDecorationIds]
  ));

  const restoreSelection = useCallback(
    (ids: string[]) => {
      const nextIds = [...new Set(ids.filter(Boolean))];
      if (!nextIds.length) return;
      window.setTimeout(() => {
        const stillValid = selectionIdsToRestoreForRole(roleRef.current, nextIds);
        if (!stillValid.length) return;
        selectedIdsRef.current = stillValid;
        setSelectedLayerIds(stillValid);
      }, 0);
    },
    [roleRef]
  );

  const selectDecoration = useCallback(
    (id: string, additive = false) => {
      const isAlreadyInMultiSelection = !additive && stableSelectedIds.length > 1 && stableSelectedIds.includes(id);
      if (isAlreadyInMultiSelection) return;

      setSelectedLayerIds((current) => {
        if (id === HEAD_LAYER_ID) return toggleLayerSelection(current, [HEAD_LAYER_ID], additive);
        return toggleLayerSelection(current, [id], additive);
      });
    },
    [stableSelectedIds]
  );

  const clearSelection = useCallback(() => {
    selectedIdsRef.current = [];
    transientTransformBeforeRef.current = null;
    transientSelectionBeforeRef.current = [];
    setSelectedLayerIds([]);
  }, []);

  const selectMultipleDecorations = useCallback((ids: string[]) => {
    selectedIdsRef.current = ids;
    setSelectedLayerIds(ids);
  }, []);

  const selectAllDecorations = useCallback(() => {
    selectMultipleDecorations(layerIdsForRole(role));
  }, [role, selectMultipleDecorations]);

  const selectGroup = useCallback(
    (groupId: string, additive = false) => {
      const ids = selectedLayerIdsForGroup(role, groupId);
      if (!ids.length) return;
      setSelectedLayerIds((current) => toggleLayerSelection(current, ids, additive));
    },
    [role]
  );

  return {
    selectedLayerIds,
    setSelectedLayerIds,
    selectedIdsRef,
    transientBeforeRef,
    transientTransformBeforeRef,
    transientSelectionBeforeRef,
    selectedDecorationIds,
    stableSelectedIds,
    stableSelectedDecorations,
    baseSelectedDecorations,
    restoreSelection,
    selectDecoration,
    clearSelection,
    selectMultipleDecorations,
    selectAllDecorations,
    selectGroup
  };
}
