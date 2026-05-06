import type { TransformValues } from '../types/role';

interface EditControlsProps {
  disabled: boolean;
  faceAlwaysEnabled?: boolean;
  editValues: TransformValues;
  selectedCount: number;
  bodyAnimationLabel: string;
  bodyAnimationPlaying: boolean;
  stageScale: number;
  positionRange: number;
  stageMinScale: number;
  stageMaxScale: number;
  /** Deco scale slider range (head deco uses 1..2 in the original). */
  selectionScaleMin: number;
  selectionScaleMax: number;
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
  onStageScaleChange(scale: number): void;
}

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  hint?: string;
  onBegin(): void;
  onCommit(): void;
  onChange(value: number, commit?: boolean): void;
}

function RangeControl({ label, value, min, max, step, disabled, hint, onBegin, onCommit, onChange }: RangeControlProps) {
  return (
    <label className="range-box">
      <span className="range-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onPointerDown={onBegin}
        onPointerUp={onCommit}
        onBlur={onCommit}
        onChange={(event) => onChange(Number(event.target.value), false)}
      />
      <input
        className="number-box"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onFocus={onBegin}
        onBlur={onCommit}
        onChange={(event) => onChange(Number(event.target.value), false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
      />
      {hint ? <span className="range-hint">{hint}</span> : null}
    </label>
  );
}

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
  const pr = Math.max(1, positionRange);
  const faceDisabled = faceAlwaysEnabled ? false : disabled;
  return (
    <section className={`edit-function ${disabled ? 'disabled' : ''}`} aria-label="Edit controls">
      <div className="tool-row" aria-label="Icon toolbar">
        <div className="tool">
          <button
            type="button"
            className="tool-icon-btn"
            disabled={disabled}
            onClick={onCancelSelection}
            aria-label="取消選取"
            title="取消選取"
          >
            <span className="material-icons" aria-hidden="true">
              touch_app
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            disabled={disabled}
            onClick={onFlip}
            aria-label="水平翻轉"
            title="水平翻轉"
          >
            <span className="material-icons" aria-hidden="true">
              flip
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            disabled={disabled}
            onClick={onMirrorCopyHorizontal}
            aria-label="Mirror Copy Horizontal (左右鏡像)"
            title="Mirror Copy Horizontal (左右鏡像)"
          >
            <span className="material-icons" aria-hidden="true">
              swap_horiz
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            disabled={disabled}
            onClick={onMirrorCopyVertical}
            aria-label="Mirror Copy Vertical (上下鏡像)"
            title="Mirror Copy Vertical (上下鏡像)"
          >
            <span className="material-icons" aria-hidden="true">
              swap_vert
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn tool-icon-face"
            disabled={faceDisabled}
            onClick={onFaceRotate}
            aria-label="Face（對齊舊版占位）"
            title="Face"
          >
            <span className="material-icons face-mat-icon" aria-hidden="true">
              face
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            onClick={onOpenWeaponAnimation}
            aria-label={`Weapon Animation: ${bodyAnimationLabel}`}
            title={`Weapon Animation: ${bodyAnimationLabel}`}
          >
            <span className="material-icons" aria-hidden="true">
              sports_martial_arts
            </span>
          </button>
        </div>
        <div className="tool playback-tool" aria-label="Weapon animation playback">
          <button
            type="button"
            className="tool-icon-btn"
            disabled={bodyAnimationPlaying}
            onClick={onStartWeaponAnimation}
            aria-label="Start weapon animation"
            title="Start"
          >
            <span className="material-icons" aria-hidden="true">
              play_arrow
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            disabled={!bodyAnimationPlaying}
            onClick={onStopWeaponAnimation}
            aria-label="Stop weapon animation"
            title="Stop"
          >
            <span className="material-icons" aria-hidden="true">
              stop
            </span>
          </button>
          <button
            type="button"
            className="tool-icon-btn"
            onClick={onRestartWeaponAnimation}
            aria-label="Restart weapon animation"
            title="Restart"
          >
            <span className="material-icons" aria-hidden="true">
              replay
            </span>
          </button>
        </div>
      </div>

      <div className="range-root">
        <RangeControl
          label="Rotate"
          value={editValues.rotate}
          min={-180}
          max={180}
          step={0.25}
          disabled={disabled}
          hint="C / V"
          onBegin={onBeginTransient}
          onCommit={onCommitTransient}
          onChange={(rotate, commit) => onTransformChange({ rotate }, commit)}
        />
        <RangeControl
          label="Scale"
          value={editValues.scale}
          min={selectionScaleMin}
          max={selectionScaleMax}
          step={0.001}
          disabled={disabled}
          hint="Z / X"
          onBegin={onBeginTransient}
          onCommit={onCommitTransient}
          onChange={(scale, commit) => onTransformChange({ scale }, commit)}
        />
        <RangeControl
          label="Ratio"
          value={editValues.ratio}
          min={0.001}
          max={2}
          step={0.01}
          disabled={disabled}
          hint="Shift+Z / Shift+X"
          onBegin={onBeginTransient}
          onCommit={onCommitTransient}
          onChange={(ratio, commit) => onTransformChange({ ratio }, commit)}
        />
        <div className="position-row">
          <RangeControl
            label="Pos X"
            value={editValues.posX}
            min={-pr}
            max={pr}
            step={0.5}
            disabled={disabled}
            onBegin={onBeginTransient}
            onCommit={onCommitTransient}
            onChange={(posX, commit) => onTransformChange({ posX }, commit)}
          />
          <RangeControl
            label="Pos Y"
            value={editValues.posY}
            min={-pr}
            max={pr}
            step={0.5}
            disabled={disabled}
            onBegin={onBeginTransient}
            onCommit={onCommitTransient}
            onChange={(posY, commit) => onTransformChange({ posY }, commit)}
          />
        </div>
      </div>

      <div className="stage-control-row">
        <span>{selectedCount ? `${selectedCount} selected` : 'No layer selected'}</span>
        <button type="button" disabled={stageScale <= stageMinScale} onClick={() => onStageScaleChange(stageScale - 1)}>
          − Stage
        </button>
        <strong>{stageScale}×</strong>
        <button type="button" disabled={stageScale >= stageMaxScale} onClick={() => onStageScaleChange(stageScale + 1)}>
          + Stage
        </button>
      </div>
    </section>
  );
}
