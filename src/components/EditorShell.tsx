import { useMemo, useState } from 'react';
import { ChoiceGrid } from './ChoiceGrid';
import { CharacterStage } from './CharacterStage';
import { EditControls } from './EditControls';
import { LayerList } from './LayerList';
import { TabBar } from './TabBar';
import { TitleBar } from './TitleBar';
import { TopMenu } from './TopMenu';
import { optionById, partOptions, tabLabels } from '../mock/options';
import { downloadBlob } from '../lib/math';
import { createRoleJsonBlob, createTwroleBlob, parseRoleFile, roleToEnvelope } from '../lib/roleSerialization';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRoleEditor } from '../hooks/useRoleEditor';

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState('Ready');

  const selectedOptionId = useMemo(() => {
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab]);

  const shortcutActions = useMemo(
    () => ({
      hasSelection: editor.selectedDecorationIds.length > 0,
      editValues: editor.editValues,
      undo: editor.undo,
      redo: editor.redo,
      copy: editor.copySelected,
      paste: editor.pasteClipboard,
      selectAll: editor.selectAllDecorations,
      deleteSelected: editor.deleteSelected,
      clearSelection: editor.clearSelection,
      moveSelectedToBoundary: editor.moveSelectedToBoundary,
      nudge: (dx: number, dy: number) => editor.nudgeSelected(dx, dy),
      rotateBy: editor.rotateSelectedBy,
      scaleBy: editor.scaleSelectedBy,
      ratioBy: editor.ratioSelectedBy
    }),
    [editor]
  );

  useKeyboardShortcuts(shortcutActions);

  const handleImport = async (file: File) => {
    try {
      const result = await parseRoleFile(file);
      editor.importRole(result.role);
      setStatus(result.warnings.length ? result.warnings.join(' ') : `Imported ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Import failed: ${message}`);
    }
  };

  const handleDownloadTwrole = () => {
    downloadBlob(createTwroleBlob(editor.role), 'role.twrole');
    setStatus('Downloaded compressed mock .twrole file');
  };

  const handleExportJson = () => {
    downloadBlob(createRoleJsonBlob(editor.role), 'role.json');
    setStatus('Exported readable role JSON');
  };

  const handleSaveMock = () => {
    const envelope = roleToEnvelope(editor.role);
    window.dispatchEvent(new CustomEvent('mockRoleEditor:saveRole', { detail: envelope }));
    setStatus('Save emitted mockRoleEditor:saveRole event');
  };

  return (
    <div className="role-editor-page">
      <div className="editor-window">
        <TitleBar />
        <TopMenu
          camp={editor.role.camp}
          gender={editor.role.gender}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          status={status}
          onImport={handleImport}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onSaveMock={handleSaveMock}
          onNewDesign={() => {
            editor.newDesign();
            setStatus('Started a new mock role design');
          }}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onCampChange={editor.changeCamp}
          onGenderChange={editor.changeGender}
        />
        <TabBar value={editor.selectedTab} onChange={editor.setSelectedTab} />

        <main className="bottom-body">
          <ChoiceGrid
            tab={editor.selectedTab}
            options={partOptions[editor.selectedTab]}
            selectedOptionId={selectedOptionId}
            onPick={(option) => {
              editor.choosePart(editor.selectedTab, option);
              setStatus(
                editor.selectedTab === 'deco'
                  ? `Added ${option.label}`
                  : `Changed ${tabLabels[editor.selectedTab]} to ${option.label}`
              );
            }}
          />

          <section className="edit-block">
            <CharacterStage
              role={editor.role}
              selectedIds={editor.selectedDecorationIds}
              stageScale={editor.stageScale}
              onSelectDecoration={editor.selectDecoration}
              onClearSelection={editor.clearSelection}
              onUpdateDecoration={editor.updateDecoration}
              onBeginTransient={editor.beginTransient}
              onCommitTransient={editor.commitTransient}
            />
            <EditControls
              disabled={!editor.selectedDecorationIds.length}
              selectedCount={editor.selectedDecorationIds.length}
              clipboardCount={editor.clipboardCount}
              editValues={editor.editValues}
              stageScale={editor.stageScale}
              positionRange={editor.role.positionRange ?? 60}
              stageMinScale={editor.stageMinScale}
              stageMaxScale={editor.stageMaxScale}
              selectionScaleMin={editor.selectionScaleMin}
              selectionScaleMax={editor.selectionScaleMax}
              onBeginTransient={editor.beginTransient}
              onCommitTransient={editor.commitTransient}
              onTransformChange={editor.updateSelectedTransform}
              onFlip={editor.flipSelected}
              onShow={() => editor.setSelectedVisible(true)}
              onHide={() => editor.setSelectedVisible(false)}
              onDelete={editor.deleteSelected}
              onCopy={() => {
                editor.copySelected();
                setStatus(`Copied ${editor.selectedDecorationIds.length} layer(s)`);
              }}
              onPaste={() => {
                editor.pasteClipboard();
                setStatus('Pasted copied layer(s)');
              }}
              onMoveTop={() => editor.moveSelectedToBoundary('top')}
              onMoveBottom={() => editor.moveSelectedToBoundary('bottom')}
              onStageScaleChange={editor.setStageScale}
            />
          </section>

          <LayerList
            decorations={editor.role.decorations}
            groups={editor.groups}
            selectedIds={editor.selectedDecorationIds}
            canGroupSelected={editor.canGroupSelected}
            onSelect={editor.selectDecoration}
            onSelectGroup={editor.selectGroup}
            onGroupSelected={() => {
              editor.groupSelected();
              setStatus('Created group from selected layers');
            }}
            onToggleGroupCollapsed={editor.toggleGroupCollapsed}
            onToggleGroupVisibility={editor.toggleGroupVisibility}
            onUngroup={(groupId) => {
              editor.ungroup(groupId);
              setStatus('Ungrouped layer group');
            }}
            onReorder={editor.reorderDecorations}
            onToggleVisibility={editor.toggleDecorationVisibility}
            onDelete={editor.deleteDecoration}
            onClearSelection={editor.clearSelection}
          />
        </main>

        <footer className="editor-footer">
          <span>Mock runtime active: CgLibs/Base/TwilightWarsLib/GLT resources are replaced by local adapters.</span>
          <span>Selected option: {selectedOptionId ? optionById[selectedOptionId]?.label ?? selectedOptionId : 'none'}</span>
        </footer>
      </div>
    </div>
  );
}
