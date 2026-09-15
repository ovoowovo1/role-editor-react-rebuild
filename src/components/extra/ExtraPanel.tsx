import { useCallback, useEffect, useState } from 'react';
import { t } from '../../i18n';
import { preloadAutoCreateMseChartCanvas } from '../auto-create/AutoCreateMseChart';
import { AutoCreateTwrolePanelContent } from '../auto-create/AutoCreateTwrolePanel';
import {
  BrushFillPanel,
  ExtraActionBar,
  ExtraConversionSettings,
  ExtraModeSwitch,
  ExtraProgressView,
  ExtraStatsView,
  ExtraWarnings,
  ImageImportPanel
} from './ExtraPanelParts';
import { ReferenceImagePanel } from './ReferenceImagePanel';
import { PinOutlinePanel } from './PinOutlinePanel';
import { formatNumber } from './extraPanelModels';
import { useExtraPanelController, type ExtraPanelProps } from './useExtraPanelController';

type ExtraPanelToolTab = 'standard' | 'autoCreate';
type ExtraEntry = 'chooser' | 'referenceImage' | 'imageToTwrole' | 'pinOutline';

const toolTabs: ExtraPanelToolTab[] = ['standard', 'autoCreate'];

export function ExtraPanel({
  decoOptions,
  role,
  insertDraftSettings,
  brushFillActive,
  brushFillBrushSize,
  brushFillMask,
  onBrushFillActiveChange,
  onBrushFillBrushSizeChange,
  onBrushFillClear,
  onInsert,
  onStatus,
  onAddReferenceImage,
  onInsertPinOutline,
  pinOutline
}: ExtraPanelProps) {
  const [entry, setEntry] = useState<ExtraEntry>('chooser');
  const [toolTab, setToolTab] = useState<ExtraPanelToolTab>('standard');
  const controller = useExtraPanelController({
    decoOptions,
    role,
    insertDraftSettings,
    brushFillActive,
    brushFillBrushSize,
    brushFillMask,
    onBrushFillActiveChange,
    onBrushFillBrushSizeChange,
    onBrushFillClear,
    onInsert,
    onStatus,
    onAddReferenceImage,
    onInsertPinOutline,
    pinOutline
  });

  useEffect(() => {
    if (toolTab !== 'standard' && brushFillActive) {
      onBrushFillActiveChange(false);
    }
  }, [brushFillActive, onBrushFillActiveChange, toolTab]);

  const changeToolTab = useCallback(
    (nextToolTab: ExtraPanelToolTab) => {
      setToolTab(nextToolTab);
      if (nextToolTab === 'autoCreate') {
        preloadAutoCreateMseChartCanvas();
      }
      if (nextToolTab !== 'standard') {
        onBrushFillActiveChange(false);
      }
    },
    [onBrushFillActiveChange]
  );

  return (
    <section className="choice-list extra-panel" aria-label={t('extra.title')}>
      <header className="choice-list-header extra-panel-header">
        <strong>{t('extra.title')}</strong>
        <span>{t('extra.sourceCount', { count: formatNumber(decoOptions.length) })}</span>
      </header>

      <div className="extra-scroll">
        {entry === 'chooser' ? (
          <div className="extra-entry-chooser" data-testid="extra-entry-chooser">
            <div className="extra-section extra-section-first">
              <strong>{t('extra.entry.prompt')}</strong>
            </div>
            <div className="extra-actions extra-entry-actions">
              <button
                type="button"
                className="primary-button"
                data-testid="extra-entry-reference-image-button"
                onClick={() => setEntry('referenceImage')}
              >
                {t('extra.entry.referenceImage')}
              </button>
              <button
                type="button"
                className="primary-button"
                data-testid="extra-entry-image-to-twrole-button"
                onClick={() => setEntry('imageToTwrole')}
              >
                {t('extra.entry.imageToTwrole')}
              </button>
              <button
                type="button"
                className="primary-button"
                data-testid="extra-entry-pin-outline-button"
                onClick={() => setEntry('pinOutline')}
              >
                {t('extra.entry.pinOutline')}
              </button>
            </div>
          </div>
        ) : entry === 'referenceImage' ? (
          <div id="extra-panel-reference-image" role="tabpanel" aria-label={t('extra.entry.referenceImage')}>
            <button type="button" className="primary-button extra-entry-back" onClick={() => setEntry('chooser')}>
              {t('extra.entry.back')}
            </button>
            <ReferenceImagePanel onAddReferenceImage={onAddReferenceImage ?? (async () => undefined)} />
          </div>
        ) : entry === 'pinOutline' ? (
          <div id="extra-panel-pin-outline" role="tabpanel" aria-label={t('extra.entry.pinOutline')}>
            <button type="button" className="primary-button extra-entry-back" onClick={() => setEntry('chooser')}>
              {t('extra.entry.back')}
            </button>
            <PinOutlinePanel
              roleCamp={role.camp}
              decoOptions={decoOptions}
              state={pinOutline.state}
              onToggleActive={pinOutline.toggleActive}
              onClear={pinOutline.clear}
              onRemovePin={pinOutline.removePin}
              onReorderPins={pinOutline.reorderPins}
              onUpdateSegment={pinOutline.updateSegment}
              onAddMaterial={pinOutline.addMaterial}
              onRemoveMaterial={pinOutline.removeMaterial}
              onSelectMaterial={pinOutline.selectMaterial}
              onInsert={onInsertPinOutline}
            />
          </div>
        ) : (
          <div id="extra-panel-image-to-twrole" role="tabpanel" aria-label={t('extra.entry.imageToTwrole')}>
            <button type="button" className="primary-button extra-entry-back" onClick={() => setEntry('chooser')}>
              {t('extra.entry.back')}
            </button>
            <div className="extra-section extra-section-first extra-tool-tabs">
              <div className="extra-segmented extra-tool-tab-list" role="tablist" aria-label={t('extra.method.label')}>
                {toolTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    className={toolTab === tab ? 'selected' : ''}
                    aria-selected={toolTab === tab}
                    aria-controls={`extra-panel-${tab}`}
                    id={`extra-tool-tab-${tab}`}
                    onFocus={tab === 'autoCreate' ? preloadAutoCreateMseChartCanvas : undefined}
                    onClick={() => changeToolTab(tab)}
                  >
                    {tab === 'standard' ? t('extra.method.standard') : t('extra.method.autoCreate')}
                  </button>
                ))}
              </div>
            </div>

            {toolTab === 'autoCreate' ? (
              <div
                id="extra-panel-autoCreate"
                role="tabpanel"
                aria-labelledby="extra-tool-tab-autoCreate"
              >
                <AutoCreateTwrolePanelContent
                  decoOptions={decoOptions}
                  role={role}
                  insertDraftSettings={insertDraftSettings}
                  onInsert={onInsert}
                  onStatus={onStatus}
                />
              </div>
            ) : (
              <div id="extra-panel-standard" role="tabpanel" aria-labelledby="extra-tool-tab-standard">
                <ExtraModeSwitch toolMode={controller.toolMode} onChange={controller.setToolMode} />

                {controller.toolMode === 'image' ? (
                  <ImageImportPanel file={controller.file} visiblePreview={controller.visiblePreview} onAcceptFile={controller.acceptFile} />
                ) : (
                  <BrushFillPanel
                    active={brushFillActive}
                    hasBrushRange={controller.hasBrushRange}
                    pointCount={brushFillMask.points.length}
                    onActiveChange={onBrushFillActiveChange}
                    onClear={controller.clearBrushRange}
                  />
                )}

                <ExtraConversionSettings
                  toolMode={controller.toolMode}
                  quality={controller.quality}
                  options={controller.options}
                  brushFillBrushSize={brushFillBrushSize}
                  brushSourceMode={controller.brushSourceMode}
                  brushColor={controller.brushColor}
                  brushDecoId={controller.brushDecoId}
                  decoOptions={decoOptions}
                  onPreset={controller.setPreset}
                  onPatchOptions={controller.patchOptions}
                  onBrushFillBrushSizeChange={onBrushFillBrushSizeChange}
                  onBrushSourceModeChange={controller.changeBrushSourceMode}
                  onBrushColorChange={controller.changeBrushColor}
                  onBrushDecoIdChange={controller.changeBrushDecoId}
                />

                <ExtraActionBar
                  toolMode={controller.toolMode}
                  canConvert={controller.canConvert}
                  converting={controller.converting}
                  canInsert={controller.canInsert}
                  inserted={controller.inserted}
                  canBrushFill={controller.canBrushFill}
                  brushFilling={controller.brushFilling}
                  onConvert={controller.convert}
                  onInsert={controller.insert}
                  onBrushFill={controller.fillBrushRange}
                />

                <ExtraProgressView progress={controller.progress} active={controller.converting} />
                <ExtraStatsView items={controller.toolMode === 'image' ? controller.summary : controller.brushSummary} />

                <label className="extra-group-name">
                  <span>{t('extra.groupName')}</span>
                  <input value={controller.groupName} onChange={(event) => controller.setGroupName(event.target.value)} />
                </label>

                <ExtraWarnings warnings={controller.toolMode === 'image' ? controller.resultWarnings : controller.brushResultWarnings} />
                {controller.error ? <div className="extra-message error">{controller.error}</div> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
