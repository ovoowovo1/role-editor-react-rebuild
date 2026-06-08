import { t } from '../../i18n';
import type { TransformValues } from '../../types/role';
import { RangeControl } from './RangeControl';

interface TransformRangePanelProps {
  disabled: boolean;
  editValues: TransformValues;
  positionRange: number;
  selectionScaleMin: number;
  selectionScaleMax: number;
  selectionRatioMin: number;
  selectionRatioMax: number;
  onBeginTransient(): void;
  onCommitTransient(): void;
  onTransformChange(patch: Partial<TransformValues>, commit?: boolean): void;
}

export function TransformRangePanel({
  disabled,
  editValues,
  positionRange,
  selectionScaleMin,
  selectionScaleMax,
  selectionRatioMin,
  selectionRatioMax,
  onBeginTransient,
  onCommitTransient,
  onTransformChange
}: TransformRangePanelProps) {
  const pr = Math.max(1, positionRange);

  return (
    <div className="range-root">
      <RangeControl
        label={t('edit.rotate')}
        testId="transform-rotate"
        value={editValues.rotate}
        min={-180}
        max={180}
        step={0.25}
        disabled={disabled}
        //hint="C / V"
        onBegin={onBeginTransient}
        onCommit={onCommitTransient}
        onChange={(rotate, commit) => onTransformChange({ rotate }, commit)}
      />
      <RangeControl
        label={t('edit.scale')}
        testId="transform-scale"
        value={editValues.scale}
        min={selectionScaleMin}
        max={selectionScaleMax}
        step={0.001}
        disabled={disabled}
        //hint="Z / X"
        onBegin={onBeginTransient}
        onCommit={onCommitTransient}
        onChange={(scale, commit) => onTransformChange({ scale }, commit)}
      />
      <RangeControl
        label={t('edit.ratio')}
        testId="transform-ratio"
        value={editValues.ratio}
        min={selectionRatioMin}
        max={selectionRatioMax}
        step={0.001}
        disabled={disabled}
        //hint="Shift+Z / Shift+X"
        onBegin={onBeginTransient}
        onCommit={onCommitTransient}
        onChange={(ratio, commit) => onTransformChange({ ratio }, commit)}
      />
      <div className="position-row">
        <RangeControl
          label={t('edit.posX')}
          testId="transform-pos-x"
          value={editValues.posX}
          min={-pr}
          max={pr}
          step={0.1}
          disabled={disabled}
          onBegin={onBeginTransient}
          onCommit={onCommitTransient}
          numberMin={null}
          numberMax={null}
          onChange={(posX, commit) => onTransformChange({ posX }, commit)}
        />
        <RangeControl
          label={t('edit.posY')}
          testId="transform-pos-y"
          value={editValues.posY}
          min={-pr}
          max={pr}
          step={0.1}
          disabled={disabled}
          onBegin={onBeginTransient}
          onCommit={onCommitTransient}
          numberMin={null}
          numberMax={null}
          onChange={(posY, commit) => onTransformChange({ posY }, commit)}
        />
      </div>
    </div>
  );
}
