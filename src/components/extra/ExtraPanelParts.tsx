import { useRef } from 'react';
import { t } from '../../i18n';
import type { PartOption } from '../../types/role';
import type { ColorMatchAlgorithm, ImageToDecoConversionOptions, ImageToDecoProgress, ImageToDecoQuality } from '../../lib/conversion/imageToDeco';
import type { ExtraStatItem, ExtraToolMode, BrushFillSourceMode } from './extraPanelModels';
import {
  colorAlgorithms,
  formatNumber,
  progressLabel,
  progressPercent,
  qualityModes
} from './extraPanelModels';

interface ExtraModeSwitchProps {
  toolMode: ExtraToolMode;
  onChange(mode: ExtraToolMode): void;
}

export function ExtraModeSwitch({ toolMode, onChange }: ExtraModeSwitchProps) {
  return (
    <div className="extra-section extra-section-first">
      <div className="extra-segmented extra-mode-switch" role="group" aria-label={t('extra.mode')}>
        {(['image', 'brush'] as ExtraToolMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={toolMode === mode ? 'selected' : ''}
            onClick={() => onChange(mode)}
          >
            {t(`extra.mode.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ImageImportPanelProps {
  file: File | null;
  visiblePreview: string | null;
  onAcceptFile(file: File | undefined | null): void;
}

export function ImageImportPanel({ file, visiblePreview, onAcceptFile }: ImageImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`extra-dropzone ${file ? 'has-file' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onAcceptFile(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          onAcceptFile(event.target.files?.[0]);
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
  );
}

interface BrushFillPanelProps {
  active: boolean;
  hasBrushRange: boolean;
  pointCount: number;
  onActiveChange(active: boolean): void;
  onClear(): void;
}

export function BrushFillPanel({ active, hasBrushRange, pointCount, onActiveChange, onClear }: BrushFillPanelProps) {
  return (
    <div className="extra-brush-panel">
      <div>
        <strong>{hasBrushRange ? t('extra.brush.ready') : t('extra.brush.empty')}</strong>
        <span>{t('extra.brush.count', { count: pointCount })}</span>
      </div>
      <div className="extra-actions extra-brush-actions">
        <button
          type="button"
          className={`primary-button ${active ? 'save' : ''}`}
          onClick={() => onActiveChange(!active)}
        >
          {active ? t('extra.brush.stopDraw') : t('extra.brush.draw')}
        </button>
        <button type="button" className="primary-button" disabled={!hasBrushRange} onClick={onClear}>
          {t('extra.brush.clear')}
        </button>
      </div>
    </div>
  );
}

interface ExtraConversionSettingsProps {
  toolMode: ExtraToolMode;
  quality: ImageToDecoQuality;
  options: ImageToDecoConversionOptions;
  brushFillBrushSize: number;
  brushSourceMode: BrushFillSourceMode;
  brushColor: string;
  brushDecoId: string;
  decoOptions: PartOption[];
  onPreset(mode: ImageToDecoQuality): void;
  onPatchOptions(patch: Partial<ImageToDecoConversionOptions>): void;
  onBrushFillBrushSizeChange(size: number): void;
  onBrushSourceModeChange(mode: BrushFillSourceMode): void;
  onBrushColorChange(color: string): void;
  onBrushDecoIdChange(id: string): void;
}

export function ExtraConversionSettings({
  toolMode,
  quality,
  options,
  brushFillBrushSize,
  brushSourceMode,
  brushColor,
  brushDecoId,
  decoOptions,
  onPreset,
  onPatchOptions,
  onBrushFillBrushSizeChange,
  onBrushSourceModeChange,
  onBrushColorChange,
  onBrushDecoIdChange
}: ExtraConversionSettingsProps) {
  return (
    <>
      <div className="extra-section">
        <div className="extra-section-title">{t('extra.quality')}</div>
        <div className="extra-segmented" role="group" aria-label={t('extra.quality')}>
          {qualityModes.map((mode) => (
            <button
              key={mode}
              type="button"
              className={quality === mode ? 'selected' : ''}
              onClick={() => onPreset(mode)}
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
              onChange={(event) => onBrushSourceModeChange(event.target.value as BrushFillSourceMode)}
            >
              <option value="color">{t('extra.brush.source.color')}</option>
              <option value="deco">{t('extra.brush.source.deco')}</option>
            </select>
          </label>
          {brushSourceMode === 'color' ? (
            <label className="extra-color-row">
              <span>{t('extra.brush.color')}</span>
              <input type="color" value={brushColor} onChange={(event) => onBrushColorChange(event.target.value)} />
              <output>{brushColor.toUpperCase()}</output>
            </label>
          ) : (
            <label className="extra-select-row">
              <span>{t('extra.brush.deco')}</span>
              <select value={brushDecoId} onChange={(event) => onBrushDecoIdChange(event.target.value)}>
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
              onChange={(event) => onPatchOptions({ maxSize: Number(event.target.value) })}
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
              onChange={(event) => onPatchOptions({ alphaThreshold: Number(event.target.value) })}
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
            onChange={(event) => onPatchOptions({ gapFactor: Number(event.target.value) })}
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
            onChange={(event) => onPatchOptions({ targetScaleMultiplier: Number(event.target.value) })}
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
            onChange={(event) => onPatchOptions({ targetRatio: Number(event.target.value) })}
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
            onChange={(event) => onPatchOptions({ maxLayers: Number(event.target.value) })}
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
              onChange={(event) => onPatchOptions({ minSourceOpaquePixels: Number(event.target.value) })}
            />
            <output>{formatNumber(options.minSourceOpaquePixels)}</output>
          </label>
        ) : null}
        {toolMode === 'image' || brushSourceMode === 'color' ? (
          <label className="extra-select-row">
            <span>{t('extra.algorithm')}</span>
            <select
              value={options.colorAlgorithm}
              onChange={(event) => onPatchOptions({ colorAlgorithm: event.target.value as ColorMatchAlgorithm })}
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
    </>
  );
}

interface ExtraActionBarProps {
  toolMode: ExtraToolMode;
  canConvert: boolean;
  converting: boolean;
  canInsert: boolean;
  inserted: boolean;
  canBrushFill: boolean;
  brushFilling: boolean;
  onConvert(): void;
  onInsert(): void;
  onBrushFill(): void;
}

export function ExtraActionBar({
  toolMode,
  canConvert,
  converting,
  canInsert,
  inserted,
  canBrushFill,
  brushFilling,
  onConvert,
  onInsert,
  onBrushFill
}: ExtraActionBarProps) {
  if (toolMode === 'image') {
    return (
      <div className="extra-actions">
        <button type="button" className="primary-button save" disabled={!canConvert} onClick={onConvert}>
          {converting ? t('extra.converting') : t('extra.convert')}
        </button>
        <button type="button" className="primary-button" disabled={!canInsert} onClick={onInsert}>
          {inserted ? t('extra.inserted') : t('extra.insert')}
        </button>
      </div>
    );
  }

  return (
    <div className="extra-actions">
      <button type="button" className="primary-button save" disabled={!canBrushFill} onClick={onBrushFill}>
        {brushFilling ? t('extra.brush.filling') : t('extra.brush.fill')}
      </button>
    </div>
  );
}

interface ExtraProgressViewProps {
  progress: ImageToDecoProgress | null;
  active: boolean;
}

export function ExtraProgressView({ progress, active }: ExtraProgressViewProps) {
  if (!active && !progress) return null;
  const progressValue = progressPercent(progress);

  return (
    <div className="extra-progress" aria-live="polite">
      <div>
        <span>{progressLabel(progress, t)}</span>
        <strong>{progressValue}%</strong>
      </div>
      <i style={{ width: `${progressValue}%` }} />
    </div>
  );
}

interface ExtraStatsViewProps {
  items: ExtraStatItem[] | null;
}

export function ExtraStatsView({ items }: ExtraStatsViewProps) {
  if (!items) return null;
  return (
    <div className="extra-stats">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

interface ExtraWarningsProps {
  warnings?: string[];
}

export function ExtraWarnings({ warnings }: ExtraWarningsProps) {
  if (!warnings?.length) return null;
  return (
    <div className="extra-message warning">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}
