import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { t } from '../i18n';
import { LayerList } from './layers/LayerListFixed';
import { TabBar } from './TabBar';
import { TopMenu } from './TopMenu';
import { useRoleEditor } from '../hooks/useRoleEditor';
import { useRoleFileActions } from '../hooks/useRoleFileActions';
import { EditorSourcePanel } from './editor-shell/EditorSourcePanel';
import { EditorStagePanel } from './editor-shell/EditorStagePanel';
import { useEditorShellShortcuts } from './editor-shell/useEditorShellShortcuts';
import { useEditorShellUiState } from './editor-shell/useEditorShellUiState';
import { useEditorSessionController } from './editor-shell/useEditorSessionController';
import { useLayerStackController } from './editor-shell/useLayerStackController';

const ShortcutHelpModal = lazy(() =>
  import('./ShortcutHelpModal').then(({ ShortcutHelpModal }) => ({ default: ShortcutHelpModal }))
);
const WeaponAnimationModal = lazy(() =>
  import('./WeaponAnimationModal').then(({ WeaponAnimationModal }) => ({ default: WeaponAnimationModal }))
);
const InsertSettingsDialog = lazy(() =>
  import('./InsertSettingsDialog').then(({ InsertSettingsDialog }) => ({ default: InsertSettingsDialog }))
);

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState(t('status.ready'));
  const shell = useEditorShellUiState(editor.selectedTab, editor.setSelectedTab);
  const session = useEditorSessionController({ editor, setStatus });
  const {
    reference,
    clearSelection,
    selectRole,
    selectManyRole,
    selectGroup,
    selectReferenceImage,
    commitReferenceImageDrag,
    addReferenceImage,
    canUndo,
    canRedo,
    undo,
    redo
  } = session;
  const layerStack = useLayerStackController({ editor, reference });
  const reorderLayer = layerStack.reorderLayer;
  const {
    handleImport,
    handleMerge,
    handleDownloadTwrole,
    handleExportJson
  } = useRoleFileActions({
    role: editor.role,
    importRole: session.importRole,
    mergeImportedRole: editor.mergeImportedRole,
    setStatus
  });

  const selectedOptionId = useMemo(() => {
    if (shell.topBarMode === 'colorBlock' || shell.topBarMode === 'extra') return undefined;
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab, shell.topBarMode]);

  useEditorShellShortcuts(editor, setStatus, reference, undo, redo);

  const openShortcuts = useCallback(() => shell.setShortcutsOpen(true), [shell.setShortcutsOpen]);
  const closeShortcuts = useCallback(() => shell.setShortcutsOpen(false), [shell.setShortcutsOpen]);
  const openInsertSettings = useCallback(() => shell.setInsertSettingsOpen(true), [shell.setInsertSettingsOpen]);
  const closeInsertSettings = useCallback(() => shell.setInsertSettingsOpen(false), [shell.setInsertSettingsOpen]);
  const closeWeaponAnimation = useCallback(() => shell.setWeaponAnimationOpen(false), [shell.setWeaponAnimationOpen]);
  const handleWeaponAnimationChange = useCallback(
    (label: string) => {
      shell.setBodyAnimationLabel(label);
      shell.setBodyAnimationRestartKey((key) => key + 1);
      shell.setBodyAnimationPlaying(true);
      setStatus(t('status.previewWeapon', { label }));
    },
    [shell.setBodyAnimationLabel, shell.setBodyAnimationPlaying, shell.setBodyAnimationRestartKey]
  );
  const handleGroupSelected = useCallback(() => {
    editor.groupSelected();
    setStatus(t('status.createdGroup'));
  }, [editor.groupSelected]);
  const handleRenameGroup = useCallback(
    (groupId: string, name: string) => {
      editor.renameGroup(groupId, name);
      setStatus(t('status.renamedGroup', { name: name.trim() }));
    },
    [editor.renameGroup]
  );
  const handleUngroup = useCallback(
    (groupId: string) => {
      editor.ungroup(groupId);
      setStatus(t('status.ungrouped'));
    },
    [editor.ungroup]
  );

  return (
    <div className="role-editor-page">
      <div className="editor-window">
        <TopMenu
          camp={editor.role.camp}
          gender={editor.role.gender}
          canUndo={canUndo}
          canRedo={canRedo}
          status={status}
          onImport={handleImport}
          onMerge={handleMerge}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onUndo={undo}
          onRedo={redo}
          onCampChange={editor.changeCamp}
          onGenderChange={editor.changeGender}
          onOpenShortcuts={openShortcuts}
          onOpenInsertSettings={openInsertSettings}
        />
        <TabBar value={shell.topBarMode} onChange={shell.handleTopBarChange} />

        <main className="bottom-body">
          <EditorSourcePanel
            editor={editor}
            shell={shell}
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
            onGroupSelected={handleGroupSelected}
            onToggleGroupCollapsed={editor.toggleGroupCollapsed}
            onToggleGroupVisibility={editor.toggleGroupVisibility}
            onRenameGroup={handleRenameGroup}
            onUngroup={handleUngroup}
            onReorder={reorderLayer}
            onToggleVisibility={editor.toggleDecorationVisibility}
            onDelete={editor.deleteDecoration}
            onSelectReferenceImage={selectReferenceImage}
            onToggleReferenceImageVisibility={reference.toggleImageVisibility}
            onDeleteReferenceImage={reference.removeImage}
            onClearSelection={clearSelection}
          />
        </main>

        <Suspense fallback={null}>
          {shell.shortcutsOpen ? (
            <ShortcutHelpModal open={shell.shortcutsOpen} onClose={closeShortcuts} />
          ) : null}
          {shell.weaponAnimationOpen ? (
            <WeaponAnimationModal
              open={shell.weaponAnimationOpen}
              value={shell.bodyAnimationLabel}
              onChange={handleWeaponAnimationChange}
              onClose={closeWeaponAnimation}
            />
          ) : null}
          {shell.insertSettingsOpen ? (
            <InsertSettingsDialog
              open={shell.insertSettingsOpen}
              settings={editor.insertDraftSettings}
              onChange={editor.setInsertDraftSettings}
              onClose={closeInsertSettings}
            />
          ) : null}
        </Suspense>

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
