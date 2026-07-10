import { t } from '../../i18n';
import type { ExtraToolMode } from './extraPanelModels';
import { ImageDropzone } from '../ui/ImageDropzone';

interface ExtraModeSwitchProps {
  toolMode: ExtraToolMode;
  onChange(mode: ExtraToolMode): void;
}

export function ExtraModeSwitch({ toolMode, onChange }: ExtraModeSwitchProps) {
  return (
    <div className="extra-section extra-section-first">
      <div className="extra-segmented extra-mode-switch" role="group" aria-label={t('extra.mode')}>
        {(['image', 'brush'] as ExtraToolMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={toolMode === mode ? 'selected' : ''}
            onClick={() => onChange(mode)}
          >
            {t(`extra.mode.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ImageImportPanelProps {
  file: File | null;
  visiblePreview: string | null;
  onAcceptFile(file: File | undefined | null): void;
}

export function ImageImportPanel({ file, visiblePreview, onAcceptFile }: ImageImportPanelProps) {
  return (
    <ImageDropzone
      accept="image/png,image/jpeg,image/webp"
      previewUrl={visiblePreview}
      emptyLabel={t('extra.upload')}
      actionLabel={file ? t('extra.replace') : t('extra.chooseImage')}
      onSelect={onAcceptFile}
    />
  );
}

interface BrushFillPanelProps {
  active: boolean;
  hasBrushRange: boolean;
  pointCount: number;
  onActiveChange(active: boolean): void;
  onClear(): void;
}

export function BrushFillPanel({ active, hasBrushRange, pointCount, onActiveChange, onClear }: BrushFillPanelProps) {
  return (
    <div className="extra-brush-panel">
      <div>
        <strong>{hasBrushRange ? t('extra.brush.ready') : t('extra.brush.empty')}</strong>
        <span>{t('extra.brush.count', { count: pointCount })}</span>
      </div>
      <div className="extra-actions extra-brush-actions">
        <button
          type="button"
          className={`primary-button ${active ? 'save' : ''}`}
          onClick={() => onActiveChange(!active)}
        >
          {active ? t('extra.brush.stopDraw') : t('extra.brush.draw')}
        </button>
        <button type="button" className="primary-button" disabled={!hasBrushRange} onClick={onClear}>
          {t('extra.brush.clear')}
        </button>
      </div>
    </div>
  );
}
