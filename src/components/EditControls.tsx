import { t } from '../i18n';
import { EditToolbar } from './edit-controls/EditToolbar';
import { StageScaleControl } from './edit-controls/StageScaleControl';
import { TransformRangePanel } from './edit-controls/TransformRangePanel';
import type { EditControlsProps } from './edit-controls/types';

export function EditControls({
  disabled,
  faceAlwaysEnabled = false,
  editValues,
  selectedCount,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  stageScale,
  positionRange,
  stageMinScale,
  stageMaxScale,
  selectionScaleMin,
  selectionScaleMax,
  selectionRatioMin,
  selectionRatioMax,
  onBeginTransient,
  onCommitTransient,
  onCancelSelection,
  onTransformChange,
  onFlip,
  onMirrorCopyHorizontal,
  onMirrorCopyVertical,
  onFaceRotate,
  onOpenWeaponAnimation,
  onStartWeaponAnimation,
  onStopWeaponAnimation,
  onRestartWeaponAnimation,
  onStageScaleChange
}: EditControlsProps) {
  const faceDisabled = faceAlwaysEnabled ? false : disabled;

  return (
    <section className={`edit-function ${disabled ? 'disabled' : ''}`} aria-label={t('edit.controls')}>
      <EditToolbar
        disabled={disabled}
        faceDisabled={faceDisabled}
        bodyAnimationLabel={bodyAnimationLabel}
        bodyAnimationPlaying={bodyAnimationPlaying}
        onCancelSelection={onCancelSelection}
        onFlip={onFlip}
        onMirrorCopyHorizontal={onMirrorCopyHorizontal}
        onMirrorCopyVertical={onMirrorCopyVertical}
        onFaceRotate={onFaceRotate}
        onOpenWeaponAnimation={onOpenWeaponAnimation}
        onStartWeaponAnimation={onStartWeaponAnimation}
        onStopWeaponAnimation={onStopWeaponAnimation}
        onRestartWeaponAnimation={onRestartWeaponAnimation}
      />

      <TransformRangePanel
        disabled={disabled}
        editValues={editValues}
        positionRange={positionRange}
        selectionScaleMin={selectionScaleMin}
        selectionScaleMax={selectionScaleMax}
        selectionRatioMin={selectionRatioMin}
        selectionRatioMax={selectionRatioMax}
        onBeginTransient={onBeginTransient}
        onCommitTransient={onCommitTransient}
        onTransformChange={onTransformChange}
      />

      <StageScaleControl
        selectedCount={selectedCount}
        stageScale={stageScale}
        stageMinScale={stageMinScale}
        stageMaxScale={stageMaxScale}
        onStageScaleChange={onStageScaleChange}
      />
    </section>
  );
}
