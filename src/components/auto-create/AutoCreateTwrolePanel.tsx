import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption } from '../../types/role';
import {
  createAutoCreateTwroleExportBlob,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../../lib/conversion/autoCreateTwrole';
import { runAutoCreateTwroleInWorker } from '../../lib/conversion/autoCreateTwroleWorkerClient';

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
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

export function AutoCreateTwrolePanelContent({ decoOptions, onInsert, onStatus }: AutoCreateTwrolePanelProps) {
  const [settings, setSettings] = useState<AutoCreateTwroleSettings>(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [targetPreviewUrl, setTargetPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutoCreateTwroleResult | null>(null);
  const [progress, setProgress] = useState<AutoCreateTwroleProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    };
  }, [targetPreviewUrl]);

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
    setInserted(false);
  };

  const patchSavePreview = (checked: boolean) => {
    setSettings((current) => ({ ...current, exportEvery: checked ? Math.max(1, current.logEvery) : 0 }));
  };

  const convert = async () => {
    if (!file || running) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setError(null);
    setResult(null);
    setInserted(false);
    setProgress({
      stage: 'sources',
      step: 0,
      total: Math.max(1, decoOptions.length),
      mse: 0,
      active: 0,
      accepted: 0,
      rejected: 0,
      pruned: 0,
      replaced: 0
    });

    try {
      const next = await runAutoCreateTwroleInWorker({
        targetFile: file,
        decoOptions,
        settings,
        signal: controller.signal,
        onProgress: setProgress
      });
      setResult(next);
      onStatus(t('status.autoCreateConverted', { count: next.decorations.length }));
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        setError(t('autoCreate.error.aborted'));
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        onStatus(t('status.autoCreateFailed', { message }));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
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

        <div className="extra-actions auto-create-actions">
          <button type="button" className="primary-button save" disabled={!file || running || decoOptions.length === 0} onClick={convert}>
            {running ? t('autoCreate.converting') : t('autoCreate.convert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!running} onClick={stop}>
            {t('autoCreate.stop')}
          </button>
          <button type="button" className="primary-button" disabled={!result || inserted || running} onClick={insert}>
            {inserted ? t('autoCreate.inserted') : t('autoCreate.insert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!result || running} onClick={downloadExportJson}>
            {t('autoCreate.downloadJson')}
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
            <strong>{formatNumber(result?.sourceCount ?? decoOptions.length)}</strong>
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
