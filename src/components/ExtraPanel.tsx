import { useEffect, useMemo, useState } from 'react';
import { t } from '../i18n';
import type { DecorationLayer, PartOption } from '../types/role';
import {
  convertImageFileToDecos,
  IMAGE_TO_DECO_PRESETS,
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
import {
  brushResultStats,
  DEFAULT_EXTRA_GROUP_NAME,
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_IMAGE_QUALITY,
  formatNumber,
  imageGroupName,
  imageResultStats,
  type BrushFillSourceMode,
  type ExtraToolMode
} from './extraPanelModels';

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
  const [toolMode, setToolMode] = useState<ExtraToolMode>('image');
  const [quality, setQuality] = useState<ImageToDecoQuality>(DEFAULT_IMAGE_QUALITY);
  const [options, setOptions] = useState<ImageToDecoConversionOptions>(DEFAULT_IMAGE_OPTIONS);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [groupName, setGroupName] = useState(DEFAULT_EXTRA_GROUP_NAME);
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
    setGroupName(imageGroupName(file));
    setResult(null);
    setError(null);
    setInserted(false);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (toolMode !== 'brush' && brushFillActive) {
      onBrushFillActiveChange(false);
    }
    if (toolMode === 'brush' && groupName === DEFAULT_EXTRA_GROUP_NAME) {
      setGroupName(t('extra.brush.groupName'));
    }
  }, [brushFillActive, groupName, onBrushFillActiveChange, toolMode]);

  useEffect(() => () => onBrushFillActiveChange(false), [onBrushFillActiveChange]);

  useEffect(() => {
    if (brushDecoId && decoOptions.some((option) => option.id === brushDecoId)) return;
    setBrushDecoId(decoOptions[0]?.id ?? '');
  }, [brushDecoId, decoOptions]);

  const visiblePreview = result?.previewDataUrl ?? previewUrl;
  const canConvert = Boolean(file && !converting && decoOptions.length);
  const canInsert = Boolean(result?.decorations.length && !inserted);
  const hasBrushRange = brushFillMask.points.length > 0;
  const canBrushFill = Boolean(hasBrushRange && !brushFilling && decoOptions.length && (brushSourceMode === 'color' || brushDecoId));

  const summary = useMemo(() => imageResultStats(result, t), [result]);
  const brushSummary = useMemo(
    () => brushResultStats(brushResult, brushFillMask.points.length, t),
    [brushFillMask.points.length, brushResult]
  );

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
    const insertedCount = onInsert(result.decorations, groupName.trim() || imageGroupName(file));
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

  const clearBrushRange = () => {
    onBrushFillClear();
    setBrushResult(null);
  };

  return (
    <section className="choice-list extra-panel" aria-label={t('extra.title')}>
      <header className="choice-list-header extra-panel-header">
        <strong>{t('extra.title')}</strong>
        <span>{formatNumber(decoOptions.length)} deco</span>
      </header>

      <div className="extra-scroll">
        <ExtraModeSwitch toolMode={toolMode} onChange={setToolMode} />

        {toolMode === 'image' ? (
          <ImageImportPanel file={file} visiblePreview={visiblePreview} onAcceptFile={acceptFile} />
        ) : (
          <BrushFillPanel
            active={brushFillActive}
            hasBrushRange={hasBrushRange}
            pointCount={brushFillMask.points.length}
            onActiveChange={onBrushFillActiveChange}
            onClear={clearBrushRange}
          />
        )}

        <ExtraConversionSettings
          toolMode={toolMode}
          quality={quality}
          options={options}
          brushFillBrushSize={brushFillBrushSize}
          brushSourceMode={brushSourceMode}
          brushColor={brushColor}
          brushDecoId={brushDecoId}
          decoOptions={decoOptions}
          onPreset={setPreset}
          onPatchOptions={patchOptions}
          onBrushFillBrushSizeChange={onBrushFillBrushSizeChange}
          onBrushSourceModeChange={(mode) => {
            setBrushSourceMode(mode);
            setBrushResult(null);
          }}
          onBrushColorChange={(color) => {
            setBrushColor(color);
            setBrushResult(null);
          }}
          onBrushDecoIdChange={(id) => {
            setBrushDecoId(id);
            setBrushResult(null);
          }}
        />

        <ExtraActionBar
          toolMode={toolMode}
          canConvert={canConvert}
          converting={converting}
          canInsert={canInsert}
          inserted={inserted}
          canBrushFill={canBrushFill}
          brushFilling={brushFilling}
          onConvert={convert}
          onInsert={insert}
          onBrushFill={fillBrushRange}
        />

        <ExtraProgressView progress={progress} active={converting} />
        <ExtraStatsView items={toolMode === 'image' ? summary : brushSummary} />

        <label className="extra-group-name">
          <span>{t('extra.groupName')}</span>
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        </label>

        <ExtraWarnings warnings={toolMode === 'image' ? result?.warnings : brushResult?.warnings} />
        {error ? <div className="extra-message error">{error}</div> : null}
      </div>
    </section>
  );
}
