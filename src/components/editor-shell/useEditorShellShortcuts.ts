import { useMemo } from 'react';
import { t } from '../../i18n';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import type { ReferenceImageLayer } from '../../types/referenceImage';

type EditorApi = ReturnType<typeof useRoleEditor>;
type ReferenceApi = {
  selectedImage: ReferenceImageLayer | null;
  canUndo: boolean;
  canRedo: boolean;
  undo(): void;
  redo(): void;
  removeImage(id: string): void;
  selectImage(id: string | null): void;
  updateImage(id: string, patch: { x?: number; y?: number; scale?: number; opacity?: number }, commit?: boolean): void;
};

export function useEditorShellShortcuts(
  editor: EditorApi,
  setStatus: (message: string) => void,
  reference?: ReferenceApi,
  undoOverride?: () => void,
  redoOverride?: () => void
) {
  const shortcutActions = useMemo(
    () => ({
      hasSelection: editor.selectedDecorationIds.length > 0 || Boolean(reference?.selectedImage),
      canGroupSelected: editor.canGroupSelected,
      editValues: editor.editValues,
      undo: undoOverride ?? editor.undo,
      redo: redoOverride ?? editor.redo,
      copy: editor.copySelected,
      paste: editor.pasteClipboard,
      selectAll: () => {
        reference?.selectImage(null);
        editor.selectAllDecorations();
      },
      groupSelected: () => {
        if (!editor.canGroupSelected) return;
        editor.groupSelected();
        setStatus(t('status.createdGroup'));
      },
      deleteSelected: () => {
        if (reference?.selectedImage) reference.removeImage(reference.selectedImage.id);
        else editor.deleteSelected();
      },
      clearSelection: () => {
        editor.clearSelection();
        reference?.selectImage(null);
      },
      moveSelectedToBoundary: editor.moveSelectedToBoundary,
      nudge: (dx: number, dy: number) => {
        if (reference?.selectedImage) {
          reference.updateImage(reference.selectedImage.id, { x: reference.selectedImage.x + dx, y: reference.selectedImage.y + dy });
        } else editor.nudgeSelected(dx, dy);
      },
      rotateBy: editor.rotateSelectedBy,
      scaleBy: editor.scaleSelectedBy,
      ratioBy: editor.ratioSelectedBy
    }),
    [editor, reference, redoOverride, setStatus, undoOverride]
  );

  useKeyboardShortcuts(shortcutActions);
}
