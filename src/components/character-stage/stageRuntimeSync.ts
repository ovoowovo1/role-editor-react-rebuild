import { useEffect, type MutableRefObject } from 'react';
import type { BrushFillMask } from '../../lib/conversion/brushFillToDeco';
import type { DecorationLayer, RoleDocument } from '../../types/role';
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
  onUpdateDecoration(id: string, patch: Partial<DecorationLayer>, commit?: boolean): void;
  onApplyDragDelta(dx: number, dy: number): void;
  onCommitDragDelta(dx: number, dy: number): void;
  onBeginTransient(): void;
  onCommitTransient(): void;
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
  onUpdateDecoration,
  onApplyDragDelta,
  onCommitDragDelta,
  onBeginTransient,
  onCommitTransient,
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
      onUpdateDecoration,
      onApplyDragDelta,
      onCommitDragDelta,
      onBeginTransient,
      onCommitTransient,
      onBrushFillMaskChange
    };
  }, [
    callbacksRef,
    onApplyDragDelta,
    onBeginTransient,
    onBrushFillMaskChange,
    onCommitDragDelta,
    onCommitTransient,
    onUpdateDecoration
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
