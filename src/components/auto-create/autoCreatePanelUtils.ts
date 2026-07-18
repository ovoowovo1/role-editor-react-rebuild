import type { PartOption } from '../../types/role';
import type { AutoCreateTwroleSettings } from '../../lib/conversion/auto-create-twrole/contracts';

const numberFormat = new Intl.NumberFormat();

export const AUTO_CREATE_PROCESS_PREVIEW_EXPORT_EVERY = 1000;

export interface SourceTitleItem {
  title: string;
  count: number;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '-';
  return numberFormat.format(Number(value.toFixed(fractionDigits)));
}

export function isImageFile(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
}

export function isAutoCreateEmptyTargetError(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === 'object'
      && (error as { name?: unknown }).name === 'AutoCreateEmptyTargetError'
  );
}

export function isAutoCreateNoPlacementAreaError(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === 'object'
      && (error as { name?: unknown }).name === 'AutoCreateNoPlacementAreaError'
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function toSafeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function withAutoCreateLogEvery(
  settings: AutoCreateTwroleSettings,
  logEvery: number
): AutoCreateTwroleSettings {
  return { ...settings, logEvery };
}

export function withAutoCreateProcessPreview(
  settings: AutoCreateTwroleSettings,
  enabled: boolean
): AutoCreateTwroleSettings {
  return {
    ...settings,
    exportEvery: enabled ? AUTO_CREATE_PROCESS_PREVIEW_EXPORT_EVERY : 0
  };
}

export function optionTitle(option: PartOption): string {
  return option.label?.trim() || option.code || option.id;
}

export function sortTitles(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function buildSourceTitleItems(options: PartOption[]): SourceTitleItem[] {
  const counts = new Map<string, number>();
  for (const option of options) {
    const title = optionTitle(option);
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((left, right) => sortTitles(left.title, right.title));
}
