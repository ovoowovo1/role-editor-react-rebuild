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
