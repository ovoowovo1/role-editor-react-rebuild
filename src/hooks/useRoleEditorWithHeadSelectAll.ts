import { useCallback } from 'react';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useHeadLayerEditor, type InsertDraftSettings } from './useRoleEditorWithHeadLayerDrag';
import type { DecorationLayer, RoleDocument } from '../types/role';

export type { InsertDraftSettings };

function getHeadLayerIndex(role: RoleDocument): number {
  const raw = Number(role.headLayerIndex);
  const count = role.decorations.length;
  return Math.max(0, Math.min(count, Number.isFinite(raw) ? Math.round(raw) : count));
}

function getAllLayerIdsIncludingHead(role: RoleDocument): string[] {
  const ids = role.decorations.map((item) => item.id);
  ids.splice(getHeadLayerIndex(role), 0, HEAD_LAYER_ID);
  return ids;
}

function roundPosition(value: number): number {
  return Math.round(value * 100) / 100;
}

export function useRoleEditor() {
  const editor = useHeadLayerEditor();

  const selectAllDecorations = useCallback(() => {
    const ids = getAllLayerIdsIncludingHead(editor.role);
    editor.clearSelection();
    ids.forEach((id, index) => editor.selectDecoration(id, index > 0));
  }, [editor]);

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit?: boolean) => {
      const selectedDecoIds = editor.selectedDecorationIds.filter((itemId) => itemId !== HEAD_LAYER_ID);
      const shouldMoveSelection =
        selectedDecoIds.length > 1 &&
        selectedDecoIds.includes(id) &&
        (typeof patch.x === 'number' || typeof patch.y === 'number');

      if (!shouldMoveSelection) {
        editor.updateDecoration(id, patch, commit);
        return;
      }

      const dragged = editor.role.decorations.find((deco) => deco.id === id);
      if (!dragged) {
        editor.updateDecoration(id, patch, commit);
        return;
      }

      const dx = typeof patch.x === 'number' ? patch.x - dragged.x : 0;
      const dy = typeof patch.y === 'number' ? patch.y - dragged.y : 0;
      const hasDx = Math.abs(dx) > Number.EPSILON;
      const hasDy = Math.abs(dy) > Number.EPSILON;

      for (const selectedId of selectedDecoIds) {
        const deco = editor.role.decorations.find((item) => item.id === selectedId);
        if (!deco) continue;
        if (selectedId === id) {
          editor.updateDecoration(selectedId, patch, commit);
          continue;
        }

        const nextPatch: Partial<DecorationLayer> = { ...patch };
        if (hasDx) nextPatch.x = roundPosition(deco.x + dx);
        else delete nextPatch.x;
        if (hasDy) nextPatch.y = roundPosition(deco.y + dy);
        else delete nextPatch.y;
        editor.updateDecoration(selectedId, nextPatch, commit);
      }
    },
    [editor]
  );

  return {
    ...editor,
    selectAllDecorations,
    updateDecoration
  };
}
