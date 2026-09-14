import { useCallback, useEffect, useRef } from 'react';
import { t } from '../../i18n';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import { useReferenceImageLayers } from '../../hooks/useReferenceImageLayers';

type EditorApi = ReturnType<typeof useRoleEditor>;
type HistorySource = 'role' | 'image';

export function resolveHistorySource(
  preferred: HistorySource,
  roleAvailable: boolean,
  imageAvailable: boolean
): HistorySource | null {
  if (preferred === 'image') {
    if (imageAvailable) return 'image';
    if (roleAvailable) return 'role';
    return null;
  }
  if (roleAvailable) return 'role';
  if (imageAvailable) return 'image';
  return null;
}

interface UseEditorSessionControllerOptions {
  editor: EditorApi;
  setStatus(message: string): void;
}

export function useEditorSessionController({
  editor,
  setStatus
}: UseEditorSessionControllerOptions) {
  const historySourceRef = useRef<HistorySource>('role');
  const previousRoleRef = useRef(editor.role);

  const markImageMutation = useCallback(() => {
    historySourceRef.current = 'image';
    editor.clearRedo();
  }, [editor.clearRedo]);

  const reference = useReferenceImageLayers({
    positionRange: editor.role.positionRange,
    onMutation: markImageMutation
  });

  useEffect(() => {
    if (previousRoleRef.current === editor.role) return;
    previousRoleRef.current = editor.role;
    historySourceRef.current = 'role';
    reference.clearRedo();
  }, [editor.role, reference.clearRedo]);

  const clearSelection = useCallback(() => {
    editor.clearSelection();
    reference.selectImage(null);
  }, [editor.clearSelection, reference.selectImage]);

  const selectRole = useCallback((id: string, additive: boolean) => {
    reference.selectImage(null);
    editor.selectDecoration(id, additive);
  }, [editor.selectDecoration, reference.selectImage]);

  const selectManyRole = useCallback((ids: string[]) => {
    reference.selectImage(null);
    editor.selectMultipleDecorations(ids);
  }, [editor.selectMultipleDecorations, reference.selectImage]);

  const selectGroup = useCallback((id: string, additive: boolean) => {
    reference.selectImage(null);
    editor.selectGroup(id, additive);
  }, [editor.selectGroup, reference.selectImage]);

  const selectReferenceImage = useCallback((id: string) => {
    editor.clearSelection();
    reference.selectImage(id);
  }, [editor.clearSelection, reference.selectImage]);

  const commitReferenceImageDrag = useCallback((id: string, dx: number, dy: number) => {
    const image = reference.images.find((entry) => entry.id === id);
    if (!image) return;
    reference.updateImage(id, { x: image.x + dx, y: image.y + dy });
  }, [reference.images, reference.updateImage]);

  const undo = useCallback(() => {
    const source = resolveHistorySource(
      historySourceRef.current,
      editor.canUndo,
      reference.canUndo
    );
    if (source === 'role') editor.undo();
    if (source === 'image') reference.undo();
  }, [editor.canUndo, editor.undo, reference.canUndo, reference.undo]);

  const redo = useCallback(() => {
    const source = resolveHistorySource(
      historySourceRef.current,
      editor.canRedo,
      reference.canRedo
    );
    if (source === 'role') editor.redo();
    if (source === 'image') reference.redo();
  }, [editor.canRedo, editor.redo, reference.canRedo, reference.redo]);

  const importRole = useCallback((nextRole: Parameters<EditorApi['importRole']>[0]) => {
    reference.clear();
    historySourceRef.current = 'role';
    editor.importRole(nextRole);
  }, [editor.importRole, reference.clear]);

  const addReferenceImage = useCallback(async (file: File) => {
    try {
      clearSelection();
      await reference.addImageFile(file);
      setStatus(t('status.referenceImageAdded', { name: file.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }, [clearSelection, reference.addImageFile, setStatus]);

  return {
    reference,
    clearSelection,
    selectRole,
    selectManyRole,
    selectGroup,
    selectReferenceImage,
    commitReferenceImageDrag,
    importRole,
    addReferenceImage,
    canUndo: editor.canUndo || reference.canUndo,
    canRedo: editor.canRedo || reference.canRedo,
    undo,
    redo
  };
}
