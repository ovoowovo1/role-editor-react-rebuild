import { useEffect, type MutableRefObject } from 'react';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { RoleDocument } from '../../types/role';
import type { BrushDrawState, BrushFillState, StageCallbacks } from './types';

interface StageRuntimeSyncOptions {
  role: RoleDocument;
  selectedIds: string[];
  brushFillActive: boolean;
  brushFillBrushSize: number;
  brushFillMask: BrushFillMask;
  roleRef: MutableRefObject<RoleDocument>;
  selectedIdsRef: MutableRefObject<string[]>;
  callbacksRef: MutableRefObject<StageCallbacks>;
  brushFillRef: MutableRefObject<BrushFillState>;
  brushDrawRef: MutableRefObject<BrushDrawState | null>;
  onCommitDrag(selectionIds: readonly string[], dx: number, dy: number): void;
  onClearSelection(): void;
  onBrushFillMaskChange?(mask: BrushFillMask): void;
}

export function useStageRuntimeRefSync({
  role,
  selectedIds,
  brushFillActive,
  brushFillBrushSize,
  brushFillMask,
  roleRef,
  selectedIdsRef,
  callbacksRef,
  brushFillRef,
  brushDrawRef,
  onCommitDrag,
  onClearSelection,
  onBrushFillMaskChange
}: StageRuntimeSyncOptions): void {
  useEffect(() => {
    roleRef.current = role;
  }, [role, roleRef]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds, selectedIdsRef]);

  useEffect(() => {
    callbacksRef.current = {
      onCommitDrag,
      onClearSelection,
      onBrushFillMaskChange
    };
  }, [
    callbacksRef,
    onBrushFillMaskChange,
    onClearSelection,
    onCommitDrag
  ]);

  useEffect(() => {
    brushFillRef.current = {
      active: brushFillActive,
      brushSize: brushFillBrushSize,
      mask: brushFillMask
    };
    if (!brushFillActive) {
      brushDrawRef.current = null;
    }
  }, [brushDrawRef, brushFillActive, brushFillBrushSize, brushFillMask, brushFillRef]);
}
