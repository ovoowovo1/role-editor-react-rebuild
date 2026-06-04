import { useMemo, useState } from 'react';
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

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState(t('status.ready'));
  const shell = useEditorShellUiState(editor.selectedTab, editor.setSelectedTab);
  const colorBlockPresets = useColorBlockPresets(editor.role.camp, setStatus);
  const {
    handleImport,
    handleMerge,
    handleDownloadTwrole,
    handleExportJson
  } = useRoleFileActions({
    role: editor.role,
    importRole: editor.importRole,
    mergeImportedRole: editor.mergeImportedRole,
    setStatus
  });

  const selectedOptionId = useMemo(() => {
    if (shell.topBarMode === 'colorBlock' || shell.topBarMode === 'extra') return undefined;
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab, shell.topBarMode]);

  useEditorShellShortcuts(editor, setStatus);

  return (
    <div className="role-editor-page">
      <div className="editor-window">
        <TopMenu
          camp={editor.role.camp}
          gender={editor.role.gender}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          status={status}
          onImport={handleImport}
          onMerge={handleMerge}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onUndo={editor.undo}
          onRedo={editor.redo}
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
          />

          <EditorStagePanel editor={editor} shell={shell} />

          <LayerList
            decorations={editor.role.decorations}
            headLayer={editor.role.headLayer}
            headLayerIndex={editor.role.headLayerIndex}
            headOptionId={editor.role.parts.head}
            groups={editor.groups}
            selectedIds={editor.selectedDecorationIds}
            canGroupSelected={editor.canGroupSelected}
            onSelect={editor.selectDecoration}
            onSelectMany={editor.selectMultipleDecorations}
            onSelectGroup={editor.selectGroup}
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
            onReorder={editor.reorderDecorations}
            onToggleVisibility={editor.toggleDecorationVisibility}
            onDelete={editor.deleteDecoration}
            onClearSelection={editor.clearSelection}
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
            <a href="https://twrolecgeditor.gamelet.online/" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              https://twrolecgeditor.gamelet.online/
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
