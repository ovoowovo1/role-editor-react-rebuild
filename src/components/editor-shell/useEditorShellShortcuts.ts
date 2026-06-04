import { useMemo } from 'react';
import { t } from '../../i18n';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { useRoleEditor } from '../../hooks/useRoleEditor';

type EditorApi = ReturnType<typeof useRoleEditor>;

export function useEditorShellShortcuts(editor: EditorApi, setStatus: (message: string) => void) {
  const shortcutActions = useMemo(
    () => ({
      hasSelection: editor.selectedDecorationIds.length > 0,
      canGroupSelected: editor.canGroupSelected,
      editValues: editor.editValues,
      undo: editor.undo,
      redo: editor.redo,
      copy: editor.copySelected,
      paste: editor.pasteClipboard,
      selectAll: editor.selectAllDecorations,
      groupSelected: () => {
        if (!editor.canGroupSelected) return;
        editor.groupSelected();
        setStatus(t('status.createdGroup'));
      },
      deleteSelected: editor.deleteSelected,
      clearSelection: editor.clearSelection,
      moveSelectedToBoundary: editor.moveSelectedToBoundary,
      nudge: (dx: number, dy: number) => editor.nudgeSelected(dx, dy),
      rotateBy: editor.rotateSelectedBy,
      scaleBy: editor.scaleSelectedBy,
      ratioBy: editor.ratioSelectedBy
    }),
    [editor, setStatus]
  );

  useKeyboardShortcuts(shortcutActions);
}
