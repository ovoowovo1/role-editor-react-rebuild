import { useRef } from 'react';
import { t } from '../../i18n';
import type { ExtraToolMode } from './extraPanelModels';

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`extra-dropzone ${file ? 'has-file' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onAcceptFile(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          onAcceptFile(event.target.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {visiblePreview ? (
        <img src={visiblePreview} alt="" />
      ) : (
        <span className="extra-dropzone-empty">{t('extra.upload')}</span>
      )}
      <button type="button" className="extra-upload-button" onClick={() => inputRef.current?.click()}>
        {file ? t('extra.replace') : t('extra.chooseImage')}
      </button>
    </div>
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
