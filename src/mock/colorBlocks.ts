import { createId } from '../lib/math';
import type { DecorationGroup, DecorationLayer, RoleDocument } from '../types/role';
import { findOptionByCode } from './options';

export interface ColorBlockDecoTemplate {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

export interface ColorBlockPreset {
  id: string;
  camp: 'skydow' | 'royal' | 'third';
  name: string;
  label: string;
  color: string;
  deco: ColorBlockDecoTemplate[];
}

export const colorBlockPresets: ColorBlockPreset[] = [
  {
    id: 'third-black-block',
    camp: 'third',
    name: 'Black Color Block',
    label: '第三勢力 Black',
    color: '#050505',
    deco: [
      { c: 'third_deco_46', x: -2.0, y: 0.0, sx: -0.24, sy: 0.8, r: 0.0 },
      { c: 'third_deco_46', x: -4.0, y: 0.0, sx: 0.3, sy: 0.81, r: 0.0 },
      { c: 'third_deco_40', x: -6.0, y: 0.0, sx: 0.135, sy: -1.65, r: 0.0 },
      { c: 'third_deco_46', x: 2.0, y: 0.0, sx: 0.3, sy: 0.81, r: 0.0 },
      { c: 'third_deco_40', x: -2.0, y: 0.0, sx: 0.135, sy: -1.65, r: 0.0 },
      { c: 'third_deco_15', x: 6.0, y: 0.0, sx: 0.0677, sy: 0.3935, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 6.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_15', x: 6.0, y: 0.0, sx: 0.0677, sy: 0.3935, r: 0.0 },
      { c: 'third_deco_40', x: 6.0, y: 0.0, sx: 0.135, sy: -1.65, r: 0.0 },
      { c: 'third_deco_40', x: -1.0, y: 0.0, sx: 0.135, sy: -1.65, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.535, sy: 0.765, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -3.0, sx: 0.52, sy: 0.475, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -2.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: -1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 0.0, sx: 0.52, sy: 0.425, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 1.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 2.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 3.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 3.0, sx: 0.52, sy: 0.425, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 4.0, sx: 0.52, sy: 0.425, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 5.0, sx: 0.52, sy: 0.475, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 4.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 5.0, sx: 0.54, sy: 0.43, r: 0.0 },
      { c: 'third_deco_40', x: 0.0, y: 6.0, sx: 0.54, sy: 0.43, r: 0.0 }
    ]
  }
];

export function getVisibleColorBlocks(camp: string): ColorBlockPreset[] {
  if (camp === 'civil' || camp === 'camp4' || camp === '無關陣營') return colorBlockPresets;
  return colorBlockPresets.filter((preset) => preset.camp === camp);
}

export function colorBlockToRole(preset: ColorBlockPreset, baseRole: RoleDocument): RoleDocument {
  // The source preset is stored in legacy bottom-to-top order. The rebuild UI/runtime
  // uses top-first decoration order, so reverse the block before creating layers.
  const decorations: DecorationLayer[] = preset.deco.slice().reverse().map((item) => {
    const option = findOptionByCode('deco', item.c);
    return {
      id: createId('deco'),
      code: item.c,
      assetId: option?.id ?? item.c,
      name: option?.label ?? item.c,
      x: item.x,
      y: item.y,
      scaleX: item.sx,
      scaleY: item.sy,
      rotation: (item.r * 180) / Math.PI,
      visible: true,
      opacity: 1
    } satisfies DecorationLayer;
  });

  const groups: DecorationGroup[] = decorations.length >= 2
    ? [
        {
          id: createId('group'),
          name: preset.label,
          visible: true,
          collapsed: false,
          itemIds: decorations.map((item) => item.id)
        }
      ]
    : [];

  return {
    ...baseRole,
    name: preset.name,
    camp: preset.camp,
    decorations,
    groups,
    updatedAt: new Date().toISOString()
  };
}
