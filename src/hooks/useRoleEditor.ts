import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { camps, createDefaultRole, filterPartOptionsByCamp, findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationLayer, EditorClipboardItem, GenderCode, PartOption, PartTab, RoleDocument } from '../types/role';
import { clamp } from '../lib/math';
import { getPartFrame } from '../lib/twlibPartRuntime';
import {
  cloneRole,
  orderedSelectedDecorations,
  syncGroups,
  touch
} from '../lib/editorRoleUtils';
import {
  copiedClipboardItems,
  deleteDecorationFromRole,
  deleteSelectedFromRole,
  makeDecoration,
  mirrorCopySelectedInRole,
  moveSelectedToBoundaryInRole,
  pasteClipboardIntoRole,
  setSelectedVisibleInRole,
  toggleDecorationVisibilityInRole
} from '../lib/editorDecorationMutations';
import {
  createGroupFromSelection,
  makeGroupMap,
  renameGroupInRole,
  setGroupVisibleInRole,
  toggleGroupCollapsedInRole,
  ungroupedSelectedIds,
  ungroupInRole
} from '../lib/editorGroupMutations';
import { reorderBaseEditorLayers } from '../lib/editorLayerDrag';
import { shiftHeadLayerForInsert } from '../lib/editorRoleUtils';
import { useEditorGroupTransform } from './useEditorGroupTransform';
import { useHistory } from './useHistory';

const STAGE_MIN_SCALE = 1;
const STAGE_MAX_SCALE = 6;

export function useRoleEditor() {
  const history = useHistory<RoleDocument>(createDefaultRole(), { limit: 200 });
  const { present: role, setPresent: setRole } = history;
  const [selectedTab, setSelectedTab] = useState<PartTab>('deco');
  const [selectedDecorationIds, setSelectedDecorationIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<EditorClipboardItem[]>([]);
  const [stageScale, setStageScaleState] = useState(STAGE_MIN_SCALE);
  const pasteCountRef = useRef(0);
  const roleRef = useRef(role);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    const existing = new Set(role.decorations.map((item) => item.id));
    setSelectedDecorationIds((ids) => ids.filter((id) => existing.has(id)));
  }, [role.decorations]);

  const setStageScale = useCallback((value: number) => {
    setStageScaleState(clamp(Math.round(value), STAGE_MIN_SCALE, STAGE_MAX_SCALE));
  }, []);

  const selectedDecorations = useMemo(() => orderedSelectedDecorations(role, selectedDecorationIds), [role, selectedDecorationIds]);
  const visibleOptionsByTab = useMemo(
    () => ({
      deco: filterPartOptionsByCamp('deco', role.camp),
      head: filterPartOptionsByCamp('head', role.camp),
      hand: filterPartOptionsByCamp('hand', role.camp),
      foot: filterPartOptionsByCamp('foot', role.camp),
      cape: filterPartOptionsByCamp('cape', role.camp)
    }),
    [role.camp]
  );
  const groupMap = useMemo(() => makeGroupMap(role.groups ?? []), [role.groups]);
  const canGroupSelected = useMemo(
    () => ungroupedSelectedIds(role, selectedDecorationIds).length >= 2,
    [role, selectedDecorationIds]
  );

  const updateRole = useCallback(
    (updater: (current: RoleDocument) => RoleDocument, commit = true) => {
      setRole((current) => syncGroups(touch(updater(cloneRole(current)))), commit ? 'history' : 'silent');
    },
    [setRole]
  );

  const {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical
  } = useEditorGroupTransform({
    role,
    roleRef,
    selectedDecorationIds,
    selectedDecorations,
    updateRole
  });

  const choosePart = useCallback(
    (tab: PartTab, option: PartOption) => {
      if (tab === 'deco') {
        updateRole((current) => {
          const deco = makeDecoration(option, current.decorations.length);
          shiftHeadLayerForInsert(current, 0, 1);
          current.decorations = [deco, ...current.decorations];
          window.setTimeout(() => setSelectedDecorationIds([deco.id]), 0);
          return current;
        });
        return;
      }
      updateRole((current) => {
        const bodyTab = tab as BodyPartTab;
        current.parts[bodyTab] = option.id;
        current.partFrames = { ...current.partFrames, [bodyTab]: getPartFrame(option) ?? current.partFrames?.[bodyTab] ?? 1 };
        current.partScales = { ...current.partScales, [bodyTab]: current.partScales?.[bodyTab] ?? 1 };
        return current;
      });
    },
    [updateRole]
  );

  const selectDecoration = useCallback((id: string, additive = false) => {
    setSelectedDecorationIds((ids) => {
      if (additive) {
        if (ids.includes(id)) return ids.filter((item) => item !== id);
        return [...ids, id];
      }
      return ids.length === 1 && ids[0] === id ? [] : [id];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedDecorationIds([]), []);

  const selectMultipleDecorations = useCallback((ids: string[]) => {
    setSelectedDecorationIds(ids);
  }, []);

  const applyDragDeltaToSelected = useCallback((dx: number, dy: number) => {
    const selectedSet = new Set(selectedDecorationIds);
    setRole((current) => ({
      ...current,
      decorations: current.decorations.map((item) => {
        if (!selectedSet.has(item.id)) return item;
        return { ...item, x: item.x + dx, y: item.y + dy };
      }),
      updatedAt: new Date().toISOString()
    }), 'silent');
  }, [selectedDecorationIds, setRole]);

  const selectAllDecorations = useCallback(() => {
    setSelectedDecorationIds(role.decorations.map((item) => item.id));
  }, [role.decorations]);

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit = true) => {
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, ...patch } : item));
        return current;
      }, commit);
    },
    [updateRole]
  );

  const setSelectedVisible = useCallback(
    (visible: boolean) => {
      updateRole((current) => {
        setSelectedVisibleInRole(current, selectedDecorationIds, visible);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      updateRole((current) => {
        toggleDecorationVisibilityInRole(current, id);
        return current;
      });
    },
    [updateRole]
  );

  const deleteDecoration = useCallback(
    (id: string) => {
      updateRole((current) => {
        deleteDecorationFromRole(current, id);
        return current;
      });
      setSelectedDecorationIds((ids) => ids.filter((item) => item !== id));
    },
    [updateRole]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      deleteSelectedFromRole(current, selectedDecorationIds);
      return current;
    });
    setSelectedDecorationIds([]);
  }, [selectedDecorationIds, updateRole]);

  const copySelected = useCallback(() => {
    setClipboard(copiedClipboardItems(selectedDecorations));
    pasteCountRef.current = 0;
  }, [selectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard.length) return;
    pasteCountRef.current += 1;
    const offset = pasteCountRef.current * 8;
    updateRole((current) => {
      const pastedIds = pasteClipboardIntoRole(current, clipboard, selectedDecorationIds, offset);
      window.setTimeout(() => setSelectedDecorationIds(pastedIds), 0);
      return current;
    });
  }, [clipboard, selectedDecorationIds, updateRole]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      const mirroredIds = mirrorCopySelectedInRole(current, selectedDecorationIds, 'horizontal');
      if (mirroredIds.length) window.setTimeout(() => setSelectedDecorationIds(mirroredIds), 0);
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      const mirroredIds = mirrorCopySelectedInRole(current, selectedDecorationIds, 'vertical');
      if (mirroredIds.length) window.setTimeout(() => setSelectedDecorationIds(mirroredIds), 0);
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      if (activeRowId === overRowId) return;
      updateRole((current) => {
        reorderBaseEditorLayers(current, activeRowId, overRowId, selectedDecorationIds);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
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

  const selectGroup = useCallback((groupId: string, additive = false) => {
    const group = role.groups?.find((item) => item.id === groupId);
    if (!group) return;
    setSelectedDecorationIds((ids) => {
      if (!additive) return group.itemIds;
      const selected = new Set(ids);
      const allSelected = group.itemIds.every((id) => selected.has(id));
      group.itemIds.forEach((id) => {
        if (allSelected) selected.delete(id);
        else selected.add(id);
      });
      return role.decorations.filter((item) => selected.has(item.id)).map((item) => item.id);
    });
  }, [role.decorations, role.groups]);

  const groupSelected = useCallback(() => {
    updateRole((current) => {
      createGroupFromSelection(current, selectedDecorationIds);
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    updateRole((current) => {
      toggleGroupCollapsedInRole(current, groupId);
      return current;
    });
  }, [updateRole]);

  const renameGroup = useCallback((groupId: string, name: string) => {
    updateRole((current) => {
      renameGroupInRole(current, groupId, name);
      return current;
    });
  }, [updateRole]);

  const setGroupVisible = useCallback((groupId: string, visible: boolean) => {
    updateRole((current) => {
      setGroupVisibleInRole(current, groupId, visible);
      return current;
    });
  }, [updateRole]);

  const toggleGroupVisibility = useCallback((groupId: string) => {
    const group = role.groups?.find((item) => item.id === groupId);
    if (!group) return;
    setGroupVisible(groupId, group.visible === false);
  }, [role.groups, setGroupVisible]);

  const ungroup = useCallback((groupId: string) => {
    updateRole((current) => {
      ungroupInRole(current, groupId);
      return current;
    });
  }, [updateRole]);

  const changeCamp = useCallback(
    (camp: string) => {
      updateRole((current) => ({ ...current, camp }));
    },
    [updateRole]
  );

  const changeGender = useCallback(
    (gender: GenderCode) => {
      updateRole((current) => ({ ...current, gender }));
    },
    [updateRole]
  );

  const newDesign = useCallback(() => {
    history.reset(createDefaultRole(camps[0].code, 'male'));
    setSelectedDecorationIds([]);
    setSelectedTab('deco');
  }, [history]);

  const importRole = useCallback(
    (nextRole: RoleDocument) => {
      history.reset(nextRole);
      setSelectedDecorationIds([]);
      setSelectedTab('deco');
    },
    [history]
  );

  const updatePartById = useCallback(
    (tab: BodyPartTab, optionId: string) => {
      const option = optionById[optionId] ?? findOptionByCode(tab, optionId) ?? partOptions[tab][0];
      choosePart(tab, option);
    },
    [choosePart]
  );

  return {
    role,
    selectedTab,
    setSelectedTab,
    selectedDecorationIds,
    selectedDecorations,
    visibleOptionsByTab,
    groups: role.groups ?? [],
    groupMap,
    canGroupSelected,
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    clipboardCount: clipboard.length,
    stageScale,
    setStageScale,
    stageMinScale: STAGE_MIN_SCALE,
    stageMaxScale: STAGE_MAX_SCALE,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    beginTransient: history.beginTransient,
    commitTransient: history.commitTransient,
    cancelTransient: history.cancelTransient,
    undo: history.undo,
    redo: history.redo,
    choosePart,
    updatePartById,
    selectDecoration,
    clearSelection,
    selectMultipleDecorations,
    selectAllDecorations,
    applyDragDeltaToSelected,
    updateDecoration,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical,
    setSelectedVisible,
    toggleDecorationVisibility,
    selectGroup,
    groupSelected,
    toggleGroupCollapsed,
    renameGroup,
    toggleGroupVisibility,
    ungroup,
    deleteDecoration,
    deleteSelected,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    reorderDecorations,
    moveSelectedToBoundary,
    changeCamp,
    changeGender,
    newDesign,
    importRole
  };
}
