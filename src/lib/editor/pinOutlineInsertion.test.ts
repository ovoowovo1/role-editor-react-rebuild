import { describe, expect, it, vi } from 'vitest';
import type { PinOutlineState } from '../../types/pinOutline';

vi.mock('./pinOutlineAssetMetrics', () => ({
  resolvePinOutlineAssetMetrics: () => ({
    metrics: { x: -4, y: -3, width: 8, height: 6 },
    ready: true,
    textureUrl: null
  })
}));

import { buildPinOutlineDecorationLayers } from './pinOutlineInsertion';

function state(overrides: Partial<PinOutlineState> = {}): PinOutlineState {
  return {
    active: true,
    pins: [
      { id: 'a', x: -40, y: -30 },
      { id: 'b', x: 40, y: -30 },
      { id: 'c', x: 40, y: 30 },
      { id: 'd', x: -40, y: 30 }
    ],
    segments: [],
    materials: [{ id: 'material-1', assetId: 'asset-1' }],
    selectedMaterialId: 'material-1',
    ...overrides
  };
}

describe('pin outline insertion', () => {
  it('converts the runtime preview into independent role decoration layers', () => {
    const input = state();
    const before = structuredClone(input);
    const layers = buildPinOutlineDecorationLayers(input);

    expect(layers.length).toBeGreaterThan(0);
    expect(new Set(layers.map((layer) => layer.id)).size).toBe(layers.length);
    expect(layers.every((layer) => layer.id.startsWith('deco_'))).toBe(true);
    expect(layers.every((layer) => layer.assetId === 'asset-1')).toBe(true);
    expect(layers.every((layer) => layer.name === 'Pin outline')).toBe(true);
    expect(layers.every((layer) => layer.visible && layer.opacity === 1)).toBe(true);
    expect(input).toEqual(before);
  });

  it('does not create role layers when the preview is not ready', () => {
    expect(buildPinOutlineDecorationLayers(state({ pins: [] }))).toEqual([]);
    expect(buildPinOutlineDecorationLayers(state({ materials: [] }))).toEqual([]);
  });
});
