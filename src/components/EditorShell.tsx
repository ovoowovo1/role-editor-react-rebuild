import { Suspense, lazy, useMemo, useState } from 'react';
import { ChoiceGrid } from './ChoiceGrid';
import { EditControls } from './EditControls';
import { LayerList } from './LayerList';
import { TabBar } from './TabBar';
import { TitleBar } from './TitleBar';
import { TopMenu } from './TopMenu';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { optionById, tabLabels } from '../mock/options';
import { downloadBlob } from '../lib/math';
import { createRoleJsonBlob, createTwroleBlob } from '../lib/legacyTwroleExport';
import { parseRoleFile, parseRoleFileInWorker, roleToEnvelope } from '../lib/roleSerialization';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRoleEditor } from '../hooks/useRoleEditorWithHeadLayerDrag';

const CharacterStage = lazy(async () => import('./CharacterStage').then((module) => ({ default: module.CharacterStage })));

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState('Ready');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [facingQuarterTurns, setFacingQuarterTurns] = useState(0);

  const selectedOptionId = useMemo(() => {
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab]);

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
        setStatus('Created group from selected layers');
      },
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
    setStatus(`Importing ${file.name}...`);
    try {
      const result = await parseRoleFileInWorker(file).catch(() => parseRoleFile(file));
      editor.importRole(result.role);
      setStatus(result.warnings.length ? result.warnings.join(' ') : `Imported ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Import failed: ${message}`);
    }
  };

  const handleDownloadTwrole = () => {
    downloadBlob(createTwroleBlob(editor.role), 'role.twrole');
    setStatus('Downloaded legacy-compatible .twrole file');
  };

  const handleExportJson = () => {
    downloadBlob(createRoleJsonBlob(editor.role), 'role.json');
    setStatus('Exported legacy-compatible compact role JSON');
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
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />
        <TabBar value={editor.selectedTab} onChange={editor.setSelectedTab} />

        <main className="bottom-body">
          <ChoiceGrid
            tab={editor.selectedTab}
            options={editor.visibleOptionsByTab[editor.selectedTab]}
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
            <Suspense fallback={<div className="stage-panel" />}>
              <CharacterStage
                role={editor.role}
                selectedIds={editor.selectedDecorationIds}
                stageScale={editor.stageScale}
                facingQuarterTurns={facingQuarterTurns}
                onSelectDecoration={editor.selectDecoration}
                onClearSelection={editor.clearSelection}
                onUpdateDecoration={editor.updateDecoration}
                onBeginTransient={editor.beginTransient}
                onCommitTransient={editor.commitTransient}
              />
            </Suspense>
            <EditControls
              disabled={!editor.selectedDecorationIds.length}
              faceAlwaysEnabled
              selectedCount={editor.selectedDecorationIds.length}
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
              onMirrorCopyHorizontal={editor.mirrorCopyHorizontalSelected}
              onMirrorCopyVertical={editor.mirrorCopyVerticalSelected}
              onFaceRotate={() => setFacingQuarterTurns((turns) => (turns + 1) % 4)}
              onStageScaleChange={editor.setStageScale}
            />
          </section>

          <LayerList
            decorations={editor.role.decorations}
            headLayer={editor.role.headLayer}
            headLayerIndex={editor.role.headLayerIndex}
            headOptionId={editor.role.parts.head}
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

        <ShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <footer className="editor-footer">
          <span>
            Official editor go to{' '}
            <a
              href="https://twrolecgeditor.gamelet.online/"
              target="_blank"
              rel="noreferrer"
              style={{ color: "white", textDecoration: "none" }}
            >
              https://twrolecgeditor.gamelet.online/
            </a>
          </span>
          <span>Selected option: {selectedOptionId ? optionById[selectedOptionId]?.label ?? selectedOptionId : 'none'}</span>
        </footer>
      </div>
    </div>
  );
}
