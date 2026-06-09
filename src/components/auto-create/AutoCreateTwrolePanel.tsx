import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
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

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

type GuiNumericSettingKey = 'tiles' | 'tileBudget' | 'logEvery';

const numberFormat = new Intl.NumberFormat();

function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '-';
  return numberFormat.format(Number(value.toFixed(fractionDigits)));
}

function isImageFile(file: File): boolean {
  if (file.type?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function toSafeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type TranslationValues = Record<string, string | number>;

function interpolateFallback(template: string, values?: TranslationValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

function tr(key: string, fallback: string, values?: TranslationValues): string {
  const translated = t(key, values);
  return translated === key ? interpolateFallback(fallback, values) : translated;
}

interface SourceTitleItem {
  title: string;
  count: number;
}

function optionTitle(option: PartOption): string {
  return option.label?.trim() || option.code || option.id;
}

function sortTitles(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function AutoCreateTwrolePanelContent({ decoOptions, role, insertDraftSettings, onInsert, onStatus }: AutoCreateTwrolePanelProps) {
  const [settings, setSettings] = useState<AutoCreateTwroleSettings>(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [targetPreviewUrl, setTargetPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutoCreateTwroleResult | null>(null);
  const [progress, setProgress] = useState<AutoCreateTwroleProgress | null>(null);
  const [checkpoint, setCheckpoint] = useState<AutoCreateTwroleCheckpoint | null>(null);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerAvailable = useMemo(() => canRunAutoCreateTwroleWorker(), []);
  const [sourceTitleSearch, setSourceTitleSearch] = useState('');
  const [excludedSourceTitles, setExcludedSourceTitles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    };
  }, [targetPreviewUrl]);

  const sourceTitleItems = useMemo<SourceTitleItem[]>(() => {
    const counts = new Map<string, number>();
    for (const option of decoOptions) {
      const title = optionTitle(option);
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((left, right) => sortTitles(left.title, right.title));
  }, [decoOptions]);

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
  };

  const handleInputFile = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    acceptFile(event.dataTransfer.files?.[0]);
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
      const message = tr(
        'autoCreate.error.workerUnavailable',
        '目前瀏覽器不支援 AutoCreate 背景運算。為了避免頁面無回應，已停用主執行緒 fallback；請使用桌面版 Chrome / Edge / Firefox。'
      );
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
        onProgress: setProgress,
        onCheckpoint: (nextCheckpoint) => {
          setCheckpoint(nextCheckpoint);
          setResult(nextCheckpoint.result);
          setProgress(nextCheckpoint.progress);
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
        setProgress(err.checkpoint.progress);
        setInserted(false);
        setError(null);
        onStatus(tr('status.autoCreateStopped', '自動生成已停止，可以下載目前結果或按「繼續生成」。'));
      } else if ((err as DOMException)?.name === 'AbortError') {
        setError(t('autoCreate.error.aborted'));
        onStatus(tr('status.autoCreateStopped', '自動生成已停止，可以下載目前結果或按「繼續生成」。'));
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
        <div
          className="extra-dropzone auto-create-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          {targetPreviewUrl ? (
            <img src={targetPreviewUrl} alt="" />
          ) : (
            <div className="extra-dropzone-empty">{t('autoCreate.drop')}</div>
          )}
          <button className="extra-upload-button" type="button">
            {file ? t('autoCreate.replace') : t('autoCreate.chooseImage')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleInputFile} />
        </div>

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
            {tr(
              'autoCreate.error.workerUnavailable',
              '目前瀏覽器不支援 AutoCreate 背景運算。為了避免頁面無回應，已停用主執行緒 fallback；請使用桌面版 Chrome / Edge / Firefox。'
            )}
          </div>
        ) : null}

        <div className="extra-section auto-create-source-filter">
          <div className="extra-section-title">{tr('autoCreate.section.sourceFilter', '素材 title 過濾')}</div>
          <div className="auto-create-filter-summary">
            <span>{tr('autoCreate.filter.sourceSummary', '使用素材：{enabled} / {total}', { enabled: filteredDecoOptions.length, total: decoOptions.length })}</span>
            <span>{tr('autoCreate.filter.titleSummary', '使用 title：{enabled} / {total}', { enabled: usedTitleCount, total: sourceTitleItems.length })}</span>
          </div>
          <input
            className="auto-create-filter-search"
            type="search"
            value={sourceTitleSearch}
            disabled={running}
            placeholder={tr('autoCreate.filter.searchPlaceholder', '搜尋 title / 裝飾名稱')}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSourceTitleSearch(event.currentTarget.value)}
          />
          <div className="auto-create-filter-actions">
            <button type="button" className="primary-button subtle" disabled={running || excludedSourceTitles.length === 0} onClick={useAllSourceTitles}>
              {tr('autoCreate.filter.useAll', '使用全部')}
            </button>
            <button type="button" className="primary-button subtle" disabled={running || visibleSourceTitleItems.length === 0} onClick={useVisibleSourceTitles}>
              {tr('autoCreate.filter.useVisible', '使用目前顯示')}
            </button>
            <button type="button" className="primary-button subtle" disabled={running || visibleSourceTitleItems.length === 0} onClick={excludeVisibleSourceTitles}>
              {tr('autoCreate.filter.excludeVisible', '排除目前顯示')}
            </button>
          </div>
          <div className="auto-create-title-list" role="list" aria-label={tr('autoCreate.filter.listLabel', 'AutoCreate 可使用的素材 title')}>
            {visibleSourceTitleItems.length ? (
              visibleSourceTitleItems.map((item) => {
                const checked = !excludedTitleSet.has(item.title);
                return (
                  <label key={item.title} className={checked ? 'auto-create-title-row' : 'auto-create-title-row excluded'} title={item.title}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={running}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => toggleSourceTitle(item.title, event.currentTarget.checked)}
                    />
                    <span className="auto-create-title-name">{item.title}</span>
                    <span className="auto-create-title-count">{formatNumber(item.count)}</span>
                  </label>
                );
              })
            ) : (
              <div className="auto-create-title-empty">{tr('autoCreate.filter.noMatch', '找不到符合的 title。')}</div>
            )}
          </div>
          {filteredDecoOptions.length === 0 ? (
            <div className="extra-message warning auto-create-filter-warning">{tr('autoCreate.filter.emptyWarning', '所有素材都被排除了，請至少保留一個 title。')}</div>
          ) : null}
        </div>

        <div className="extra-actions auto-create-actions">
          <button type="button" className="primary-button save" disabled={!file || running || filteredDecoOptions.length === 0 || !workerAvailable} onClick={convert}>
            {running
              ? stopping
                ? tr('autoCreate.stopping', '停止中...')
                : t('autoCreate.converting')
              : checkpoint
                ? tr('autoCreate.resume', '繼續生成')
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
            {tr('autoCreate.downloadTwrole', '下載 TWRole')}
          </button>
        </div>

        <div className="extra-progress auto-create-progress">
          <div>
            <span>{stageLabel}</span>
            <strong>{progress ? `${formatNumber(progress.step)} / ${formatNumber(progress.total)}` : '0 / 0'}</strong>
          </div>
          <i style={{ width: `${progressPercent}%` }} />
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

export function AutoCreateTwrolePanel(props: AutoCreateTwrolePanelProps) {
  return (
    <section className="choice-list extra-panel auto-create-panel" aria-label={t('autoCreate.title')}>
      <header className="choice-list-header extra-panel-header">
        <strong>{t('autoCreate.title')}</strong>
        <span>{t('autoCreate.sourceCount', { count: props.decoOptions.length })}</span>
      </header>

      <div className="extra-scroll">
        <AutoCreateTwrolePanelContent {...props} />
      </div>
    </section>
  );
}
