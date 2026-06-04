import { t } from '../../i18n';
import type { PartOption } from '../../types/role';
import type { ColorMatchAlgorithm, ImageToDecoConversionOptions, ImageToDecoQuality } from '../../lib/conversion/imageToDeco';
import type { BrushFillSourceMode, ExtraToolMode } from './extraPanelModels';
import { colorAlgorithms, formatNumber, qualityModes } from './extraPanelModels';

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
