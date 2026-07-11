import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import {
  createAutoCreateTwroleExportBlob,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  isAutoCreateTwroleStoppedError,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../../lib/conversion/autoCreateTwrole';
import { canRunAutoCreateTwroleWorker, runAutoCreateTwroleInWorker } from '../../lib/conversion/autoCreateTwroleWorkerClient';
import { settingsForScope, type InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import { insertDecorationBatchIntoRole } from '../../lib/editor/editorImportMerge';
import { createTwroleBlobWithThumb } from '../../lib/serialization/legacyTwroleExport';
import { ImageDropzone } from '../ui/ImageDropzone';
import { ProgressBar } from '../ui/ProgressBar';
import {
  AutoCreateMseChart,
  MAX_MSE_HISTORY_POINTS,
  mseHistoryPoint,
  shouldRecordMseProgress,
  type MseHistoryPoint
} from './AutoCreateMseChart';
import { AutoCreateSourceFilter } from './AutoCreateSourceFilter';
import {
  buildSourceTitleItems,
  downloadBlob,
  formatNumber,
  isImageFile,
  optionTitle,
  sortTitles,
  toSafeInteger
} from './autoCreatePanelUtils';

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

type GuiNumericSettingKey = 'tiles' | 'tileBudget' | 'logEvery';

export function AutoCreateTwrolePanelContent({ decoOptions, role, insertDraftSettings, onInsert, onStatus }: AutoCreateTwrolePanelProps) {
  const [settings, setSettings] = useState<AutoCreateTwroleSettings>(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [targetPreviewUrl, setTargetPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutoCreateTwroleResult | null>(null);
  const [progress, setProgress] = useState<AutoCreateTwroleProgress | null>(null);
  const [mseHistory, setMseHistory] = useState<MseHistoryPoint[]>([]);
  const [checkpoint, setCheckpoint] = useState<AutoCreateTwroleCheckpoint | null>(null);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerAvailable = useMemo(() => canRunAutoCreateTwroleWorker(), []);
  const [sourceTitleSearch, setSourceTitleSearch] = useState('');
  const [excludedSourceTitles, setExcludedSourceTitles] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    };
  }, [targetPreviewUrl]);

  const sourceTitleItems = useMemo(() => buildSourceTitleItems(decoOptions), [decoOptions]);

  const availableTitleSet = useMemo(() => new Set(sourceTitleItems.map((item) => item.title)), [sourceTitleItems]);

  useEffect(() => {
    setExcludedSourceTitles((current) => {
      const next = current.filter((title) => availableTitleSet.has(title));
      return next.length === current.length ? current : next;
    });
  }, [availableTitleSet]);

  const excludedTitleSet = useMemo(() => new Set(excludedSourceTitles), [excludedSourceTitles]);

  const filteredDecoOptions = useMemo(() => {
    if (excludedTitleSet.size === 0) return decoOptions;
    return decoOptions.filter((option) => !excludedTitleSet.has(optionTitle(option)));
  }, [decoOptions, excludedTitleSet]);

  const visibleSourceTitleItems = useMemo(() => {
    const query = sourceTitleSearch.trim().toLocaleLowerCase();
    if (!query) return sourceTitleItems;
    return sourceTitleItems.filter((item) => item.title.toLocaleLowerCase().includes(query));
  }, [sourceTitleItems, sourceTitleSearch]);

  const usedTitleCount = Math.max(0, sourceTitleItems.length - excludedTitleSet.size);

  const progressPercent = useMemo(() => {
    if (!progress || progress.total <= 0) return 0;
    return Math.max(0, Math.min(100, (progress.step / progress.total) * 100));
  }, [progress]);

  const stageLabel = progress ? t(`autoCreate.progress.${progress.stage}`) : t('autoCreate.progressIdle');
  const savePreviewDuringProcess = settings.exportEvery > 0;

  const recordProgress = useCallback((nextProgress: AutoCreateTwroleProgress) => {
    setProgress(nextProgress);
    if (!shouldRecordMseProgress(nextProgress)) return;
    setMseHistory((current) => {
      const nextPoint = mseHistoryPoint(nextProgress);
      if (current.some((point) => point.key === nextPoint.key)) return current;
      const next = [...current, nextPoint];
      return next.length > MAX_MSE_HISTORY_POINTS ? next.slice(-MAX_MSE_HISTORY_POINTS) : next;
    });
  }, []);

  const acceptFile = (incoming: File | null | undefined) => {
    if (!incoming) return;
    if (!isImageFile(incoming)) {
      setError(t('autoCreate.error.fileType'));
      return;
    }

    if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    setTargetPreviewUrl(URL.createObjectURL(incoming));
    setFile(incoming);
    setResult(null);
    setCheckpoint(null);
    setStopping(false);
    setInserted(false);
    setError(null);
    setProgress(null);
    setMseHistory([]);
  };

  const patchNumber = (key: GuiNumericSettingKey, rawValue: string) => {
    setSettings((current) => {
      const nextValue = toSafeInteger(rawValue, current[key]);
      if (key === 'tiles') {
        return { ...current, tiles: Math.max(1, nextValue) };
      }
      if (key === 'tileBudget') {
        return { ...current, tileBudget: Math.max(0, nextValue) };
      }
      const nextLogEvery = Math.max(1, nextValue);
      return {
        ...current,
        logEvery: nextLogEvery,
        exportEvery: current.exportEvery > 0 ? nextLogEvery : 0
      };
    });
    setResult(null);
    setCheckpoint(null);
    setInserted(false);
    setProgress(null);
    setMseHistory([]);
  };

  const patchSavePreview = (checked: boolean) => {
    setSettings((current) => ({ ...current, exportEvery: checked ? Math.max(1, current.logEvery) : 0 }));
  };

  const resetGeneratedOutput = () => {
    setResult(null);
    setCheckpoint(null);
    setStopping(false);
    setInserted(false);
    setProgress(null);
    setMseHistory([]);
  };

  const toggleSourceTitle = (title: string, useTitle: boolean) => {
    setExcludedSourceTitles((current) => {
      const next = new Set(current);
      if (useTitle) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const useAllSourceTitles = () => {
    setExcludedSourceTitles([]);
    resetGeneratedOutput();
  };

  const useVisibleSourceTitles = () => {
    const visible = new Set(visibleSourceTitleItems.map((item) => item.title));
    setExcludedSourceTitles((current) => current.filter((title) => !visible.has(title)));
    resetGeneratedOutput();
  };

  const excludeVisibleSourceTitles = () => {
    if (visibleSourceTitleItems.length === 0) return;
    setExcludedSourceTitles((current) => {
      const next = new Set(current);
      for (const item of visibleSourceTitleItems) next.add(item.title);
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const convert = async () => {
    if (!file || running || filteredDecoOptions.length === 0) return;
    if (!workerAvailable) {
      const message = t('autoCreate.error.workerUnavailable');
      setError(message);
      onStatus(t('status.autoCreateFailed', { message }));
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const resumeSnapshot = checkpoint?.snapshot ?? null;

    setRunning(true);
    setStopping(false);
    setError(null);
    if (!resumeSnapshot) setResult(null);
    if (!resumeSnapshot) setMseHistory([]);
    setInserted(false);
    setProgress(
      resumeSnapshot && checkpoint
        ? checkpoint.progress
        : {
            stage: 'sources',
            step: 0,
            total: Math.max(1, filteredDecoOptions.length),
            mse: 0,
            active: 0,
            accepted: 0,
            rejected: 0,
            pruned: 0,
            replaced: 0
          }
    );

    try {
      const next = await runAutoCreateTwroleInWorker({
        targetFile: file,
        decoOptions: filteredDecoOptions,
        settings,
        resumeSnapshot,
        signal: controller.signal,
        onProgress: recordProgress,
        onCheckpoint: (nextCheckpoint) => {
          setCheckpoint(nextCheckpoint);
          setResult(nextCheckpoint.result);
          recordProgress(nextCheckpoint.progress);
          setInserted(false);
        }
      });
      setResult(next);
      setCheckpoint(null);
      onStatus(t('status.autoCreateConverted', { count: next.decorations.length }));
    } catch (err) {
      if (isAutoCreateTwroleStoppedError(err)) {
        setResult(err.result);
        setCheckpoint(err.checkpoint);
        recordProgress(err.checkpoint.progress);
        setInserted(false);
        setError(null);
        onStatus(t('status.autoCreateStopped'));
      } else if ((err as DOMException)?.name === 'AbortError') {
        setError(t('autoCreate.error.aborted'));
        onStatus(t('status.autoCreateStopped'));
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        onStatus(t('status.autoCreateFailed', { message }));
      }
    } finally {
      setRunning(false);
      setStopping(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    if (!abortRef.current || stopping) return;
    setStopping(true);
    abortRef.current.abort();
  };

  const insert = () => {
    if (!result || inserted) return;
    const count = onInsert(result.decorations, t('autoCreate.groupName.default'));
    if (count <= 0) return;
    setInserted(true);
    onStatus(t('status.autoCreateInserted', { count }));
  };

  const downloadExportJson = () => {
    if (!result) return;
    downloadBlob(createAutoCreateTwroleExportBlob(result), 'export2.json');
  };

  const downloadTwrole = async () => {
    if (!result) return;
    const scopedSettings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
    const merged = insertDecorationBatchIntoRole(role, result.decorations, t('autoCreate.groupName.default'), scopedSettings);
    if (!merged) return;
    const baseName = file?.name.replace(/\.[^.]+$/, '') || 'auto-create';
    try {
      downloadBlob(await createTwroleBlobWithThumb(merged.role), baseName + '.twrole');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onStatus(t('status.autoCreateFailed', { message }));
    }
  };

  const numberInput = (labelKey: string, key: GuiNumericSettingKey, min: number) => (
    <label className="auto-create-field">
      <span>{t(labelKey)}</span>
      <input
        type="number"
        min={min}
        step={1}
        value={settings[key]}
        disabled={running}
        onChange={(event: ChangeEvent<HTMLInputElement>) => patchNumber(key, event.currentTarget.value)}
      />
    </label>
  );

  return (
    <>
        <ImageDropzone
          className="auto-create-dropzone"
          previewUrl={targetPreviewUrl}
          emptyLabel={t('autoCreate.drop')}
          actionLabel={file ? t('autoCreate.replace') : t('autoCreate.chooseImage')}
          disabled={running}
          onSelect={acceptFile}
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
              checked={savePreviewDuringProcess}
              disabled={running}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patchSavePreview(event.currentTarget.checked)}
            />
            <span>{t('autoCreate.savePreview')}</span>
          </label>
        </div>

        {!workerAvailable ? (
          <div className="extra-message warning auto-create-browser-note">
            {t('autoCreate.error.workerUnavailable')}
          </div>
        ) : null}

        <AutoCreateSourceFilter
          sourceTitleItems={sourceTitleItems}
          visibleSourceTitleItems={visibleSourceTitleItems}
          excludedTitleSet={excludedTitleSet}
          filteredOptionCount={filteredDecoOptions.length}
          totalOptionCount={decoOptions.length}
          usedTitleCount={usedTitleCount}
          search={sourceTitleSearch}
          running={running}
          onSearchChange={setSourceTitleSearch}
          onUseAll={useAllSourceTitles}
          onUseVisible={useVisibleSourceTitles}
          onExcludeVisible={excludeVisibleSourceTitles}
          onToggleTitle={toggleSourceTitle}
        />

        <div className="extra-actions auto-create-actions">
          <button type="button" className="primary-button save" disabled={!file || running || filteredDecoOptions.length === 0 || !workerAvailable} onClick={convert}>
            {running
              ? stopping
                ? t('autoCreate.stopping')
                : t('autoCreate.converting')
              : checkpoint
                ? t('autoCreate.resume')
                : t('autoCreate.convert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!running || stopping} onClick={stop}>
            {t('autoCreate.stop')}
          </button>
          <button type="button" className="primary-button" disabled={!result || inserted || running} onClick={insert}>
            {inserted ? t('autoCreate.inserted') : t('autoCreate.insert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!result} onClick={downloadExportJson}>
            {t('autoCreate.downloadJson')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!result} onClick={downloadTwrole}>
            {t('autoCreate.downloadTwrole')}
          </button>
        </div>

        <div className="extra-progress auto-create-progress">
          <div>
            <span>{stageLabel}</span>
            <strong>{progress ? `${formatNumber(progress.step)} / ${formatNumber(progress.total)}` : '0 / 0'}</strong>
          </div>
          <ProgressBar value={progressPercent} label={stageLabel} />
          {progress ? (
            <div className="auto-create-progress-grid">
              <span>MSE {formatNumber(progress.mse, 6)}</span>
              <span>{t('autoCreate.stat.layers')} {formatNumber(progress.active)}</span>
              <span>{t('autoCreate.accepted')} {formatNumber(progress.accepted)}</span>
              <span>{t('autoCreate.rejected')} {formatNumber(progress.rejected)}</span>
              <span>{t('autoCreate.pruned')} {formatNumber(progress.pruned)}</span>
              <span>{t('autoCreate.replaced')} {formatNumber(progress.replaced)}</span>
            </div>
          ) : null}
          <AutoCreateMseChart points={mseHistory} />
        </div>

        <div className="extra-stats auto-create-stats">
          <div>
            <span>{t('autoCreate.stat.layers')}</span>
            <strong>{formatNumber(result?.decorations.length ?? progress?.active ?? 0)}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.mse')}</span>
            <strong>{result ? formatNumber(result.mse, 6) : progress ? formatNumber(progress.mse, 6) : '-'}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.sources')}</span>
            <strong>{formatNumber(result?.sourceCount ?? filteredDecoOptions.length)}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.size')}</span>
            <strong>{result ? `${result.targetWidth}×${result.targetHeight}` : '-'}</strong>
          </div>
        </div>

        {result ? (
          <div className="auto-create-preview">
            <div className="extra-section-title">{t('autoCreate.output')}</div>
            <img src={result.previewDataUrl} alt="" />
          </div>
        ) : null}

        {result?.warnings.length ? (
          <div className="extra-message warning">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {error ? <div className="extra-message error">{error}</div> : null}
    </>
  );
}
