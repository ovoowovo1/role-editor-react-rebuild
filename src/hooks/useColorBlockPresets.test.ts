import { describe, expect, it } from 'vitest';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import {
  colorBlockPresetErrorMessage,
  colorBlockPresetReducer,
  initialColorBlockPresetState
} from './useColorBlockPresets';

const preset: ColorBlockPreset = {
  id: 'p1',
  camp: 'third',
  name: 'Third',
  label: 'Third',
  color: '#35d0ff',
  deco: []
};

describe('color block preset state', () => {
  it('keeps existing presets while loading a new camp', () => {
    const state = colorBlockPresetReducer(
      { presets: [preset], loading: false, error: 'old error' },
      { type: 'loading' }
    );

    expect(state).toEqual({ presets: [preset], loading: true, error: null });
  });

  it('stores successful presets and clears error state', () => {
    expect(colorBlockPresetReducer(initialColorBlockPresetState, { type: 'success', presets: [preset] })).toEqual({
      presets: [preset],
      loading: false,
      error: null
    });
  });

  it('clears presets and records display error on failure', () => {
    expect(colorBlockPresetReducer({ presets: [preset], loading: true, error: null }, {
      type: 'failure',
      error: 'Failed'
    })).toEqual({
      presets: [],
      loading: false,
      error: 'Failed'
    });
  });

  it('normalizes unknown thrown values into messages', () => {
    expect(colorBlockPresetErrorMessage(new Error('network'))).toBe('network');
    expect(colorBlockPresetErrorMessage('plain')).toBe('plain');
  });
});
