import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { HEAD_LAYER_ID } from '../constants/layers';
import { orderedSelectedDecorations } from '../lib/editor/editorRoleUtils';
import {
  decorationIdsFromLayerIds,
  toggleLayerSelection
} from '../lib/editor/headLayerMutations';
import { selectedLayerIdsForGroup } from '../lib/editor/editorSelectionCommands';
import { layerIdsForRole } from '../lib/editor/layerOrdering';
import {
  selectionIdsToRestoreForRole,
  stableSelectionIdsForRole
} from '../lib/editor/editorRoleCommands';
import type { DecorationTransformTarget } from '../lib/editor/editorTransformHistory';
import type { RoleDocument } from '../types/role';

interface UseRoleSelectionOptions {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
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

  const selectedDecorationIds = useMemo(
    () => decorationIdsFromLayerIds(role, selectedLayerIds),
    [role, selectedLayerIds]
  );

  useEffect(() => {
    setSelectedLayerIds((ids) => {
      const valid = new Set(role.decorations.map((item) => item.id));
      valid.add(HEAD_LAYER_ID);
      return ids.filter((id) => valid.has(id));
    });
  }, [role.decorations]);

  useEffect(() => {
    if (selectedLayerIds.length) {
      selectedIdsRef.current = selectedLayerIds;
    } else if (!transientBeforeRef.current && !transientTransformBeforeRef.current) {
      selectedIdsRef.current = [];
    }
  }, [selectedLayerIds]);

  const stableSelectedIds = useMemo(() => {
    return stableSelectionIdsForRole(
      role,
      selectedLayerIds,
      Boolean(transientBeforeRef.current || transientTransformBeforeRef.current),
      transientSelectionBeforeRef.current,
      selectedIdsRef.current
    );
  }, [role, selectedLayerIds]);

  const stableSelectedDecorations = useMemo(() => {
    const selectedSet = new Set(stableSelectedIds);
    return role.decorations.filter((deco) => selectedSet.has(deco.id));
  }, [role.decorations, stableSelectedIds]);

  const baseSelectedDecorations = useMemo(
    () => orderedSelectedDecorations(role, selectedDecorationIds),
    [role, selectedDecorationIds]
  );

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
