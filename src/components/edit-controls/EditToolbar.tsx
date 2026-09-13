import { t } from '../../i18n';
import { EDITOR_STAGE_SCALE_STEP } from '../../constants/editor';

interface EditToolbarProps {
  disabled: boolean;
  selectionDisabled?: boolean;
  faceDisabled: boolean;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  playbackToolVisible: boolean;
  headGlowAlwaysOn: boolean;
  facingQuarterTurns: number;
  stageScale: number;
  stageMinScale: number;
  stageMaxScale: number;
  onCancelSelection(): void;
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
}

export function EditToolbar({
  disabled,
  selectionDisabled = disabled,
  faceDisabled,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  playbackToolVisible,
  headGlowAlwaysOn,
  facingQuarterTurns,
  stageScale,
  stageMinScale,
  stageMaxScale,
  onCancelSelection,
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
  onStageScaleChange
}: EditToolbarProps) {
  const playbackToggleLabel = playbackToolVisible ? t('edit.hidePlaybackTool') : t('edit.showPlaybackTool');
  const headGlowToggleLabel = headGlowAlwaysOn ? t('edit.disableHeadGlowAlwaysOn') : t('edit.enableHeadGlowAlwaysOn');

  return (
    <div className="tool-row" aria-label={t('edit.iconToolbar')}>
      <div className="tool">
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-deselect-button"
          disabled={selectionDisabled}
          onClick={onCancelSelection}
          aria-label={t('edit.cancelSelection')}
          title={t('edit.cancelSelection')}
        >
          <span className="material-icons" aria-hidden="true">
            touch_app
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn tool-icon-head-glow"
          data-testid="toolbar-head-glow-toggle-button"
          aria-pressed={headGlowAlwaysOn}
          onClick={onToggleHeadGlowAlwaysOn}
          aria-label={headGlowToggleLabel}
          title={headGlowToggleLabel}
        >
          <span className="material-icons" aria-hidden="true">
            highlight
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-flip-horizontal-button"
          disabled={disabled}
          onClick={onFlip}
          aria-label={t('edit.flipHorizontal')}
          title={t('edit.flipHorizontal')}
        >
          <span className="material-icons" aria-hidden="true">
            flip
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-mirror-copy-horizontal-button"
          disabled={disabled}
          onClick={onMirrorCopyHorizontal}
          aria-label={t('edit.mirrorCopyH')}
          title={t('edit.mirrorCopyH')}
        >
          <span className="material-icons" aria-hidden="true">
            swap_horiz
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-mirror-copy-vertical-button"
          disabled={disabled}
          onClick={onMirrorCopyVertical}
          aria-label={t('edit.mirrorCopyV')}
          title={t('edit.mirrorCopyV')}
        >
          <span className="material-icons" aria-hidden="true">
            swap_vert
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-center-mirror-copy-horizontal-button"
          disabled={disabled}
          onClick={onCenterMirrorCopyHorizontal}
          aria-label={t('edit.centerMirrorCopyH')}
          title={t('edit.centerMirrorCopyH')}
        >
          <span className="material-icons" aria-hidden="true">
            vertical_align_center
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-center-mirror-copy-vertical-button"
          disabled={disabled}
          onClick={onCenterMirrorCopyVertical}
          aria-label={t('edit.centerMirrorCopyV')}
          title={t('edit.centerMirrorCopyV')}
        >
          <span className="material-icons" aria-hidden="true">
            format_align_center
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn tool-icon-face"
          data-testid="toolbar-face-rotate-button"
          disabled={faceDisabled}
          onClick={onFaceRotate}
          aria-label={t('edit.face')}
          title={t('edit.face')}
        >
          <span
            className="material-icons face-mat-icon"
            style={{ transform: `rotate(${facingQuarterTurns * 90 - 90}deg)` }}
            aria-hidden="true"
          >
            face
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="stage-scale-minus-button"
          disabled={stageScale <= stageMinScale}
          onClick={() => onStageScaleChange(stageScale - EDITOR_STAGE_SCALE_STEP)}
          aria-label={t('edit.stageMinus')}
          title={t('edit.stageMinus')}
        >
          <span className="material-icons" aria-hidden="true">
            zoom_out
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="stage-scale-plus-button"
          disabled={stageScale >= stageMaxScale}
          onClick={() => onStageScaleChange(stageScale + EDITOR_STAGE_SCALE_STEP)}
          aria-label={t('edit.stagePlus')}
          title={t('edit.stagePlus')}
        >
          <span className="material-icons" aria-hidden="true">
            zoom_in
          </span>
        </button>
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-playback-toggle-button"
          aria-pressed={playbackToolVisible}
          onClick={onTogglePlaybackTool}
          aria-label={playbackToggleLabel}
          title={playbackToggleLabel}
        >
          <span className="material-icons" aria-hidden="true">
            {playbackToolVisible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {playbackToolVisible ? (
        <div className="tool playback-tool" aria-label={t('edit.weaponPlayback')}>
          <button
            type="button"
            className="tool-icon-btn"
            data-testid="toolbar-weapon-animation-button"
            onClick={onOpenWeaponAnimation}
            aria-label={t('edit.weaponAnimation', { label: bodyAnimationLabel })}
            title={t('edit.weaponAnimation', { label: bodyAnimationLabel })}
          >
            <span className="material-icons" aria-hidden="true">
              sports_martial_arts
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            data-testid="toolbar-animation-start-button"
            disabled={bodyAnimationPlaying}
            onClick={onStartWeaponAnimation}
            aria-label={t('edit.startAnimation')}
            title={t('edit.start')}
          >
            <span className="material-icons" aria-hidden="true">
              play_arrow
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            data-testid="toolbar-animation-stop-button"
            disabled={!bodyAnimationPlaying}
            onClick={onStopWeaponAnimation}
            aria-label={t('edit.stopAnimation')}
            title={t('edit.stop')}
          >
            <span className="material-icons" aria-hidden="true">
              stop
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            data-testid="toolbar-animation-restart-button"
            onClick={onRestartWeaponAnimation}
            aria-label={t('edit.restartAnimation')}
            title={t('edit.restart')}
          >
            <span className="material-icons" aria-hidden="true">
              replay
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
