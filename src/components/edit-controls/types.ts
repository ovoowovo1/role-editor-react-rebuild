import type { TransformValues } from '../../types/role';

export interface EditControlsProps {
  disabled: boolean;
  faceAlwaysEnabled?: boolean;
  editValues: TransformValues;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  playbackToolVisible: boolean;
  stageScale: number;
  positionRange: number;
  stageMinScale: number;
  stageMaxScale: number;
  /** Deco scale slider range (head deco uses 1..2 in the original). */
  selectionScaleMin: number;
  selectionScaleMax: number;
  /** Deco ratio slider range (head deco uses 1..2 in the original). */
  selectionRatioMin: number;
  selectionRatioMax: number;
  onBeginTransient(): void;
  onCommitTransient(): void;
  onCancelSelection(): void;
  onTransformChange(patch: Partial<TransformValues>, commit?: boolean): void;
  onFlip(): void;
  onMirrorCopyHorizontal(): void;
  onMirrorCopyVertical(): void;
  onFaceRotate(): void;
  onOpenWeaponAnimation(): void;
  onStartWeaponAnimation(): void;
  onStopWeaponAnimation(): void;
  onRestartWeaponAnimation(): void;
  onTogglePlaybackTool(): void;
  onStageScaleChange(scale: number): void;
}

export interface RangeControlProps {
  label: string;
  testId?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  hint?: string;
  numberMin?: number | null;
  numberMax?: number | null;
  onBegin(): void;
  onCommit(): void;
  onChange(value: number, commit?: boolean): void;
}
