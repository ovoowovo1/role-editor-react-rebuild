import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption } from '../../types/role';
import {
  convertImageFileToDecos,
  IMAGE_TO_DECO_PRESETS,
  type ImageToDecoConversionOptions,
  type ImageToDecoConversionResult,
  type ImageToDecoProgress,
  type ImageToDecoQuality
} from '../../lib/conversion/imageToDeco';
import {
  DEFAULT_IMAGE_OPTIONS,
  DEFAULT_IMAGE_QUALITY,
  imageGroupName,
  imageResultStats
} from './extraPanelModels';

export function useExtraImageConversion({
  decoOptions,
  groupName,
  setGroupName,
  onInsert,
  onStatus,
  onError,
  onOptionsChanged
}: {
  decoOptions: PartOption[];
  groupName: string;
  setGroupName: Dispatch<SetStateAction<string>>;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
  onError(message: string | null): void;
  onOptionsChanged(): void;
}) {
  const [quality, setQuality] = useState<ImageToDecoQuality>(DEFAULT_IMAGE_QUALITY);
  const [options, setOptions] = useState<ImageToDecoConversionOptions>(DEFAULT_IMAGE_OPTIONS);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ImageToDecoConversionResult | null>(null);
  const [progress, setProgress] = useState<ImageToDecoProgress | null>(null);
  const [converting, setConverting] = useState(false);
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
    onError(null);
    setInserted(false);

    return () => URL.revokeObjectURL(url);
  }, [file, onError, setGroupName]);

  const visiblePreview = result?.previewDataUrl ?? previewUrl;
  const canConvert = Boolean(file && !converting && decoOptions.length);
  const canInsert = Boolean(result?.decorations.length && !inserted);
  const summary = useMemo(() => imageResultStats(result, t), [result]);

  const setPreset = (mode: ImageToDecoQuality) => {
    setQuality(mode);
    if (mode !== 'custom') setOptions(IMAGE_TO_DECO_PRESETS[mode]);
  };

  const patchOptions = (patch: Partial<ImageToDecoConversionOptions>) => {
    setOptions((current) => ({ ...current, ...patch }));
    setQuality('custom');
    setResult(null);
    setInserted(false);
    onOptionsChanged();
  };

  const acceptFile = (nextFile: File | undefined | null) => {
    if (!nextFile) return;
    if (!nextFile.type.startsWith('image/')) {
      onError(t('extra.error.fileType'));
      return;
    }
    setFile(nextFile);
  };

  const convert = async () => {
    if (!file) return;
    setConverting(true);
    onError(null);
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
      onError(message);
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

  return {
    quality,
    options,
    file,
    visiblePreview,
    summary,
    progress,
    converting,
    inserted,
    resultWarnings: result?.warnings,
    canConvert,
    canInsert,
    setPreset,
    patchOptions,
    acceptFile,
    convert,
    insert
  };
}
