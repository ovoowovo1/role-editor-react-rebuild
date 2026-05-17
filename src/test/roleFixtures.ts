import type { DecorationGroup, DecorationLayer, PartOption, RoleDocument } from '../types/role';

export function makeDecorationLayer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    visible: true,
    opacity: 1,
    ...patch
  };
}

export function makeDecorationGroup(id: string, patch: Partial<DecorationGroup> = {}): DecorationGroup {
  return {
    id,
    name: id,
    itemIds: [],
    visible: true,
    collapsed: false,
    ...patch
  };
}

export function makeRoleDocument(patch: Partial<RoleDocument> = {}): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'x',
    gender: 'male',
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 0, hand: 0, foot: 0, cape: 0 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 0,
    headLayer: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, visible: true, opacity: 1 },
    decorations: [],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

export function makePartOption(id: string, patch: Partial<PartOption> = {}): PartOption {
  return {
    id,
    code: id,
    category: 'deco',
    label: id,
    icon: `${id}.png`,
    accent: '#35d0ff',
    secondary: '#9cffb2',
    mockKind: 'deco',
    ...patch
  };
}
