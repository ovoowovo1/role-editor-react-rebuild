import { t } from '../i18n';
import { EditToolbar } from './edit-controls/EditToolbar';
import { TransformRangePanel } from './edit-controls/TransformRangePanel';
import type { EditControlsProps } from './edit-controls/types';

export function EditControls({
  disabled,
  faceAlwaysEnabled = false,
  editValues,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  playbackToolVisible,
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
  onTogglePlaybackTool,
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
        playbackToolVisible={playbackToolVisible}
        stageScale={stageScale}
        stageMinScale={stageMinScale}
        stageMaxScale={stageMaxScale}
        onCancelSelection={onCancelSelection}
        onFlip={onFlip}
        onMirrorCopyHorizontal={onMirrorCopyHorizontal}
        onMirrorCopyVertical={onMirrorCopyVertical}
        onFaceRotate={onFaceRotate}
        onOpenWeaponAnimation={onOpenWeaponAnimation}
        onStartWeaponAnimation={onStartWeaponAnimation}
        onStopWeaponAnimation={onStopWeaponAnimation}
        onRestartWeaponAnimation={onRestartWeaponAnimation}
        onTogglePlaybackTool={onTogglePlaybackTool}
        onStageScaleChange={onStageScaleChange}
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
    </section>
  );
}
