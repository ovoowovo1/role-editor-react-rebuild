import { t } from '../../i18n';
import type { ReferenceImageLayer } from '../../types/referenceImage';
import { RangeControl } from './RangeControl';

interface ReferenceImageControlsProps {
  image: ReferenceImageLayer;
  positionRange: number;
  onBegin(): void;
  onCommit(): void;
  onChange(patch: { x?: number; y?: number; scale?: number; opacity?: number }, commit?: boolean): void;
}

export function ReferenceImageControls({ image, positionRange, onBegin, onCommit, onChange }: ReferenceImageControlsProps) {
  const range = Math.max(1, positionRange);
  return (
    <div className="range-root reference-image-controls">
      <RangeControl label={t('referenceImage.opacity')} testId="reference-image-opacity" value={image.opacity} min={0} max={1} step={0.01} disabled={false} onBegin={onBegin} onCommit={onCommit} onChange={(opacity, commit) => onChange({ opacity }, commit)} />
      <RangeControl label={t('referenceImage.scale')} testId="reference-image-scale" value={image.scale} min={0.05} max={8} step={0.01} disabled={false} onBegin={onBegin} onCommit={onCommit} onChange={(scale, commit) => onChange({ scale }, commit)} />
      <div className="position-row">
        <RangeControl label={t('referenceImage.posX')} testId="reference-image-pos-x" value={image.x} min={-range} max={range} step={0.1} disabled={false} numberMin={null} numberMax={null} onBegin={onBegin} onCommit={onCommit} onChange={(x, commit) => onChange({ x }, commit)} />
        <RangeControl label={t('referenceImage.posY')} testId="reference-image-pos-y" value={image.y} min={-range} max={range} step={0.1} disabled={false} numberMin={null} numberMax={null} onBegin={onBegin} onCommit={onCommit} onChange={(y, commit) => onChange({ y }, commit)} />
      </div>
    </div>
  );
}
