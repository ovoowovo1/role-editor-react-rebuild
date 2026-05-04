import type { TransformValues } from '../types/role';

interface EditControlsProps {
  disabled: boolean;
  editValues: TransformValues;
  clipboardCount: number;
  selectedCount: number;
  stageScale: number;
  positionRange: number;
  stageMinScale: number;
  stageMaxScale: number;
  /** Deco scale slider range (head deco uses 1..2 in the original). */
  selectionScaleMin: number;
  selectionScaleMax: number;
  onBeginTransient(): void;
  onCommitTransient(): void;
  onTransformChange(patch: Partial<TransformValues>, commit?: boolean): void;
  onFlip(): void;
  onShow(): void;
  onHide(): void;
  onDelete(): void;
  onCopy(): void;
  onPaste(): void;
  onMoveTop(): void;
  onMoveBottom(): void;
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
  editValues,
  clipboardCount,
  selectedCount,
  stageScale,
  positionRange,
  stageMinScale,
  stageMaxScale,
  selectionScaleMin,
  selectionScaleMax,
  onBeginTransient,
  onCommitTransient,
  onTransformChange,
  onFlip,
  onShow,
  onHide,
  onDelete,
  onCopy,
  onPaste,
  onMoveTop,
  onMoveBottom,
  onStageScaleChange
}: EditControlsProps) {
  const pr = Math.max(1, positionRange);
  return (
    <section className={`edit-function ${disabled ? 'disabled' : ''}`} aria-label="Edit controls">
      <div className="tool-row">
        <button type="button" disabled={disabled} onClick={onFlip} title="Flip selected layer horizontally">
          Flip
        </button>
        <button type="button" disabled={disabled} onClick={onShow} title="Show selected layers">
          Show
        </button>
        <button type="button" disabled={disabled} onClick={onHide} title="Hide selected layers">
          Hide
        </button>
        <button type="button" disabled={disabled} onClick={onMoveTop} title="Move selected layers to top">
          Top
        </button>
        <button type="button" disabled={disabled} onClick={onMoveBottom} title="Move selected layers to bottom">
          Bottom
        </button>
        <button type="button" disabled={disabled} onClick={onCopy} title="Copy selected layers">
          Copy
        </button>
        <button type="button" disabled={!clipboardCount} onClick={onPaste} title="Paste copied layers">
          Paste{clipboardCount ? ` (${clipboardCount})` : ''}
        </button>
        <button type="button" className="danger" disabled={disabled} onClick={onDelete} title="Delete selected layers">
          Delete
        </button>
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
