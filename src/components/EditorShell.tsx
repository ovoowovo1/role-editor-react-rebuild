import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { LayerList } from './layers/LayerListFixed';
import { TabBar } from './TabBar';
import { TopMenu } from './TopMenu';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { WeaponAnimationModal } from './WeaponAnimationModal';
import { InsertSettingsDialog } from './InsertSettingsDialog';
import { useColorBlockPresets } from '../hooks/useColorBlockPresets';
import { useRoleEditor } from '../hooks/useRoleEditor';
import { useRoleFileActions } from '../hooks/useRoleFileActions';
import { EditorSourcePanel } from './editor-shell/EditorSourcePanel';
import { EditorStagePanel } from './editor-shell/EditorStagePanel';
import { useEditorShellShortcuts } from './editor-shell/useEditorShellShortcuts';
import { useEditorShellUiState } from './editor-shell/useEditorShellUiState';
import { useReferenceImageLayers } from '../hooks/useReferenceImageLayers';
import { layerIdsForRole } from '../lib/editor/layerOrdering';
import { createGroupTreeIndex, directParentGroup, groupForLayer } from '../lib/editor/groupTree';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../constants/layers';
import { referenceImageLayerToken } from '../types/referenceImage';

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState(t('status.ready'));
  const shell = useEditorShellUiState(editor.selectedTab, editor.setSelectedTab);
  const historySourceRef = useRef<'role' | 'image'>('role');
  const previousRoleRef = useRef(editor.role);
  const reference = useReferenceImageLayers({
    positionRange: editor.role.positionRange,
    onMutation: () => {
      historySourceRef.current = 'image';
      editor.clearRedo();
    }
  });
  const roleLayerOrder = useMemo(
    () => layerIdsForRole(editor.role).reverse(),
    [editor.role]
  );
  useEffect(() => {
    reference.syncRoleLayerOrder(roleLayerOrder);
  }, [reference.syncRoleLayerOrder, roleLayerOrder]);
  useEffect(() => {
    if (previousRoleRef.current === editor.role) return;
    previousRoleRef.current = editor.role;
    historySourceRef.current = 'role';
    reference.clearRedo();
  }, [editor.role, reference.clearRedo]);
  const clearSelection = () => {
    editor.clearSelection();
    reference.selectImage(null);
  };
  const selectRole = (id: string, additive: boolean) => {
    reference.selectImage(null);
    editor.selectDecoration(id, additive);
  };
  const selectManyRole = (ids: string[]) => {
    reference.selectImage(null);
    editor.selectMultipleDecorations(ids);
  };
  const selectGroup = (id: string, additive: boolean) => {
    reference.selectImage(null);
    editor.selectGroup(id, additive);
  };
  const selectReferenceImage = (id: string) => {
    editor.clearSelection();
    reference.selectImage(id);
  };
  const reorderLayer = (activeRowId: string, overRowId: string, options?: Parameters<typeof editor.reorderDecorations>[2]) => {
    const isReferenceRow = (rowId: string) => rowId.startsWith('reference-image:');
    if (!isReferenceRow(activeRowId)) {
      // Role reordering intentionally ignores reference-image rows. This
      // keeps the existing role/group reorder command unaware of runtime data.
      if (isReferenceRow(overRowId)) return;
      editor.reorderDecorations(activeRowId, overRowId, options);
      return;
    }

    const imageId = activeRowId.slice('reference-image:'.length);
    const groups = editor.groups;
    const tree = createGroupTreeIndex(groups);
    const canonicalRole = roleLayerOrder;
    const rootGroupFor = (groupId: string) => {
      let current = groups.find((group) => group.id === groupId);
      while (current) {
        const parent = directParentGroup(groups, { type: 'group', id: current.id });
        if (!parent) return current;
        current = parent;
      }
      return undefined;
    };
    const boundaryTarget = (groupId: string, placement: 'before' | 'after') => {
      const root = rootGroupFor(groupId);
      if (!root) return null;
      const members = new Set(tree.descendantLayerIds(root.id));
      const ordered = canonicalRole.filter((token) => members.has(token));
      if (!ordered.length) return null;
      // The list is top-to-bottom while canonicalRole is bottom-to-top.
      return placement === 'before'
        ? { token: ordered[ordered.length - 1], placement: 'after' as const }
        : { token: ordered[0], placement: 'before' as const };
    };
    const visualPlacement = options?.placement ?? 'before';
    let targetToken: string | null = null;
    let canonicalPlacement: 'before' | 'after' = visualPlacement === 'before' ? 'after' : 'before';
    if (isReferenceRow(overRowId)) {
      targetToken = referenceImageLayerToken(overRowId.slice('reference-image:'.length));
    } else if (overRowId.startsWith('group:')) {
      const boundary = boundaryTarget(overRowId.slice('group:'.length), visualPlacement);
      targetToken = boundary?.token ?? null;
      canonicalPlacement = boundary?.placement ?? canonicalPlacement;
    } else if (overRowId === HEAD_ROW_ID) {
      targetToken = HEAD_LAYER_ID;
    } else if (overRowId.startsWith('item:')) {
      const itemId = overRowId.slice('item:'.length);
      const group = groupForLayer(groups, itemId);
      if (group) {
        const boundary = boundaryTarget(group.id, visualPlacement);
        targetToken = boundary?.token ?? null;
        canonicalPlacement = boundary?.placement ?? canonicalPlacement;
      } else {
        targetToken = itemId;
      }
    }
    if (targetToken) reference.reorderImage(imageId, targetToken, canonicalPlacement);
  };
  const commitReferenceImageDrag = (id: string, dx: number, dy: number) => {
    const image = reference.images.find((entry) => entry.id === id);
    if (!image) return;
    reference.updateImage(id, { x: image.x + dx, y: image.y + dy });
  };
  const undo = () => {
    if (historySourceRef.current === 'image') {
      if (reference.canUndo) reference.undo();
      else if (editor.canUndo) editor.undo();
      return;
    }
    if (editor.canUndo) editor.undo();
    else reference.undo();
  };
  const redo = () => {
    if (historySourceRef.current === 'image') {
      if (reference.canRedo) reference.redo();
      else if (editor.canRedo) editor.redo();
      return;
    }
    if (editor.canRedo) editor.redo();
    else reference.redo();
  };
  const importRole = (nextRole: Parameters<typeof editor.importRole>[0]) => {
    reference.clear();
    historySourceRef.current = 'role';
    editor.importRole(nextRole);
  };
  const addReferenceImage = async (file: File) => {
    try {
      clearSelection();
      await reference.addImageFile(file);
      setStatus(t('status.referenceImageAdded', { name: file.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
    }
  };
  const colorBlockPresets = useColorBlockPresets(editor.role.camp, setStatus);
  const {
    handleImport,
    handleMerge,
    handleDownloadTwrole,
    handleExportJson
  } = useRoleFileActions({
    role: editor.role,
    importRole,
    mergeImportedRole: editor.mergeImportedRole,
    setStatus
  });

  const selectedOptionId = useMemo(() => {
    if (shell.topBarMode === 'colorBlock' || shell.topBarMode === 'extra') return undefined;
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab, shell.topBarMode]);

  useEditorShellShortcuts(editor, setStatus, reference, undo, redo);

  return (
    <div className="role-editor-page">
      <div className="editor-window">
        <TopMenu
          camp={editor.role.camp}
          gender={editor.role.gender}
          canUndo={editor.canUndo || reference.canUndo}
          canRedo={editor.canRedo || reference.canRedo}
          status={status}
          onImport={handleImport}
          onMerge={handleMerge}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onUndo={undo}
          onRedo={redo}
          onCampChange={editor.changeCamp}
          onGenderChange={editor.changeGender}
          onOpenShortcuts={() => shell.setShortcutsOpen(true)}
          onOpenInsertSettings={() => shell.setInsertSettingsOpen(true)}
        />
        <TabBar value={shell.topBarMode} onChange={shell.handleTopBarChange} />

        <main className="bottom-body">
          <EditorSourcePanel
            editor={editor}
            shell={shell}
            colorBlockPresets={colorBlockPresets}
            selectedOptionId={selectedOptionId}
            setStatus={setStatus}
            onAddReferenceImage={addReferenceImage}
          />

          <EditorStagePanel editor={editor} shell={shell} reference={reference} onClearSelection={clearSelection} onCommitReferenceImageDrag={commitReferenceImageDrag} />

          <LayerList
            decorations={editor.role.decorations}
            headLayer={editor.role.headLayer}
            headLayerIndex={editor.role.headLayerIndex}
            headOptionId={editor.role.parts.head}
            groups={editor.groups}
            selectedIds={editor.selectedDecorationIds}
            referenceImages={reference.images}
            selectedReferenceImageId={reference.selectedId}
            layerOrder={reference.layerOrder}
            canGroupSelected={editor.canGroupSelected}
            onSelect={selectRole}
            onSelectMany={selectManyRole}
            onSelectGroup={selectGroup}
            onGroupSelected={() => {
              editor.groupSelected();
              setStatus(t('status.createdGroup'));
            }}
            onToggleGroupCollapsed={editor.toggleGroupCollapsed}
            onToggleGroupVisibility={editor.toggleGroupVisibility}
            onRenameGroup={(groupId, name) => {
              editor.renameGroup(groupId, name);
              setStatus(t('status.renamedGroup', { name: name.trim() }));
            }}
            onUngroup={(groupId) => {
              editor.ungroup(groupId);
              setStatus(t('status.ungrouped'));
            }}
            onReorder={reorderLayer}
            onToggleVisibility={editor.toggleDecorationVisibility}
            onDelete={editor.deleteDecoration}
            onSelectReferenceImage={selectReferenceImage}
            onToggleReferenceImageVisibility={reference.toggleImageVisibility}
            onDeleteReferenceImage={reference.removeImage}
            onClearSelection={clearSelection}
          />
        </main>

        <ShortcutHelpModal open={shell.shortcutsOpen} onClose={() => shell.setShortcutsOpen(false)} />
        <WeaponAnimationModal
          open={shell.weaponAnimationOpen}
          value={shell.bodyAnimationLabel}
          onChange={(label) => {
            shell.setBodyAnimationLabel(label);
            shell.setBodyAnimationRestartKey((key) => key + 1);
            shell.setBodyAnimationPlaying(true);
            setStatus(t('status.previewWeapon', { label }));
          }}
          onClose={() => shell.setWeaponAnimationOpen(false)}
        />
        <InsertSettingsDialog
          open={shell.insertSettingsOpen}
          settings={editor.insertDraftSettings}
          onChange={editor.setInsertDraftSettings}
          onClose={() => shell.setInsertSettingsOpen(false)}
        />

        <footer className="editor-footer">
          <span>
            {t('footer.officialEditor')}{' '}
            <a href="https://twrolecgeditor.gamelet.online/" target="_blank" rel="noreferrer" className="editor-footer-link">
              https://twrolecgeditor.gamelet.online/
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
