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
import { parseRoleFileWithLegacyGroups, parseRoleFileInWorkerWithLegacyGroups } from '../lib/legacyGroupImport';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRoleEditor, type InsertDraftSettings } from '../hooks/useRoleEditorWithHeadSelectAll';

const CharacterStage = lazy(async () => import('./CharacterStage').then((module) => ({ default: module.CharacterStage })));

function isValidAfterIndex(value: string): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1;
}

interface InsertSettingsDialogProps {
  open: boolean;
  settings: InsertDraftSettings;
  onChange(settings: InsertDraftSettings): void;
  onClose(): void;
}

function InsertSettingsDialog({ open, settings, onChange, onClose }: InsertSettingsDialogProps) {
  const validIndex = settings.placement !== 'after_index' || isValidAfterIndex(settings.index);
  if (!open) return null;

  const updateSettings = (patch: Partial<InsertDraftSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const updateScopes = (patch: Partial<InsertDraftSettings['scopes']>) => {
    onChange({ ...settings, scopes: { ...settings.scopes, ...patch } });
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insert-settings-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(430px, calc(100vw - 32px))',
          borderRadius: 12,
          border: '1px solid rgba(174, 244, 255, 0.45)',
          background: 'linear-gradient(#08384a, #02141d)',
          boxShadow: '0 18px 60px rgba(0, 0, 0, 0.45)',
          color: 'white',
          padding: 18
        }}
      >
        <h3 id="insert-settings-title" style={{ margin: '0 0 14px', fontSize: 18 }}>
          Insert Settings
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 320 }}>
          <strong>Insert target</strong>
          <label>
            <input type="radio" checked={settings.placement === 'top'} onChange={() => updateSettings({ placement: 'top' })} /> List Top
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'bottom'} onChange={() => updateSettings({ placement: 'bottom' })} /> List Bottom
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'after_index'} onChange={() => updateSettings({ placement: 'after_index' })} /> Below Index
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Visible row number (1-based)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={settings.index}
              disabled={settings.placement !== 'after_index'}
              onChange={(event) => updateSettings({ index: event.target.value })}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' && validIndex) onClose();
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 8,
                border: validIndex ? '1px solid rgba(174, 244, 255, 0.45)' : '1px solid #ff9c9c',
                background: 'rgba(0, 0, 0, 0.32)',
                color: 'white',
                padding: '10px 12px'
              }}
            />
            <small style={{ color: validIndex ? 'rgba(232, 252, 255, 0.75)' : '#ffb4b4' }}>
              {settings.placement === 'after_index'
                ? validIndex
                  ? 'New items will be inserted below this visible row.'
                  : 'Please enter an integer >= 1.'
                : 'Enable "Below Index" to edit this value.'}
            </small>
          </label>

          <strong>Affect create sources</strong>
          <label>
            <input type="checkbox" checked={settings.scopes.palette} onChange={() => updateScopes({ palette: !settings.scopes.palette })} /> 左側素材點擊新增
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.copy} onChange={() => updateScopes({ copy: !settings.scopes.copy })} /> 複製/貼上與鏡像複製
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.mergeBatch} onChange={() => updateScopes({ mergeBatch: !settings.scopes.mergeBatch })} /> Merge / Batch Add
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" disabled={!validIndex} onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState('Ready');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [insertSettingsOpen, setInsertSettingsOpen] = useState(false);
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
      const result = await parseRoleFileInWorkerWithLegacyGroups(file).catch(() => parseRoleFileWithLegacyGroups(file));
      editor.importRole(result.role);
      setStatus(result.warnings.length ? result.warnings.join(' ') : `Imported ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Import failed: ${message}`);
    }
  };

  const handleMerge = async (file: File) => {
    setStatus(`Merging ${file.name}...`);
    try {
      const result = await parseRoleFileInWorkerWithLegacyGroups(file).catch(() => parseRoleFileWithLegacyGroups(file));
      editor.mergeImportedRole(result.role);
      setStatus(result.warnings.length ? `Merged ${file.name}. ${result.warnings.join(' ')}` : `Merged ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Merge failed: ${message}`);
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

  return (
    <div className="role-editor-page">
      <div className="editor-window">
        <TitleBar />
        <TopMenu
          camp={editor.role.camp}
          gender={editor.role.gender}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          canMerge={editor.canMergeSelected}
          status={status}
          onImport={handleImport}
          onMerge={handleMerge}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onCampChange={editor.changeCamp}
          onGenderChange={editor.changeGender}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenInsertSettings={() => setInsertSettingsOpen(true)}
          onMergeSelected={() => {
            editor.mergeSelectedAsBatch();
            setStatus('Merged selected layers as a new batch');
          }}
        />
        <TabBar value={editor.selectedTab} onChange={editor.setSelectedTab} />

        <main className="bottom-body">
          <ChoiceGrid
            tab={editor.selectedTab}
            options={editor.visibleOptionsByTab[editor.selectedTab]}
            selectedOptionId={selectedOptionId}
            onPick={(option) => {
              editor.choosePart(editor.selectedTab, option);
              setStatus(editor.selectedTab === 'deco' ? `Added ${option.label}` : `Changed ${tabLabels[editor.selectedTab]} to ${option.label}`);
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
        <InsertSettingsDialog
          open={insertSettingsOpen}
          settings={editor.insertDraftSettings}
          onChange={editor.setInsertDraftSettings}
          onClose={() => setInsertSettingsOpen(false)}
        />

        <footer className="editor-footer">
          <span>
            Official editor go to{' '}
            <a href="https://twrolecgeditor.gamelet.online/" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
              https://twrolecgeditor.gamelet.online/
            </a>
          </span>
          <span>Selected option: {selectedOptionId ? optionById[selectedOptionId]?.label ?? selectedOptionId : 'none'}</span>
        </footer>
      </div>
    </div>
  );
}
