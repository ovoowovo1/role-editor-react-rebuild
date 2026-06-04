import { t } from '../../i18n';
import type { ImageToDecoProgress } from '../../lib/conversion/imageToDeco';
import type { ExtraStatItem, ExtraToolMode } from './extraPanelModels';
import { progressLabel, progressPercent } from './extraPanelModels';

interface ExtraActionBarProps {
  toolMode: ExtraToolMode;
  canConvert: boolean;
  converting: boolean;
  canInsert: boolean;
  inserted: boolean;
  canBrushFill: boolean;
  brushFilling: boolean;
  onConvert(): void;
  onInsert(): void;
  onBrushFill(): void;
}

export function ExtraActionBar({
  toolMode,
  canConvert,
  converting,
  canInsert,
  inserted,
  canBrushFill,
  brushFilling,
  onConvert,
  onInsert,
  onBrushFill
}: ExtraActionBarProps) {
  if (toolMode === 'image') {
    return (
      <div className="extra-actions">
        <button type="button" className="primary-button save" disabled={!canConvert} onClick={onConvert}>
          {converting ? t('extra.converting') : t('extra.convert')}
        </button>
        <button type="button" className="primary-button" disabled={!canInsert} onClick={onInsert}>
          {inserted ? t('extra.inserted') : t('extra.insert')}
        </button>
      </div>
    );
  }

  return (
    <div className="extra-actions">
      <button type="button" className="primary-button save" disabled={!canBrushFill} onClick={onBrushFill}>
        {brushFilling ? t('extra.brush.filling') : t('extra.brush.fill')}
      </button>
    </div>
  );
}

interface ExtraProgressViewProps {
  progress: ImageToDecoProgress | null;
  active: boolean;
}

export function ExtraProgressView({ progress, active }: ExtraProgressViewProps) {
  if (!active && !progress) return null;
  const progressValue = progressPercent(progress);

  return (
    <div className="extra-progress" aria-live="polite">
      <div>
        <span>{progressLabel(progress, t)}</span>
        <strong>{progressValue}%</strong>
      </div>
      <i style={{ width: `${progressValue}%` }} />
    </div>
  );
}

interface ExtraStatsViewProps {
  items: ExtraStatItem[] | null;
}

export function ExtraStatsView({ items }: ExtraStatsViewProps) {
  if (!items) return null;
  return (
    <div className="extra-stats">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

interface ExtraWarningsProps {
  warnings?: string[];
}

export function ExtraWarnings({ warnings }: ExtraWarningsProps) {
  if (!warnings?.length) return null;
  return (
    <div className="extra-message warning">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}
