import type { ChangeEvent } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import type { InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import { ImageDropzone } from '../ui/ImageDropzone';
import { ProgressBar } from '../ui/ProgressBar';
import { AutoCreateMseChart } from './AutoCreateMseChart';
import { AutoCreateSourceFilter } from './AutoCreateSourceFilter';
import { formatNumber } from './autoCreatePanelUtils';
import {
  useAutoCreateController,
  type AutoCreateNumericSettingKey
} from './useAutoCreateController';

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

export function AutoCreateTwrolePanelContent({
  decoOptions,
  role,
  insertDraftSettings,
  onInsert,
  onStatus
}: AutoCreateTwrolePanelProps) {
  const ctrl = useAutoCreateController({
    decoOptions,
    role,
    insertDraftSettings,
    onInsert,
    onStatus
  });

  const numberInput = (labelKey: string, key: AutoCreateNumericSettingKey, min: number) => (
    <label className="auto-create-field">
      <span>{t(labelKey)}</span>
      <input
        type="number"
        min={min}
        step={1}
        value={ctrl.settings[key]}
        disabled={ctrl.running}
        onChange={(event: ChangeEvent<HTMLInputElement>) => ctrl.patchNumber(key, event.currentTarget.value)}
      />
    </label>
  );

  return (
    <>
      <ImageDropzone
        className="auto-create-dropzone"
        previewUrl={ctrl.targetPreviewUrl}
        emptyLabel={t('autoCreate.drop')}
        actionLabel={ctrl.file ? t('autoCreate.replace') : t('autoCreate.chooseImage')}
        disabled={ctrl.running}
        onSelect={ctrl.acceptFile}
      />

      <div className="extra-section">
        <div className="extra-section-title">{t('autoCreate.section.settings')}</div>
        <div className="extra-controls auto-create-controls python-gui-controls">
          {numberInput('autoCreate.iterations', 'tiles', 1)}
          {numberInput('autoCreate.budget', 'tileBudget', 0)}
          {numberInput('autoCreate.logEvery', 'logEvery', 1)}
        </div>
        <label className="auto-create-checkbox">
          <input
            type="checkbox"
            checked={ctrl.savePreviewDuringProcess}
            disabled={ctrl.running}
            onChange={(event: ChangeEvent<HTMLInputElement>) => ctrl.patchSavePreview(event.currentTarget.checked)}
          />
          <span>{t('autoCreate.savePreview')}</span>
        </label>
      </div>

      {!ctrl.workerAvailable ? (
        <div className="extra-message warning auto-create-browser-note">
          {t('autoCreate.error.workerUnavailable')}
        </div>
      ) : null}

      <AutoCreateSourceFilter
        sourceTitleItems={ctrl.sourceTitleItems}
        visibleSourceTitleItems={ctrl.visibleSourceTitleItems}
        excludedTitleSet={ctrl.excludedTitleSet}
        filteredOptionCount={ctrl.filteredDecoOptions.length}
        totalOptionCount={decoOptions.length}
        usedTitleCount={ctrl.usedTitleCount}
        search={ctrl.sourceTitleSearch}
        running={ctrl.running}
        onSearchChange={ctrl.setSourceTitleSearch}
        onUseAll={ctrl.useAllSourceTitles}
        onUseVisible={ctrl.useVisibleSourceTitles}
        onExcludeVisible={ctrl.excludeVisibleSourceTitles}
        onToggleTitle={ctrl.toggleSourceTitle}
      />

      <div className="extra-actions auto-create-actions">
        <button
          type="button"
          className="primary-button save"
          data-testid="auto-create-generate-button"
          disabled={!ctrl.file || ctrl.running || ctrl.filteredDecoOptions.length === 0 || !ctrl.workerAvailable}
          onClick={ctrl.convert}
        >
          {ctrl.running
            ? ctrl.stopping
              ? t('autoCreate.stopping')
              : t('autoCreate.converting')
            : ctrl.checkpoint
              ? t('autoCreate.resume')
              : t('autoCreate.convert')}
        </button>
        <button type="button" className="primary-button subtle" disabled={!ctrl.running || ctrl.stopping} onClick={ctrl.stop}>
          {t('autoCreate.stop')}
        </button>
        <button type="button" className="primary-button" disabled={!ctrl.result || ctrl.inserted || ctrl.running} onClick={ctrl.insert}>
          {ctrl.inserted ? t('autoCreate.inserted') : t('autoCreate.insert')}
        </button>
        <button type="button" className="primary-button subtle" disabled={!ctrl.result} onClick={ctrl.downloadExportJson}>
          {t('autoCreate.downloadJson')}
        </button>
        <button type="button" className="primary-button subtle" disabled={!ctrl.result} onClick={ctrl.downloadTwrole}>
          {t('autoCreate.downloadTwrole')}
        </button>
      </div>

      <div className="extra-progress auto-create-progress">
        <div>
          <span>
            {ctrl.stageLabel}
            {(ctrl.result?.engine ?? ctrl.progress?.engine)
              ? ` [${(ctrl.result?.engine ?? ctrl.progress?.engine) === 'wasm' ? 'Wasm' : 'TS'}]`
              : ''}
          </span>
          <strong>{ctrl.progress ? `${formatNumber(ctrl.progress.step)} / ${formatNumber(ctrl.progress.total)}` : '0 / 0'}</strong>
        </div>
        <ProgressBar value={ctrl.progressPercent} label={ctrl.stageLabel} />
        {ctrl.progress ? (
          <div className="auto-create-progress-grid">
            <span>MSE {formatNumber(ctrl.progress.mse, 6)}</span>
            <span>{t('autoCreate.stat.layers')} {formatNumber(ctrl.progress.active)}</span>
            <span>{t('autoCreate.accepted')} {formatNumber(ctrl.progress.accepted)}</span>
            <span>{t('autoCreate.rejected')} {formatNumber(ctrl.progress.rejected)}</span>
            <span>{t('autoCreate.pruned')} {formatNumber(ctrl.progress.pruned)}</span>
            <span>{t('autoCreate.replaced')} {formatNumber(ctrl.progress.replaced)}</span>
          </div>
        ) : null}
        <AutoCreateMseChart points={ctrl.mseHistory} />
      </div>

      <div className="extra-stats auto-create-stats">
        <div>
          <span>{t('autoCreate.stat.layers')}</span>
          <strong>{formatNumber(ctrl.result?.decorations.length ?? ctrl.progress?.active ?? 0)}</strong>
        </div>
        <div>
          <span>{t('autoCreate.stat.mse')}</span>
          <strong>{ctrl.result ? formatNumber(ctrl.result.mse, 6) : ctrl.progress ? formatNumber(ctrl.progress.mse, 6) : '-'}</strong>
        </div>
        <div>
          <span>{t('autoCreate.stat.sources')}</span>
          <strong>{formatNumber(ctrl.result?.sourceCount ?? ctrl.filteredDecoOptions.length)}</strong>
        </div>
        <div>
          <span>{t('autoCreate.stat.size')}</span>
          <strong>{ctrl.result ? `${ctrl.result.targetWidth}×${ctrl.result.targetHeight}` : '-'}</strong>
        </div>
      </div>

      {ctrl.result ? (
        <div className="auto-create-preview">
          <div className="extra-section-title">{t('autoCreate.output')}</div>
          {ctrl.workspacePreviewWarning ? (
            <div className="extra-message warning">{ctrl.workspacePreviewWarning}</div>
          ) : (
            <img src={ctrl.workspacePreviewUrl ?? ctrl.result.previewDataUrl} alt="" />
          )}
        </div>
      ) : null}

      {ctrl.result?.warnings.length ? (
        <div className="extra-message warning">
          {ctrl.result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {ctrl.error ? <div className="extra-message error">{ctrl.error}</div> : null}
    </>
  );
}
