import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { t } from '../i18n';
import { ChoiceGrid } from './ChoiceGrid';
import { ColorBlockGrid } from './ColorBlockGrid';
import { EditControls } from './EditControls';
import { LayerList } from './LayerList';
import { TabBar, type TopBarMode } from './TabBar';
import { TitleBar } from './TitleBar';
import { TopMenu } from './TopMenu';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { WeaponAnimationModal } from './WeaponAnimationModal';
import { ExtraPanel } from './ExtraPanel';
import { tabLabels } from '../mock/options';
import { colorBlockToRole, type ColorBlockPreset } from '../mock/colorBlocks';
import { downloadBlob } from '../lib/math';
import { fetchColorBlockPresets } from '../lib/colorBlockApi';
import { createRoleJsonBlob, createTwroleBlob } from '../lib/legacyTwroleExport';
import { parseRoleFileWithLegacyGroups, parseRoleFileInWorkerWithLegacyGroups } from '../lib/legacyGroupImport';
import { DEFAULT_ACTOR_BODY_ANIMATION_LABEL } from '../lib/actorBodyAnimation';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useRoleEditor, type InsertDraftSettings } from '../hooks/useRoleEditor';
import type { PartTab } from '../types/role';
import type { BrushFillMask } from '../lib/brushFillToDeco';

const CharacterStage = lazy(async () => import('./CharacterStage').then((module) => ({ default: module.CharacterStage })));

function tabI18nKeys(tab: PartTab): string {
  const map: Record<PartTab, string> = { deco: 'tabs.deco', head: 'tabs.head', hand: 'tabs.hand', foot: 'tabs.foot', cape: 'tabs.cape' };
  return map[tab];
}

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
          {t('insert.title')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 320 }}>
          <strong>{t('insert.target')}</strong>
          <label>
            <input type="radio" checked={settings.placement === 'top'} onChange={() => updateSettings({ placement: 'top' })} /> {t('insert.listTop')}
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'bottom'} onChange={() => updateSettings({ placement: 'bottom' })} /> {t('insert.listBottom')}
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'after_index'} onChange={() => updateSettings({ placement: 'after_index' })} /> {t('insert.belowIndex')}
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>{t('insert.visibleRow')}</span>
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
                  ? t('insert.newItemsBelow')
                  : t('insert.enterInteger')
                : t('insert.enableBelow')}
            </small>
          </label>

          <strong>{t('insert.affectSources')}</strong>
          <label>
            <input type="checkbox" checked={settings.scopes.palette} onChange={() => updateScopes({ palette: !settings.scopes.palette })} /> {t('insert.scopePalette')}
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.copy} onChange={() => updateScopes({ copy: !settings.scopes.copy })} /> {t('insert.scopeCopy')}
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.mergeBatch} onChange={() => updateScopes({ mergeBatch: !settings.scopes.mergeBatch })} /> {t('insert.scopeMergeBatch')}
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose}>{t('insert.cancel')}</button>
          <button type="button" disabled={!validIndex} onClick={onClose}>{t('insert.save')}</button>
        </div>
      </div>
    </div>
  );
}

export function EditorShell() {
  const editor = useRoleEditor();
  const [status, setStatus] = useState(t('status.ready'));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [insertSettingsOpen, setInsertSettingsOpen] = useState(false);
  const [weaponAnimationOpen, setWeaponAnimationOpen] = useState(false);
  const [bodyAnimationLabel, setBodyAnimationLabel] = useState(DEFAULT_ACTOR_BODY_ANIMATION_LABEL);
  const [bodyAnimationPlaying, setBodyAnimationPlaying] = useState(false);
  const [bodyAnimationRestartKey, setBodyAnimationRestartKey] = useState(0);
  const [facingQuarterTurns, setFacingQuarterTurns] = useState(0);
  const [topBarMode, setTopBarMode] = useState<TopBarMode>(editor.selectedTab);
  const [colorBlockPresets, setColorBlockPresets] = useState<ColorBlockPreset[]>([]);
  const [colorBlockLoading, setColorBlockLoading] = useState(false);
  const [colorBlockError, setColorBlockError] = useState<string | null>(null);
  const [brushFillActive, setBrushFillActive] = useState(false);
  const [brushFillBrushSize, setBrushFillBrushSize] = useState(18);
  const [brushFillMask, setBrushFillMask] = useState<BrushFillMask>({ points: [] });

  useEffect(() => {
    let isCurrentCamp = true;
    setColorBlockLoading(true);
    setColorBlockError(null);

    fetchColorBlockPresets(editor.role.camp)
      .then((presets) => {
        if (!isCurrentCamp) return;
        setColorBlockPresets(presets);
        setColorBlockLoading(false);
      })
      .catch((error) => {
        if (!isCurrentCamp) return;
        const message = error instanceof Error ? error.message : String(error);
        setColorBlockPresets([]);
        setColorBlockError(t('colorBlock.loadFailed', { message }));
        setColorBlockLoading(false);
        setStatus(t('status.colorBlockLoadFailed', { message }));
      });

    return () => {
      isCurrentCamp = false;
    };
  }, [editor.role.camp]);

  const selectedOptionId = useMemo(() => {
    if (topBarMode === 'colorBlock' || topBarMode === 'extra') return undefined;
    if (editor.selectedTab === 'deco') return editor.selectedDecorations[0]?.assetId;
    return editor.role.parts[editor.selectedTab as keyof typeof editor.role.parts];
  }, [editor.role.parts, editor.selectedDecorations, editor.selectedTab, topBarMode]);

  const handleTopBarChange = (mode: TopBarMode) => {
    setTopBarMode(mode);
    if (mode !== 'extra') setBrushFillActive(false);
    if (mode !== 'colorBlock' && mode !== 'extra') {
      editor.setSelectedTab(mode as PartTab);
    }
  };

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
    [editor]
  );

  useKeyboardShortcuts(shortcutActions);

  const handleImport = async (file: File) => {
    setStatus(t('status.importing', { name: file.name }));
    try {
      const result = await parseRoleFileInWorkerWithLegacyGroups(file).catch(() => parseRoleFileWithLegacyGroups(file));
      editor.importRole(result.role);
      setStatus(result.warnings.length ? result.warnings.join(' ') : t('status.imported', { name: file.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(t('status.importFailed', { message }));
    }
  };

  const handleMerge = async (file: File) => {
    setStatus(t('status.merging', { name: file.name }));
    try {
      const result = await parseRoleFileInWorkerWithLegacyGroups(file).catch(() => parseRoleFileWithLegacyGroups(file));
      editor.mergeImportedRole(result.role);
      setStatus(result.warnings.length ? `${t('status.merged', { name: file.name })}. ${result.warnings.join(' ')}` : t('status.merged', { name: file.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(t('status.mergeFailed', { message }));
    }
  };

  const handleDownloadTwrole = () => {
    downloadBlob(createTwroleBlob(editor.role), 'role.twrole');
    setStatus(t('status.downloadedTwrole'));
  };

  const handleExportJson = () => {
    downloadBlob(createRoleJsonBlob(editor.role), 'role.json');
    setStatus(t('status.exportedJson'));
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
          onMerge={handleMerge}
          onDownloadTwrole={handleDownloadTwrole}
          onExportJson={handleExportJson}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onCampChange={editor.changeCamp}
          onGenderChange={editor.changeGender}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenInsertSettings={() => setInsertSettingsOpen(true)}
        />
        <TabBar value={topBarMode} onChange={handleTopBarChange} />

        <main className="bottom-body">
          {topBarMode === 'extra' ? (
            <ExtraPanel
              decoOptions={editor.visibleOptionsByTab.deco}
              brushFillActive={brushFillActive}
              brushFillBrushSize={brushFillBrushSize}
              brushFillMask={brushFillMask}
              onBrushFillActiveChange={setBrushFillActive}
              onBrushFillBrushSizeChange={setBrushFillBrushSize}
              onBrushFillClear={() => setBrushFillMask({ points: [] })}
              onInsert={editor.insertDecorationBatch}
              onStatus={setStatus}
            />
          ) : topBarMode === 'colorBlock' ? (
            <ColorBlockGrid
              presets={colorBlockPresets}
              loading={colorBlockLoading}
              error={colorBlockError}
              onPick={(preset) => {
                editor.mergeImportedRole(colorBlockToRole(preset, editor.role));
                setStatus(t('status.addedColorBlock', { label: preset.label }));
              }}
            />
          ) : (
            <ChoiceGrid
              tab={editor.selectedTab}
              options={editor.visibleOptionsByTab[editor.selectedTab]}
              selectedOptionId={selectedOptionId}
              onPick={(option) => {
                editor.choosePart(editor.selectedTab, option);
                setStatus(editor.selectedTab === 'deco' ? t('status.addedDeco', { label: option.label }) : t('status.changedPart', { tab: t(tabI18nKeys(editor.selectedTab)), label: option.label }));
              }}
            />
          )}

          <section className="edit-block">
            <Suspense fallback={<div className="stage-panel" />}>
              <CharacterStage
                role={editor.role}
                selectedIds={editor.selectedDecorationIds}
                bodyAnimationLabel={bodyAnimationLabel}
                bodyAnimationPlaying={bodyAnimationPlaying}
                bodyAnimationRestartKey={bodyAnimationRestartKey}
                stageScale={editor.stageScale}
                facingQuarterTurns={facingQuarterTurns}
                onUpdateDecoration={editor.updateDecoration}
                onApplyDragDelta={(dx, dy) => editor.applyDragDeltaToSelected(dx, dy)}
                onCommitDragDelta={editor.commitDragDeltaToSelected}
                onBeginTransient={editor.beginTransient}
                onCommitTransient={editor.commitTransient}
                brushFillActive={brushFillActive}
                brushFillBrushSize={brushFillBrushSize}
                brushFillMask={brushFillMask}
                onBrushFillMaskChange={setBrushFillMask}
              />
            </Suspense>
            <EditControls
              disabled={!editor.selectedDecorationIds.length}
              faceAlwaysEnabled
              selectedCount={editor.selectedDecorationIds.length}
              bodyAnimationLabel={bodyAnimationLabel}
              bodyAnimationPlaying={bodyAnimationPlaying}
              editValues={editor.editValues}
              stageScale={editor.stageScale}
              positionRange={editor.role.positionRange ?? 60}
              stageMinScale={editor.stageMinScale}
              stageMaxScale={editor.stageMaxScale}
              selectionScaleMin={editor.selectionScaleMin}
              selectionScaleMax={editor.selectionScaleMax}
              selectionRatioMin={editor.selectionRatioMin}
              selectionRatioMax={editor.selectionRatioMax}
              onBeginTransient={editor.beginTransient}
              onCommitTransient={editor.commitTransient}
              onCancelSelection={editor.clearSelection}
              onTransformChange={editor.updateSelectedTransform}
              onFlip={editor.flipSelected}
              onMirrorCopyHorizontal={editor.mirrorCopyHorizontalSelected}
              onMirrorCopyVertical={editor.mirrorCopyVerticalSelected}
              onFaceRotate={() => setFacingQuarterTurns((turns) => (turns + 1) % 4)}
              onOpenWeaponAnimation={() => setWeaponAnimationOpen(true)}
              onStartWeaponAnimation={() => setBodyAnimationPlaying(true)}
              onStopWeaponAnimation={() => setBodyAnimationPlaying(false)}
              onRestartWeaponAnimation={() => {
                setBodyAnimationRestartKey((key) => key + 1);
                setBodyAnimationPlaying(false);
              }}
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

        <ShortcutHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <WeaponAnimationModal
          open={weaponAnimationOpen}
          value={bodyAnimationLabel}
          onChange={(label) => {
            setBodyAnimationLabel(label);
            setBodyAnimationRestartKey((key) => key + 1);
            setBodyAnimationPlaying(true);
            setStatus(t('status.previewWeapon', { label }));
          }}
          onClose={() => setWeaponAnimationOpen(false)}
        />
        <InsertSettingsDialog
          open={insertSettingsOpen}
          settings={editor.insertDraftSettings}
          onChange={editor.setInsertDraftSettings}
          onClose={() => setInsertSettingsOpen(false)}
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
