import { useCallback } from 'react';
import { HEAD_LAYER_ID } from '../components/LayerList';
import { useRoleEditor as useHeadLayerEditor, type InsertDraftSettings } from './useRoleEditorWithHeadLayerDrag';
import type { RoleDocument } from '../types/role';

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

export function useRoleEditor() {
  const editor = useHeadLayerEditor();

  const selectAllDecorations = useCallback(() => {
    const ids = getAllLayerIdsIncludingHead(editor.role);
    editor.clearSelection();
    ids.forEach((id, index) => editor.selectDecoration(id, index > 0));
  }, [editor]);

  return {
    ...editor,
    selectAllDecorations
  };
}
