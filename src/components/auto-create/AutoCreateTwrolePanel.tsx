import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { t } from '../../i18n';
import type { ColorBlockPreset } from '../../mock/colorBlocks';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import {
  createAutoCreateTwroleExportBlob,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  isAutoCreateTwroleStoppedError,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSourceMode,
  type AutoCreateTwroleSettings
} from '../../lib/conversion/autoCreateTwrole';
import { canRunAutoCreateTwroleWorker, runAutoCreateTwroleInWorker } from '../../lib/conversion/autoCreateTwroleWorkerClient';
import { settingsForScope, type InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import { insertDecorationBatchIntoRole, insertGroupedDecorationBatchIntoRole, type DecorationBatchGroupDraft } from '../../lib/editor/editorImportMerge';
import { createTwroleBlobWithThumb } from '../../lib/serialization/legacyTwroleExport';
import { AssetPreview } from '../AssetPreview';
import { colorBlockPresetItems } from './autoCreateColorBlockSources';

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
  colorBlockPresets?: AutoCreateColorBlockPresetState;
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onInsertGrouped?(decorations: DecorationLayer[], groups: DecorationBatchGroupDraft[], groupName: string): number;
  onStatus(message: string): void;
}

export interface AutoCreateColorBlockPresetState {
  presets: ColorBlockPreset[];
  loading: boolean;
  error: string | null;
}

type GuiNumericSettingKey = 'tiles' | 'tileBudget' | 'logEvery';

const numberFormat = new Intl.NumberFormat();
const MAX_MSE_HISTORY_POINTS = 240;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface MseHistoryPoint {
  key: string;
  label: string;
  stage: AutoCreateTwroleProgress['stage'];
  step: number;
  mse: number;
}

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

function shouldRecordMseProgress(progress: AutoCreateTwroleProgress): boolean {
  return (progress.stage === 'run' || progress.stage === 'final') && Number.isFinite(progress.mse);
}

function mseHistoryKey(progress: AutoCreateTwroleProgress): string {
  return `${progress.stage}:${progress.step}:${progress.mse.toPrecision(12)}`;
}

function mseHistoryPoint(progress: AutoCreateTwroleProgress): MseHistoryPoint {
  return {
    key: mseHistoryKey(progress),
    label: `${progress.stage} ${progress.step}`,
    stage: progress.stage,
    step: progress.step,
    mse: progress.mse
  };
}

interface AutoCreateMseChartProps {
  points: MseHistoryPoint[];
}

function AutoCreateMseChart({ points }: AutoCreateMseChartProps) {
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let min = points[0].mse;
    let max = points[0].mse;
    for (const point of points) {
      min = Math.min(min, point.mse);
      max = Math.max(max, point.mse);
    }
    return {
      latest: points[points.length - 1].mse,
      min,
      max
    };
  }, [points]);

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: t('autoCreate.stat.mse'),
          data: points.map((point) => point.mse),
          borderColor: '#35d0ff',
          backgroundColor: 'rgba(53, 208, 255, 0.18)',
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: '#9cffb2',
          pointBorderColor: '#061622',
          pointBorderWidth: 1,
          pointHoverRadius: 4,
          pointRadius: points.length === 1 ? 3 : 0,
          tension: 0.25
        }
      ]
    }),
    [points]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      animation: false,
      maintainAspectRatio: false,
      normalized: true,
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `MSE ${formatNumber(Number(context.parsed.y), 6)}`
          },
          displayColors: false
        }
      },
      scales: {
        x: {
          display: false,
          grid: {
            display: false
          }
        },
        y: {
          border: {
            display: false
          },
          grid: {
            color: 'rgba(188, 239, 255, 0.12)'
          },
          ticks: {
            color: 'rgba(216, 248, 255, 0.72)',
            maxTicksLimit: 4,
            callback: (value) => formatNumber(Number(value), 5)
          }
        }
      }
    }),
    []
  );

  return (
    <div className="auto-create-mse-chart" aria-label={t('autoCreate.mseChart.title')}>
      <div className="auto-create-mse-chart-header">
        <strong>{t('autoCreate.mseChart.title')}</strong>
        {stats ? (
          <span>
            {t('autoCreate.mseChart.latest')} {formatNumber(stats.latest, 6)}
          </span>
        ) : null}
      </div>
      {stats ? (
        <>
          <div className="auto-create-mse-chart-canvas">
            <Line data={data} options={options} />
          </div>
          <div className="auto-create-mse-chart-stats">
            <span>
              {t('autoCreate.mseChart.min')} {formatNumber(stats.min, 6)}
            </span>
            <span>
              {t('autoCreate.mseChart.max')} {formatNumber(stats.max, 6)}
            </span>
          </div>
        </>
      ) : (
        <div className="auto-create-mse-chart-empty">{t('autoCreate.mseChart.empty')}</div>
      )}
    </div>
  );
}

export function AutoCreateTwrolePanelContent({ decoOptions, colorBlockPresets, role, insertDraftSettings, onInsert, onInsertGrouped, onStatus }: AutoCreateTwrolePanelProps) {
  const [settings, setSettings] = useState<AutoCreateTwroleSettings>(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  const [sourceMode, setSourceMode] = useState<AutoCreateTwroleSourceMode>('deco');
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
  const [colorBlockPresetSearch, setColorBlockPresetSearch] = useState('');
  const [excludedColorBlockPresetIds, setExcludedColorBlockPresetIds] = useState<string[]>([]);
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
  const colorBlockSourcePresets = colorBlockPresets?.presets ?? [];
  const colorBlockLoading = colorBlockPresets?.loading ?? false;
  const colorBlockError = colorBlockPresets?.error ?? null;
  const availableColorBlockPresetIdSet = useMemo(() => new Set(colorBlockSourcePresets.map((preset) => preset.id)), [colorBlockSourcePresets]);

  useEffect(() => {
    setExcludedColorBlockPresetIds((current) => {
      const next = current.filter((id) => availableColorBlockPresetIdSet.has(id));
      return next.length === current.length ? current : next;
    });
  }, [availableColorBlockPresetIdSet]);

  const excludedColorBlockPresetIdSet = useMemo(() => new Set(excludedColorBlockPresetIds), [excludedColorBlockPresetIds]);
  const filteredColorBlockPresets = useMemo(
    () => colorBlockSourcePresets.filter((preset) => !excludedColorBlockPresetIdSet.has(preset.id)),
    [colorBlockSourcePresets, excludedColorBlockPresetIdSet]
  );
  const visibleColorBlockPresetItems = useMemo(
    () => colorBlockPresetItems(colorBlockSourcePresets, colorBlockPresetSearch, excludedColorBlockPresetIdSet),
    [colorBlockPresetSearch, colorBlockSourcePresets, excludedColorBlockPresetIdSet]
  );
  const activeSourceCount = sourceMode === 'colorBlock' ? filteredColorBlockPresets.length : filteredDecoOptions.length;
  const sourceUnavailable = sourceMode === 'colorBlock'
    ? colorBlockLoading || filteredColorBlockPresets.length === 0
    : filteredDecoOptions.length === 0;

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

  const changeSourceMode = (nextMode: AutoCreateTwroleSourceMode) => {
    if (running || nextMode === sourceMode) return;
    setSourceMode(nextMode);
    resetGeneratedOutput();
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

  const toggleColorBlockPreset = (presetId: string, usePreset: boolean) => {
    setExcludedColorBlockPresetIds((current) => {
      const next = new Set(current);
      if (usePreset) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const useAllColorBlockPresets = () => {
    setExcludedColorBlockPresetIds([]);
    resetGeneratedOutput();
  };

  const useVisibleColorBlockPresets = () => {
    const visible = new Set(visibleColorBlockPresetItems.map((item) => item.preset.id));
    setExcludedColorBlockPresetIds((current) => current.filter((id) => !visible.has(id)));
    resetGeneratedOutput();
  };

  const excludeVisibleColorBlockPresets = () => {
    if (visibleColorBlockPresetItems.length === 0) return;
    setExcludedColorBlockPresetIds((current) => {
      const next = new Set(current);
      for (const item of visibleColorBlockPresetItems) next.add(item.preset.id);
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const convert = async () => {
    if (!file || running || sourceUnavailable) return;
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
    if (!resumeSnapshot) setMseHistory([]);
    setInserted(false);
    setProgress(
      resumeSnapshot && checkpoint
        ? checkpoint.progress
        : {
            stage: 'sources',
            step: 0,
            total: Math.max(1, activeSourceCount),
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
        sourceMode,
        colorBlockPresets: sourceMode === 'colorBlock' ? filteredColorBlockPresets : [],
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
    const groupName = t('autoCreate.groupName.default');
    const count = sourceMode === 'colorBlock' && result.groups.length > 0 && onInsertGrouped
      ? onInsertGrouped(result.decorations, result.groups, groupName)
      : onInsert(result.decorations, groupName);
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
    const groupName = t('autoCreate.groupName.default');
    const merged = sourceMode === 'colorBlock' && result.groups.length > 0
      ? insertGroupedDecorationBatchIntoRole(role, result.decorations, result.groups, groupName, scopedSettings)
      : insertDecorationBatchIntoRole(role, result.decorations, groupName, scopedSettings);
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

        <div className="extra-section auto-create-source-mode">
          <div className="extra-section-title">{tr('autoCreate.section.sourceMode', '素材模式')}</div>
          <div className="extra-segmented auto-create-source-mode-list" role="tablist" aria-label={tr('autoCreate.sourceMode.label', 'AutoCreate 素材模式')}>
            <button
              type="button"
              role="tab"
              className={sourceMode === 'deco' ? 'selected' : ''}
              aria-selected={sourceMode === 'deco'}
              disabled={running}
              onClick={() => changeSourceMode('deco')}
            >
              {tr('autoCreate.sourceMode.deco', 'Deco assets')}
            </button>
            <button
              type="button"
              role="tab"
              className={sourceMode === 'colorBlock' ? 'selected' : ''}
              aria-selected={sourceMode === 'colorBlock'}
              disabled={running}
              onClick={() => changeSourceMode('colorBlock')}
            >
              {tr('autoCreate.sourceMode.colorBlock', '只使用色塊')}
            </button>
          </div>
          <div className="auto-create-filter-summary">
            <span>
              {sourceMode === 'colorBlock'
                ? tr('autoCreate.sourceMode.colorBlockSummary', '使用目前陣營色塊：{count}', { count: filteredColorBlockPresets.length })
                : tr('autoCreate.sourceMode.decoSummary', '使用 deco 素材：{count}', { count: filteredDecoOptions.length })}
            </span>
          </div>
          {sourceMode === 'colorBlock' && colorBlockLoading ? (
            <div className="extra-message warning auto-create-filter-warning">{tr('autoCreate.colorBlock.loading', '正在載入目前陣營色塊...')}</div>
          ) : null}
          {sourceMode === 'colorBlock' && colorBlockError ? (
            <div className="extra-message error auto-create-filter-warning">{colorBlockError}</div>
          ) : null}
          {sourceMode === 'colorBlock' && !colorBlockLoading && colorBlockSourcePresets.length === 0 ? (
            <div className="extra-message warning auto-create-filter-warning">{tr('autoCreate.colorBlock.empty', '目前陣營沒有可用色塊。')}</div>
          ) : null}
        </div>

        {!workerAvailable ? (
          <div className="extra-message warning auto-create-browser-note">
            {tr(
              'autoCreate.error.workerUnavailable',
              '目前瀏覽器不支援 AutoCreate 背景運算。為了避免頁面無回應，已停用主執行緒 fallback；請使用桌面版 Chrome / Edge / Firefox。'
            )}
          </div>
        ) : null}

        {sourceMode === 'deco' ? (
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
        ) : null}

        {sourceMode === 'colorBlock' ? (
        <div className="extra-section auto-create-color-block-filter">
          <div className="extra-section-title">{tr('autoCreate.section.colorBlockFilter', '色塊過濾')}</div>
          <div className="auto-create-filter-summary">
            <span>{tr('autoCreate.colorBlockFilter.sourceSummary', '使用色塊：{enabled} / {total}', { enabled: filteredColorBlockPresets.length, total: colorBlockSourcePresets.length })}</span>
            <span>{tr('autoCreate.colorBlockFilter.visibleSummary', '目前顯示：{count}', { count: visibleColorBlockPresetItems.length })}</span>
          </div>
          <input
            className="auto-create-filter-search"
            type="search"
            value={colorBlockPresetSearch}
            disabled={running}
            placeholder={tr('autoCreate.colorBlockFilter.searchPlaceholder', '搜尋色塊名稱 / id / deco code')}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setColorBlockPresetSearch(event.currentTarget.value)}
          />
          <div className="auto-create-filter-actions">
            <button type="button" className="primary-button subtle" disabled={running || excludedColorBlockPresetIds.length === 0} onClick={useAllColorBlockPresets}>
              {tr('autoCreate.filter.useAll', '使用全部')}
            </button>
            <button type="button" className="primary-button subtle" disabled={running || visibleColorBlockPresetItems.length === 0} onClick={useVisibleColorBlockPresets}>
              {tr('autoCreate.filter.useVisible', '使用目前顯示')}
            </button>
            <button type="button" className="primary-button subtle" disabled={running || visibleColorBlockPresetItems.length === 0} onClick={excludeVisibleColorBlockPresets}>
              {tr('autoCreate.filter.excludeVisible', '排除目前顯示')}
            </button>
          </div>
          <div className="auto-create-color-block-list" role="list" aria-label={tr('autoCreate.colorBlockFilter.listLabel', 'AutoCreate 可使用的色塊')}>
            {visibleColorBlockPresetItems.length ? (
              visibleColorBlockPresetItems.map((item) => {
                const { preset } = item;
                return (
                  <label
                    key={preset.id}
                    className={item.enabled ? 'auto-create-color-block-row' : 'auto-create-color-block-row excluded'}
                    title={`${preset.label} (${t('colorBlock.decoCount', { count: preset.deco.length })})`}
                  >
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      disabled={running}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => toggleColorBlockPreset(preset.id, event.currentTarget.checked)}
                    />
                    <span
                      className="auto-create-color-block-swatch"
                      style={{ background: preset.color }}
                      aria-hidden
                    />
                    <span className="auto-create-color-block-body">
                      <span className="auto-create-color-block-name">{preset.label}</span>
                      <span className="auto-create-color-block-preview-row">
                        {item.previewOptions.map((option) => (
                          <AssetPreview key={option.id} option={option} size={18} />
                        ))}
                      </span>
                    </span>
                    <span className="auto-create-title-count">{preset.deco.length}</span>
                  </label>
                );
              })
            ) : (
              <div className="auto-create-title-empty">{tr('autoCreate.colorBlockFilter.noMatch', '找不到符合的色塊。')}</div>
            )}
          </div>
          {colorBlockSourcePresets.length > 0 && filteredColorBlockPresets.length === 0 ? (
            <div className="extra-message warning auto-create-filter-warning">{tr('autoCreate.colorBlockFilter.emptyWarning', '所有色塊都被排除了，請至少保留一個色塊。')}</div>
          ) : null}
        </div>
        ) : null}

        <div className="extra-actions auto-create-actions">
          <button type="button" className="primary-button save" disabled={!file || running || sourceUnavailable || !workerAvailable} onClick={convert}>
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
            <strong>{formatNumber(result?.sourceCount ?? activeSourceCount)}</strong>
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
  const sourceCount = props.colorBlockPresets?.presets.length ?? props.decoOptions.length;
  return (
    <section className="choice-list extra-panel auto-create-panel" aria-label={t('autoCreate.title')}>
      <header className="choice-list-header extra-panel-header">
        <strong>{t('autoCreate.title')}</strong>
        <span>{t('autoCreate.sourceCount', { count: sourceCount })}</span>
      </header>

      <div className="extra-scroll">
        <AutoCreateTwrolePanelContent {...props} />
      </div>
    </section>
  );
}
