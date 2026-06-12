import type { ColorBlockPreset } from '../../mock/colorBlocks';
import { findOptionByCode } from '../../mock/options';
import type { PartOption } from '../../types/role';

export interface AutoCreateColorBlockPresetItem {
  preset: ColorBlockPreset;
  previewOptions: PartOption[];
  selected: boolean;
}

export function colorBlockPreviewOptions(preset: ColorBlockPreset): PartOption[] {
  const options = preset.deco
    .map((item) => findOptionByCode('deco', item.c))
    .filter((item): item is PartOption => Boolean(item));
  return options.filter((item, index) => options.findIndex((other) => other.code === item.code) === index).slice(0, 4);
}

export function colorBlockPresetMatchesSearch(preset: ColorBlockPreset, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return true;
  const searchable = [
    preset.id,
    preset.name,
    preset.label,
    preset.color,
    ...preset.deco.map((item) => item.c)
  ].join(' ').toLocaleLowerCase();
  return searchable.includes(query);
}

export function resolveSelectedColorBlockPresetId(
  presets: readonly ColorBlockPreset[],
  currentId: string | null | undefined
): string | null {
  if (currentId && presets.some((preset) => preset.id === currentId)) return currentId;
  return presets[0]?.id ?? null;
}

export function colorBlockPresetItems(
  presets: readonly ColorBlockPreset[],
  search: string,
  selectedPresetId: string | null | undefined
): AutoCreateColorBlockPresetItem[] {
  return presets
    .filter((preset) => colorBlockPresetMatchesSearch(preset, search))
    .map((preset) => ({
      preset,
      previewOptions: colorBlockPreviewOptions(preset),
      selected: preset.id === selectedPresetId
    }));
}
