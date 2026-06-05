import { t } from '../../i18n';

interface EditToolbarProps {
  disabled: boolean;
  faceDisabled: boolean;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  onCancelSelection(): void;
  onFlip(): void;
  onMirrorCopyHorizontal(): void;
  onMirrorCopyVertical(): void;
  onFaceRotate(): void;
  onOpenWeaponAnimation(): void;
  onStartWeaponAnimation(): void;
  onStopWeaponAnimation(): void;
  onRestartWeaponAnimation(): void;
}

export function EditToolbar({
  disabled,
  faceDisabled,
  bodyAnimationLabel,
  bodyAnimationPlaying,
  onCancelSelection,
  onFlip,
  onMirrorCopyHorizontal,
  onMirrorCopyVertical,
  onFaceRotate,
  onOpenWeaponAnimation,
  onStartWeaponAnimation,
  onStopWeaponAnimation,
  onRestartWeaponAnimation
}: EditToolbarProps) {
  return (
    <div className="tool-row" aria-label={t('edit.iconToolbar')}>
      <div className="tool">
        <button
          type="button"
          className="tool-icon-btn"
          data-testid="toolbar-deselect-button"
          disabled={disabled}
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
          className="tool-icon-btn tool-icon-face"
          data-testid="toolbar-face-rotate-button"
          disabled={faceDisabled}
          onClick={onFaceRotate}
          aria-label={t('edit.face')}
          title={t('edit.face')}
        >
          <span className="material-icons face-mat-icon" aria-hidden="true">
            face
          </span>
        </button>
      </div>
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
    </div>
  );
}
