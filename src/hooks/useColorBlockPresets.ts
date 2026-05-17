import { useEffect, useReducer } from 'react';
import { t } from '../i18n';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import { fetchColorBlockPresets } from '../lib/colorBlockApi';

export interface ColorBlockPresetState {
  presets: ColorBlockPreset[];
  loading: boolean;
  error: string | null;
}

export type ColorBlockPresetAction =
  | { type: 'loading' }
  | { type: 'success'; presets: ColorBlockPreset[] }
  | { type: 'failure'; error: string };

export const initialColorBlockPresetState: ColorBlockPresetState = {
  presets: [],
  loading: false,
  error: null
};

export function colorBlockPresetReducer(
  state: ColorBlockPresetState,
  action: ColorBlockPresetAction
): ColorBlockPresetState {
  if (action.type === 'loading') {
    return { ...state, loading: true, error: null };
  }
  if (action.type === 'success') {
    return { presets: action.presets, loading: false, error: null };
  }
  return { presets: [], loading: false, error: action.error };
}

export function colorBlockPresetErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useColorBlockPresets(camp: string, onStatus: (message: string) => void): ColorBlockPresetState {
  const [state, dispatch] = useReducer(colorBlockPresetReducer, initialColorBlockPresetState);

  useEffect(() => {
    let isCurrentCamp = true;
    dispatch({ type: 'loading' });

    fetchColorBlockPresets(camp)
      .then((presets) => {
        if (!isCurrentCamp) return;
        dispatch({ type: 'success', presets });
      })
      .catch((error) => {
        if (!isCurrentCamp) return;
        const message = colorBlockPresetErrorMessage(error);
        dispatch({ type: 'failure', error: t('colorBlock.loadFailed', { message }) });
        onStatus(t('status.colorBlockLoadFailed', { message }));
      });

    return () => {
      isCurrentCamp = false;
    };
  }, [camp, onStatus]);

  return state;
}
