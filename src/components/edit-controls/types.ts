import type { TransformValues } from '../../types/role';
import type { ReferenceImageLayer } from '../../types/referenceImage';

export interface EditControlsProps {
  disabled: boolean;
  faceAlwaysEnabled?: boolean;
  editValues: TransformValues;
  referenceImage?: ReferenceImageLayer | null;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  playbackToolVisible: boolean;
  headGlowAlwaysOn: boolean;
  facingQuarterTurns: number;
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
  onCenterMirrorCopyHorizontal(): void;
  onCenterMirrorCopyVertical(): void;
  onFaceRotate(): void;
  onOpenWeaponAnimation(): void;
  onStartWeaponAnimation(): void;
  onStopWeaponAnimation(): void;
  onRestartWeaponAnimation(): void;
  onTogglePlaybackTool(): void;
  onToggleHeadGlowAlwaysOn(): void;
  onStageScaleChange(scale: number): void;
  onReferenceImageBeginTransform?(): void;
  onReferenceImageCommitTransform?(): void;
  onReferenceImageTransformChange?(patch: { x?: number; y?: number; scale?: number; opacity?: number }, commit?: boolean): void;
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
