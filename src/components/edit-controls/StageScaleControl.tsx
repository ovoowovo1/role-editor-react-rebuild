import { t } from '../../i18n';

interface StageScaleControlProps {
  selectedCount: number;
  stageScale: number;
  stageMinScale: number;
  stageMaxScale: number;
  onStageScaleChange(scale: number): void;
}

export function StageScaleControl({
  selectedCount,
  stageScale,
  stageMinScale,
  stageMaxScale,
  onStageScaleChange
}: StageScaleControlProps) {
  return (
    <div className="stage-control-row">
      <span data-testid="selected-count-label">{selectedCount ? t('edit.selectedCount', { count: selectedCount }) : t('edit.noLayer')}</span>
      <button
        type="button"
        data-testid="stage-scale-minus-button"
        disabled={stageScale <= stageMinScale}
        onClick={() => onStageScaleChange(stageScale - 1)}
      >
        {t('edit.stageMinus')}
      </button>
      <strong data-testid="stage-scale-value">{stageScale}?</strong>
      <button
        type="button"
        data-testid="stage-scale-plus-button"
        disabled={stageScale >= stageMaxScale}
        onClick={() => onStageScaleChange(stageScale + 1)}
      >
        {t('edit.stagePlus')}
      </button>
    </div>
  );
}
