import { useCallback, useEffect, useState } from 'react';
import { t } from '../../i18n';
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
import { formatNumber } from './extraPanelModels';
import { useExtraPanelController, type ExtraPanelProps } from './useExtraPanelController';

type ExtraPanelToolTab = 'standard' | 'autoCreate';

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
  onStatus
}: ExtraPanelProps) {
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
    onStatus
  });

  useEffect(() => {
    if (toolTab !== 'standard' && brushFillActive) {
      onBrushFillActiveChange(false);
    }
  }, [brushFillActive, onBrushFillActiveChange, toolTab]);

  const changeToolTab = useCallback(
    (nextToolTab: ExtraPanelToolTab) => {
      setToolTab(nextToolTab);
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
        <span>{formatNumber(decoOptions.length)} deco</span>
      </header>

      <div className="extra-scroll">
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
    </section>
  );
}
