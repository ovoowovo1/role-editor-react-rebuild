import type { BrushFillConversionResult, BrushFillSource } from '../lib/brushFillToDeco';
import {
  IMAGE_TO_DECO_PRESETS,
  type ColorMatchAlgorithm,
  type ImageToDecoConversionResult,
  type ImageToDecoProgress,
  type ImageToDecoQuality
} from '../lib/imageToDeco';
import type { TranslationParams } from '../i18n';

export type ExtraToolMode = 'image' | 'brush';
export type BrushFillSourceMode = BrushFillSource['type'];

export interface ExtraStatItem {
  label: string;
  value: string;
}

export type ExtraPanelTranslate = (key: string, params?: TranslationParams) => string;

export const qualityModes: ImageToDecoQuality[] = ['performance', 'balanced', 'detail', 'custom'];
export const colorAlgorithms: ColorMatchAlgorithm[] = [
  'cielab',
  'weighted-rgb',
  'rgb',
  'luminance',
  'hsv',
  'hsl',
  'brightness-color'
];

export const DEFAULT_EXTRA_GROUP_NAME = 'Image Build';
export const DEFAULT_IMAGE_QUALITY: ImageToDecoQuality = 'balanced';
export const DEFAULT_IMAGE_OPTIONS = IMAGE_TO_DECO_PRESETS.balanced;

export function fileBaseName(file: Pick<File, 'name'> | null): string {
  return file?.name.replace(/\.[^.]+$/, '') || DEFAULT_EXTRA_GROUP_NAME;
}

export function imageGroupName(file: Pick<File, 'name'> | null): string {
  return `Image: ${fileBaseName(file)}`;
}

export function progressPercent(progress: ImageToDecoProgress | null): number {
  if (!progress || progress.total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((progress.done / progress.total) * 100)));
}

export function progressLabel(progress: ImageToDecoProgress | null, translate: ExtraPanelTranslate): string {
  if (!progress) return translate('extra.progressIdle');
  return translate(`extra.progress.${progress.stage}`);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function imageResultStats(
  result: ImageToDecoConversionResult | null,
  translate: ExtraPanelTranslate
): ExtraStatItem[] | null {
  if (!result) return null;
  return [
    { label: translate('extra.stat.layers'), value: formatNumber(result.generatedPixels) },
    { label: translate('extra.stat.size'), value: `${result.outputWidth}x${result.outputHeight}` },
    { label: translate('extra.stat.palette'), value: formatNumber(result.paletteSize) },
    { label: translate('extra.stat.visible'), value: formatNumber(result.opaquePixels) }
  ];
}

export function brushResultStats(
  result: BrushFillConversionResult | null,
  pointCount: number,
  translate: ExtraPanelTranslate
): ExtraStatItem[] | null {
  if (!result) return null;
  return [
    { label: translate('extra.stat.layers'), value: formatNumber(result.generatedPixels) },
    { label: translate('extra.brush.samples'), value: formatNumber(result.sampledPixels) },
    { label: translate('extra.stat.palette'), value: formatNumber(result.paletteSize) },
    { label: translate('extra.brush.points'), value: formatNumber(pointCount) }
  ];
}
