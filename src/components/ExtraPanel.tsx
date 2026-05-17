import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import type { DecorationLayer, PartOption } from '../types/role';
import {
  convertImageFileToDecos,
  IMAGE_TO_DECO_PRESETS,
  type ColorMatchAlgorithm,
  type ImageToDecoConversionOptions,
  type ImageToDecoConversionResult,
  type ImageToDecoProgress,
  type ImageToDecoQuality
} from '../lib/imageToDeco';
import {
  convertBrushFillToDecos,
  type BrushFillConversionResult,
  type BrushFillMask,
  type BrushFillSource
} from '../lib/brushFillToDeco';

interface ExtraPanelProps {
  decoOptions: PartOption[];
  brushFillActive: boolean;
  brushFillBrushSize: number;
  brushFillMask: BrushFillMask;
  onBrushFillActiveChange(active: boolean): void;
  onBrushFillBrushSizeChange(size: number): void;
  onBrushFillClear(): void;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

type ExtraToolMode = 'image' | 'brush';
type BrushFillSourceMode = BrushFillSource['type'];

const qualityModes: ImageToDecoQuality[] = ['performance', 'balanced', 'detail', 'custom'];
const colorAlgorithms: ColorMatchAlgorithm[] = [
  'cielab',
  'weighted-rgb',
  'rgb',
  'luminance',
  'hsv',
  'hsl',
  'brightness-color'
];

function fileBaseName(file: File | null): string {
  return file?.name.replace(/\.[^.]+$/, '') || 'Image Build';
}

function progressPercent(progress: ImageToDecoProgress | null): number {
  if (!progress || progress.total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress.done / progress.total) * 100)));
}

function progressLabel(progress: ImageToDecoProgress | null): string {
  if (!progress) return t('extra.progressIdle');
  return t(`extra.progress.${progress.stage}`);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function ExtraPanel({
  decoOptions,
  brushFillActive,
  brushFillBrushSize,
  brushFillMask,
  onBrushFillActiveChange,
  onBrushFillBrushSizeChange,
  onBrushFillClear,
  onInsert,
  onStatus
}: ExtraPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [toolMode, setToolMode] = useState<ExtraToolMode>('image');
  const [quality, setQuality] = useState<ImageToDecoQuality>('balanced');
  const [options, setOptions] = useState<ImageToDecoConversionOptions>(IMAGE_TO_DECO_PRESETS.balanced);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('Image Build');
  const [result, setResult] = useState<ImageToDecoConversionResult | null>(null);
  const [brushResult, setBrushResult] = useState<BrushFillConversionResult | null>(null);
  const [brushSourceMode, setBrushSourceMode] = useState<BrushFillSourceMode>('color');
  const [brushColor, setBrushColor] = useState('#35d0ff');
  const [brushDecoId, setBrushDecoId] = useState('');
  const [progress, setProgress] = useState<ImageToDecoProgress | null>(null);
  const [converting, setConverting] = useState(false);
  const [brushFilling, setBrushFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setGroupName(`Image: ${fileBaseName(file)}`);
    setResult(null);
    setError(null);
    setInserted(false);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (toolMode !== 'brush' && brushFillActive) {
      onBrushFillActiveChange(false);
    }
    if (toolMode === 'brush' && groupName === 'Image Build') {
      setGroupName(t('extra.brush.groupName'));
    }
  }, [brushFillActive, groupName, onBrushFillActiveChange, toolMode]);

  useEffect(() => () => onBrushFillActiveChange(false), [onBrushFillActiveChange]);

  useEffect(() => {
    if (brushDecoId && decoOptions.some((option) => option.id === brushDecoId)) return;
    setBrushDecoId(decoOptions[0]?.id ?? '');
  }, [brushDecoId, decoOptions]);

  const visiblePreview = result?.previewDataUrl ?? previewUrl;
  const progressValue = progressPercent(progress);
  const canConvert = Boolean(file && !converting && decoOptions.length);
  const canInsert = Boolean(result?.decorations.length && !inserted);
  const hasBrushRange = brushFillMask.points.length > 0;
  const canBrushFill = Boolean(hasBrushRange && !brushFilling && decoOptions.length && (brushSourceMode === 'color' || brushDecoId));

  const summary = useMemo(() => {
    if (!result) return null;
    return [
      { label: t('extra.stat.layers'), value: formatNumber(result.generatedPixels) },
      { label: t('extra.stat.size'), value: `${result.outputWidth}x${result.outputHeight}` },
      { label: t('extra.stat.palette'), value: formatNumber(result.paletteSize) },
      { label: t('extra.stat.visible'), value: formatNumber(result.opaquePixels) }
    ];
  }, [result]);

  const brushSummary = useMemo(() => {
    if (!brushResult) return null;
    return [
      { label: t('extra.stat.layers'), value: formatNumber(brushResult.generatedPixels) },
      { label: t('extra.brush.samples'), value: formatNumber(brushResult.sampledPixels) },
      { label: t('extra.stat.palette'), value: formatNumber(brushResult.paletteSize) },
      { label: t('extra.brush.points'), value: formatNumber(brushFillMask.points.length) }
    ];
  }, [brushFillMask.points.length, brushResult]);

  const setPreset = (mode: ImageToDecoQuality) => {
    setQuality(mode);
    if (mode !== 'custom') setOptions(IMAGE_TO_DECO_PRESETS[mode]);
  };

  const patchOptions = (patch: Partial<ImageToDecoConversionOptions>) => {
    setOptions((current) => ({ ...current, ...patch }));
    setQuality('custom');
    setResult(null);
    setBrushResult(null);
    setInserted(false);
  };

  const acceptFile = (nextFile: File | undefined | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      setError(t('extra.error.fileType'));
      return;
    }
    setFile(nextFile);
  };

  const convert = async () => {
    if (!file) return;
    setConverting(true);
    setError(null);
    setResult(null);
    setInserted(false);
    setProgress({ stage: 'palette', done: 0, total: decoOptions.length });

    try {
      const converted = await convertImageFileToDecos(file, decoOptions, options, setProgress);
      setResult(converted);
      setProgress(null);
      onStatus(t('status.extraConverted', { count: converted.generatedPixels }));
    } catch (conversionError) {
      const message = conversionError instanceof Error ? conversionError.message : String(conversionError);
      setError(message);
      setProgress(null);
      onStatus(t('status.extraFailed', { message }));
    } finally {
      setConverting(false);
    }
  };

  const insert = () => {
    if (!result?.decorations.length) return;
    const insertedCount = onInsert(result.decorations, groupName.trim() || `Image: ${fileBaseName(file)}`);
    setInserted(true);
    onStatus(t('status.extraInserted', { count: insertedCount }));
  };

  const fillBrushRange = async () => {
    setBrushFilling(true);
    setError(null);
    setBrushResult(null);

    try {
      const source: BrushFillSource = brushSourceMode === 'color'
        ? { type: 'color', color: brushColor }
        : { type: 'deco', assetId: brushDecoId };
      const converted = await convertBrushFillToDecos(brushFillMask, source, decoOptions, options);
      setBrushResult(converted);
      if (!converted.decorations.length) {
        onStatus(t('status.brushFillEmpty'));
        return;
      }
      const insertedCount = onInsert(converted.decorations, groupName.trim() || t('extra.brush.groupName'));
      onStatus(t('status.brushFillInserted', { count: insertedCount }));
    } catch (brushError) {
      const message = brushError instanceof Error ? brushError.message : String(brushError);
      setError(message);
      onStatus(t('status.brushFillFailed', { message }));
    } finally {
      setBrushFilling(false);
    }
  };

  return (
    <section className="choice-list extra-panel" aria-label={t('extra.title')}>
      <header className="choice-list-header extra-panel-header">
        <strong>{t('extra.title')}</strong>
        <span>{formatNumber(decoOptions.length)} deco</span>
      </header>

      <div className="extra-scroll">
        <div className="extra-section extra-section-first">
          <div className="extra-segmented extra-mode-switch" role="group" aria-label={t('extra.mode')}>
            {(['image', 'brush'] as ExtraToolMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={toolMode === mode ? 'selected' : ''}
                onClick={() => setToolMode(mode)}
              >
                {t(`extra.mode.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        {toolMode === 'image' ? (
          <div
          className={`extra-dropzone ${file ? 'has-file' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            acceptFile(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          {visiblePreview ? (
            <img src={visiblePreview} alt="" />
          ) : (
            <span className="extra-dropzone-empty">{t('extra.upload')}</span>
          )}
          <button type="button" className="extra-upload-button" onClick={() => inputRef.current?.click()}>
            {file ? t('extra.replace') : t('extra.chooseImage')}
          </button>
          </div>
        ) : (
          <div className="extra-brush-panel">
            <div>
              <strong>{hasBrushRange ? t('extra.brush.ready') : t('extra.brush.empty')}</strong>
              <span>{t('extra.brush.count', { count: brushFillMask.points.length })}</span>
            </div>
            <div className="extra-actions extra-brush-actions">
              <button
                type="button"
                className={`primary-button ${brushFillActive ? 'save' : ''}`}
                onClick={() => onBrushFillActiveChange(!brushFillActive)}
              >
                {brushFillActive ? t('extra.brush.stopDraw') : t('extra.brush.draw')}
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!hasBrushRange}
                onClick={() => {
                  onBrushFillClear();
                  setBrushResult(null);
                }}
              >
                {t('extra.brush.clear')}
              </button>
            </div>
          </div>
        )}

        <div className="extra-section">
          <div className="extra-section-title">{t('extra.quality')}</div>
          <div className="extra-segmented" role="group" aria-label={t('extra.quality')}>
            {qualityModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={quality === mode ? 'selected' : ''}
                onClick={() => setPreset(mode)}
              >
                {t(`extra.quality.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        {toolMode === 'brush' ? (
          <div className="extra-section extra-controls">
            <label>
              <span>{t('extra.brush.size')}</span>
              <input
                type="range"
                min={4}
                max={64}
                step={1}
                value={brushFillBrushSize}
                onChange={(event) => onBrushFillBrushSizeChange(Number(event.target.value))}
              />
              <output>{brushFillBrushSize}px</output>
            </label>
            <label className="extra-select-row">
              <span>{t('extra.brush.source')}</span>
              <select
                value={brushSourceMode}
                onChange={(event) => {
                  setBrushSourceMode(event.target.value as BrushFillSourceMode);
                  setBrushResult(null);
                }}
              >
                <option value="color">{t('extra.brush.source.color')}</option>
                <option value="deco">{t('extra.brush.source.deco')}</option>
              </select>
            </label>
            {brushSourceMode === 'color' ? (
              <label className="extra-color-row">
                <span>{t('extra.brush.color')}</span>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(event) => {
                    setBrushColor(event.target.value);
                    setBrushResult(null);
                  }}
                />
                <output>{brushColor.toUpperCase()}</output>
              </label>
            ) : (
              <label className="extra-select-row">
                <span>{t('extra.brush.deco')}</span>
                <select
                  value={brushDecoId}
                  onChange={(event) => {
                    setBrushDecoId(event.target.value);
                    setBrushResult(null);
                  }}
                >
                  {decoOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ) : null}

        <div className="extra-section extra-controls">
          {toolMode === 'image' ? (
            <label>
            <span>{t('extra.maxSize')}</span>
            <input
              type="range"
              min={16}
              max={256}
              step={16}
              value={options.maxSize}
              onChange={(event) => patchOptions({ maxSize: Number(event.target.value) })}
            />
            <output>{options.maxSize}px</output>
            </label>
          ) : null}
          {toolMode === 'image' ? (
            <label>
            <span>{t('extra.alpha')}</span>
            <input
              type="range"
              min={0}
              max={254}
              step={1}
              value={options.alphaThreshold}
              onChange={(event) => patchOptions({ alphaThreshold: Number(event.target.value) })}
            />
            <output>{options.alphaThreshold}</output>
            </label>
          ) : null}
          <label>
            <span>{t('extra.gap')}</span>
            <input
              type="range"
              min={0.5}
              max={6}
              step={0.05}
              value={options.gapFactor}
              onChange={(event) => patchOptions({ gapFactor: Number(event.target.value) })}
            />
            <output>{options.gapFactor.toFixed(2)}</output>
          </label>
          <label>
            <span>{t('extra.scale')}</span>
            <input
              type="range"
              min={1}
              max={3.5}
              step={0.01}
              value={options.targetScaleMultiplier}
              onChange={(event) => patchOptions({ targetScaleMultiplier: Number(event.target.value) })}
            />
            <output>{options.targetScaleMultiplier.toFixed(2)}</output>
          </label>
          <label>
            <span>{t('extra.ratio')}</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.01}
              value={options.targetRatio}
              onChange={(event) => patchOptions({ targetRatio: Number(event.target.value) })}
            />
            <output>{options.targetRatio.toFixed(2)}</output>
          </label>
          <label>
            <span>{t('extra.maxLayers')}</span>
            <input
              type="range"
              min={500}
              max={50000}
              step={100}
              value={options.maxLayers}
              onChange={(event) => patchOptions({ maxLayers: Number(event.target.value) })}
            />
            <output>{formatNumber(options.maxLayers)}</output>
          </label>
          {toolMode === 'image' ? (
            <label>
            <span>{t('extra.minSource')}</span>
            <input
              type="range"
              min={0}
              max={900}
              step={10}
              value={options.minSourceOpaquePixels}
              onChange={(event) => patchOptions({ minSourceOpaquePixels: Number(event.target.value) })}
            />
            <output>{formatNumber(options.minSourceOpaquePixels)}</output>
            </label>
          ) : null}
          {toolMode === 'image' || brushSourceMode === 'color' ? (
            <label className="extra-select-row">
            <span>{t('extra.algorithm')}</span>
            <select
              value={options.colorAlgorithm}
              onChange={(event) => patchOptions({ colorAlgorithm: event.target.value as ColorMatchAlgorithm })}
            >
              {colorAlgorithms.map((algorithm) => (
                <option key={algorithm} value={algorithm}>
                  {t(`extra.algorithm.${algorithm}`)}
                </option>
              ))}
            </select>
            </label>
          ) : null}
        </div>

        {toolMode === 'image' ? (
          <div className="extra-actions">
            <button type="button" className="primary-button save" disabled={!canConvert} onClick={convert}>
              {converting ? t('extra.converting') : t('extra.convert')}
            </button>
            <button type="button" className="primary-button" disabled={!canInsert} onClick={insert}>
              {inserted ? t('extra.inserted') : t('extra.insert')}
            </button>
          </div>
        ) : (
          <div className="extra-actions">
            <button type="button" className="primary-button save" disabled={!canBrushFill} onClick={fillBrushRange}>
              {brushFilling ? t('extra.brush.filling') : t('extra.brush.fill')}
            </button>
          </div>
        )}

        {(converting || progress) && (
          <div className="extra-progress" aria-live="polite">
            <div>
              <span>{progressLabel(progress)}</span>
              <strong>{progressValue}%</strong>
            </div>
            <i style={{ width: `${progressValue}%` }} />
          </div>
        )}

        {toolMode === 'image' && summary && (
          <div className="extra-stats">
            {summary.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}

        {toolMode === 'brush' && brushSummary && (
          <div className="extra-stats">
            {brushSummary.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}

        <label className="extra-group-name">
          <span>{t('extra.groupName')}</span>
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        </label>

        {toolMode === 'image' && result?.warnings.length ? (
          <div className="extra-message warning">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {toolMode === 'brush' && brushResult?.warnings.length ? (
          <div className="extra-message warning">
            {brushResult.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {error ? <div className="extra-message error">{error}</div> : null}
      </div>
    </section>
  );
}
