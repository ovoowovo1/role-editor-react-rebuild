import { t } from '../i18n';
import { EditToolbar } from './edit-controls/EditToolbar';
import { TransformRangePanel } from './edit-controls/TransformRangePanel';
import { ReferenceImageControls } from './edit-controls/ReferenceImageControls';
import type { EditControlsProps } from './edit-controls/types';

export function EditControls({
  disabled,
  faceAlwaysEnabled = false,
  editValues,
  referenceImage = null,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  playbackToolVisible,
  headGlowAlwaysOn,
  facingQuarterTurns,
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
  onCenterMirrorCopyHorizontal,
  onCenterMirrorCopyVertical,
  onFaceRotate,
  onOpenWeaponAnimation,
  onStartWeaponAnimation,
  onStopWeaponAnimation,
  onRestartWeaponAnimation,
  onTogglePlaybackTool,
  onToggleHeadGlowAlwaysOn,
  onStageScaleChange,
  onReferenceImageBeginTransform,
  onReferenceImageCommitTransform,
  onReferenceImageTransformChange
}: EditControlsProps) {
  const imageSelected = Boolean(referenceImage);
  const roleDisabled = disabled || imageSelected;
  const faceDisabled = faceAlwaysEnabled ? false : roleDisabled;

  return (
    <section className={`edit-function ${roleDisabled ? 'disabled' : ''}`} aria-label={t('edit.controls')}>
      <EditToolbar
        disabled={roleDisabled}
        selectionDisabled={disabled && !imageSelected}
        faceDisabled={faceDisabled}
        bodyAnimationLabel={bodyAnimationLabel}
        bodyAnimationPlaying={bodyAnimationPlaying}
        playbackToolVisible={playbackToolVisible}
        headGlowAlwaysOn={headGlowAlwaysOn}
        facingQuarterTurns={facingQuarterTurns}
        stageScale={stageScale}
        stageMinScale={stageMinScale}
        stageMaxScale={stageMaxScale}
        onCancelSelection={onCancelSelection}
        onFlip={onFlip}
        onMirrorCopyHorizontal={onMirrorCopyHorizontal}
        onMirrorCopyVertical={onMirrorCopyVertical}
        onCenterMirrorCopyHorizontal={onCenterMirrorCopyHorizontal}
        onCenterMirrorCopyVertical={onCenterMirrorCopyVertical}
        onFaceRotate={onFaceRotate}
        onOpenWeaponAnimation={onOpenWeaponAnimation}
        onStartWeaponAnimation={onStartWeaponAnimation}
        onStopWeaponAnimation={onStopWeaponAnimation}
        onRestartWeaponAnimation={onRestartWeaponAnimation}
        onTogglePlaybackTool={onTogglePlaybackTool}
        onToggleHeadGlowAlwaysOn={onToggleHeadGlowAlwaysOn}
        onStageScaleChange={onStageScaleChange}
      />

      {referenceImage ? (
        <ReferenceImageControls
          image={referenceImage}
          positionRange={positionRange}
          onBegin={onReferenceImageBeginTransform ?? (() => undefined)}
          onCommit={onReferenceImageCommitTransform ?? (() => undefined)}
          onChange={onReferenceImageTransformChange ?? (() => undefined)}
        />
      ) : (
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
      )}
    </section>
  );
}
