import { useMemo } from 'react';
import { t } from '../../i18n';
import type { PartOption } from '../../types/role';
import type { PinOutlineMaterial, PinOutlineSegmentType, PinOutlineState } from '../../types/pinOutline';

interface PinOutlinePanelProps {
  roleCamp: string;
  decoOptions: PartOption[];
  state: PinOutlineState;
  onToggleActive(): void;
  onClear(): void;
  onRemovePin(id: string): void;
  onReorderPins(fromIndex: number, toIndex: number): void;
  onUpdateSegment(index: number, patch: { type?: PinOutlineSegmentType; curvature?: number; formula?: string }): void;
  onAddMaterial(assetId: string): void;
  onRemoveMaterial(id: string): void;
  onSelectMaterial(id: string | null): void;
  onInsert(): void | Promise<void>;
}

export function PinOutlinePanel({
  roleCamp,
  decoOptions,
  state,
  onToggleActive,
  onClear,
  onRemovePin,
  onReorderPins,
  onUpdateSegment,
  onAddMaterial,
  onRemoveMaterial,
  onSelectMaterial,
  onInsert
}: PinOutlinePanelProps) {
  const materialOptions = useMemo(() => {
    if (roleCamp.trim()) return decoOptions;
    const candidates = decoOptions.filter((option) => {
      const code = option.code.toLowerCase();
      return code === 'third_deco_03' || code === 'royal_deco_56';
    });
    // Older manifests may not contain the named legacy assets. Keep the
    // control usable with the first few available options in that case.
    return candidates.length ? candidates : decoOptions.slice(0, 3);
  }, [decoOptions, roleCamp]);
  const selectedMaterial = state.materials.find((material) => material.id === state.selectedMaterialId) ?? null;

  return (
    <div className="pin-outline-panel" data-testid="pin-outline-panel">
      <div className="extra-actions">
        <button type="button" className={`primary-button ${state.active ? 'save' : ''}`} data-testid="pin-outline-toggle-button" onClick={onToggleActive}>
          {state.active ? t('extra.pinOutline.stop') : t('extra.pinOutline.start')}
        </button>
        <button type="button" className="primary-button" data-testid="pin-outline-clear-button" onClick={onClear} disabled={!state.pins.length && !state.materials.length}>
          {t('extra.pinOutline.clear')}
        </button>
        <button
          type="button"
          className="primary-button save"
          data-testid="pin-outline-insert-button"
          onClick={onInsert}
          disabled={state.pins.length < 3 || state.materials.length === 0}
        >
          {t('extra.pinOutline.insert')}
        </button>
      </div>
      <p className="extra-hint">{state.active ? t('extra.pinOutline.activeHelp') : t('extra.pinOutline.help')}</p>

      <div className="pin-outline-summary">
        <strong>{t('extra.pinOutline.pinCount', { count: state.pins.length })}</strong>
        <span>{state.pins.length < 3 ? t('extra.pinOutline.needMore') : t('extra.pinOutline.ready')}</span>
      </div>

      {state.pins.length ? (
        <ol className="pin-outline-pin-list">
          {state.pins.map((pin, index) => (
            <li key={pin.id} data-testid={`pin-outline-pin-${pin.id}`}>
              <span>{index + 1}. ({pin.x.toFixed(1)}, {pin.y.toFixed(1)})</span>
              <button type="button" className="layer-delete" onClick={() => onRemovePin(pin.id)} aria-label={t('extra.pinOutline.removePin', { index: index + 1 })}>×</button>
              {index > 0 ? <button type="button" className="pin-outline-reorder" onClick={() => onReorderPins(index, index - 1)}>{t('extra.pinOutline.moveUp')}</button> : null}
              {index < state.pins.length - 1 ? <button type="button" className="pin-outline-reorder" onClick={() => onReorderPins(index, index + 1)}>{t('extra.pinOutline.moveDown')}</button> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {state.pins.length >= 2 ? (
        <div className="pin-outline-segments">
          <strong>{t('extra.pinOutline.segments')}</strong>
          {state.pins.map((pin, index) => {
            const target = state.pins[(index + 1) % state.pins.length];
            const segment = state.segments[index] ?? { type: 'line' as const, curvature: 0.25, formula: '1' };
            return (
              <div key={`${pin.id}-${target.id}`} className="pin-outline-segment">
                <label>
                  <span>{index + 1} → {(index + 1) % state.pins.length + 1}</span>
                  <select value={segment.type} onChange={(event) => onUpdateSegment(index, { type: event.target.value as PinOutlineSegmentType })}>
                    <option value="line">{t('extra.pinOutline.line')}</option>
                    <option value="quadratic">{t('extra.pinOutline.quadratic')}</option>
                    <option value="formula">{t('extra.pinOutline.formula')}</option>
                  </select>
                </label>
                {segment.type === 'quadratic' ? (
                  <label>
                    <span>{t('extra.pinOutline.curvature')}</span>
                    <input type="range" min={-1} max={1} step={0.01} value={segment.curvature} onChange={(event) => onUpdateSegment(index, { curvature: Number(event.target.value) })} />
                  </label>
                ) : null}
                {segment.type === 'formula' ? (
                  <label>
                    <span>f(t)</span>
                    <input value={segment.formula} onChange={(event) => onUpdateSegment(index, { formula: event.target.value })} placeholder="sin(pi*t)" />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="pin-outline-materials">
        <label>
          <span>{t('extra.pinOutline.material')}</span>
          <select data-testid="pin-outline-material-select" value="" onChange={(event) => { if (event.target.value) onAddMaterial(event.target.value); }}>
            <option value="">{t('extra.pinOutline.chooseMaterial')}</option>
            {materialOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        {!roleCamp.trim() ? <p className="extra-hint">{t('extra.pinOutline.singleMaterial')}</p> : null}
        {state.materials.map((material) => (
          <MaterialControl
            key={material.id}
            material={material}
            option={materialOptions.find((item) => item.id === material.assetId)}
            selected={material.id === state.selectedMaterialId}
            onSelect={() => onSelectMaterial(material.id)}
            onRemove={() => onRemoveMaterial(material.id)}
          />
        ))}
        {selectedMaterial ? <span className="extra-hint">{t('extra.pinOutline.selectedMaterial', { name: materialOptions.find((item) => item.id === selectedMaterial.assetId)?.label ?? selectedMaterial.assetId })}</span> : null}
      </div>
    </div>
  );
}

function MaterialControl({
  material,
  option,
  selected,
  onSelect,
  onRemove
}: {
  material: PinOutlineMaterial;
  option?: PartOption;
  selected: boolean;
  onSelect(): void;
  onRemove(): void;
}) {
  return (
    <div className={`pin-outline-material ${selected ? 'selected' : ''}`}>
      <button type="button" className="pin-outline-material-name" onClick={onSelect}>{option?.label ?? material.assetId}</button>
      <button type="button" className="layer-delete" onClick={onRemove} aria-label={t('extra.pinOutline.removeMaterial')}>×</button>
    </div>
  );
}
