import { useCallback, useEffect, useMemo, useState } from 'react';
import { clampToDisc, createId } from '../lib/math';
import {
  DEFAULT_PIN_OUTLINE_SEGMENT,
  DEFAULT_PIN_OUTLINE_STATE,
  type PinOutlineMaterial,
  type PinOutlineSegment,
  type PinOutlineState
} from '../types/pinOutline';

interface UsePinOutlineToolOptions {
  positionRange?: number;
  /** Roles without a camp may use only one outline material at a time. */
  singleMaterial?: boolean;
}

export function usePinOutlineTool({ positionRange = 500, singleMaterial = false }: UsePinOutlineToolOptions = {}) {
  const [state, setState] = useState<PinOutlineState>(DEFAULT_PIN_OUTLINE_STATE);
  const range = Math.max(1, positionRange);

  useEffect(() => {
    if (!singleMaterial) return;
    setState((current) => {
      if (current.materials.length <= 1) return current;
      const materials = [current.materials[0]];
      const selectedMaterialId = materials[0].id;
      return { ...current, materials, selectedMaterialId };
    });
  }, [singleMaterial]);

  const setActive = useCallback((active: boolean) => {
    setState((current) => current.active === active ? current : { ...current, active });
  }, []);

  const toggleActive = useCallback(() => {
    setState((current) => ({ ...current, active: !current.active }));
  }, []);

  const addPin = useCallback((x: number, y: number) => {
    const position = clampToDisc(x, y, range);
    setState((current) => ({
      ...current,
      pins: [...current.pins, { id: createId('pin'), ...position }],
      segments: current.pins.length >= 1
        ? [...current.segments, { ...DEFAULT_PIN_OUTLINE_SEGMENT }]
        : current.segments
    }));
  }, [range]);

  const movePin = useCallback((id: string, x: number, y: number) => {
    const position = clampToDisc(x, y, range);
    setState((current) => {
      let changed = false;
      const pins = current.pins.map((pin) => {
        if (pin.id !== id) return pin;
        if (pin.x === position.x && pin.y === position.y) return pin;
        changed = true;
        return { ...pin, ...position };
      });
      return changed ? { ...current, pins } : current;
    });
  }, [range]);

  const removePin = useCallback((id: string) => {
    setState((current) => {
      const index = current.pins.findIndex((pin) => pin.id === id);
      if (index < 0) return current;
      const pins = current.pins.filter((pin) => pin.id !== id);
      const segments = current.segments.filter((_, segmentIndex) => segmentIndex !== index).slice(0, pins.length);
      return { ...current, pins, segments };
    });
  }, []);

  const reorderPins = useCallback((fromIndex: number, toIndex: number) => {
    setState((current) => {
      if (
        fromIndex < 0 || fromIndex >= current.pins.length ||
        toIndex < 0 || toIndex >= current.pins.length ||
        fromIndex === toIndex
      ) return current;
      const pins = [...current.pins];
      const [pin] = pins.splice(fromIndex, 1);
      pins.splice(toIndex, 0, pin);
      return { ...current, pins };
    });
  }, []);

  const updateSegment = useCallback((index: number, patch: Partial<PinOutlineSegment>) => {
    setState((current) => {
      if (index < 0 || index >= current.pins.length) return current;
      const segments = [...current.segments];
      while (segments.length < current.pins.length) segments.push({ ...DEFAULT_PIN_OUTLINE_SEGMENT });
      segments[index] = { ...segments[index], ...patch };
      return { ...current, segments };
    });
  }, []);

  const addMaterial = useCallback((assetId: string) => {
    setState((current) => {
      const material: PinOutlineMaterial = {
        id: createId('outline-material'),
        assetId
      };
      return {
        ...current,
        materials: singleMaterial ? [material] : [...current.materials, material],
        selectedMaterialId: material.id
      };
    });
  }, [singleMaterial]);

  const removeMaterial = useCallback((id: string) => {
    setState((current) => {
      const materials = current.materials.filter((material) => material.id !== id);
      if (materials.length === current.materials.length) return current;
      const selectedMaterialId = current.selectedMaterialId === id ? materials[0]?.id ?? null : current.selectedMaterialId;
      return { ...current, materials, selectedMaterialId };
    });
  }, []);

  const selectMaterial = useCallback((id: string | null) => {
    setState((current) => current.selectedMaterialId === id ? current : { ...current, selectedMaterialId: id });
  }, []);

  const clear = useCallback(() => setState((current) => current === DEFAULT_PIN_OUTLINE_STATE ? current : { ...DEFAULT_PIN_OUTLINE_STATE }), []);

  return useMemo(() => ({
    ...state,
    state,
    setActive,
    toggleActive,
    addPin,
    movePin,
    removePin,
    reorderPins,
    updateSegment,
    addMaterial,
    removeMaterial,
    selectMaterial,
    clear
  }), [
    addMaterial,
    addPin,
    clear,
    movePin,
    removeMaterial,
    removePin,
    reorderPins,
    selectMaterial,
    setActive,
    singleMaterial,
    state,
    toggleActive,
    updateSegment
  ]);
}
