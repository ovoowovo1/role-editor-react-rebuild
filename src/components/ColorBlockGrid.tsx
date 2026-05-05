import { useMemo } from 'react';
import { findOptionByCode } from '../mock/options';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import { AssetPreview } from './AssetPreview';

interface ColorBlockGridProps {
  presets: ColorBlockPreset[];
  onPick(preset: ColorBlockPreset): void;
}

export function ColorBlockGrid({ presets, onPick }: ColorBlockGridProps) {
  const previewOptionsByPreset = useMemo(
    () =>
      new Map(
        presets.map((preset) => {
          const options = preset.deco
            .map((item) => findOptionByCode('deco', item.c))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
          const unique = options.filter((item, index) => options.findIndex((other) => other.code === item.code) === index);
          return [preset.id, unique.slice(0, 4)] as const;
        })
      ),
    [presets]
  );

  return (
    <section className="choice-list" aria-label="Color Block choices">
      <div className="choice-list-header">
        <strong>Color Block</strong>
        <span>{presets.length} blocks</span>
      </div>
      <div className="choice-virtual-space" style={{ height: Math.max(520, presets.length * 118) }}>
        <div className="choice-row" style={{ transform: 'translateY(0)', height: Math.max(118, presets.length * 118), flexWrap: 'wrap' }}>
          {presets.map((preset) => {
            const previewOptions = previewOptionsByPreset.get(preset.id) ?? [];
            return (
              <button
                type="button"
                key={preset.id}
                className="choice-block color-block-choice"
                title={`${preset.label} (${preset.deco.length} decos)`}
                onClick={() => onPick(preset)}
                style={{ height: 108 }}
              >
                <span
                  className="color-block-swatch"
                  style={{
                    width: 54,
                    height: 32,
                    borderRadius: 8,
                    background: preset.color,
                    border: '1px solid rgba(255,255,255,0.45)',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)'
                  }}
                />
                <span style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: 64, justifyItems: 'center' }}>
                  {previewOptions.map((option) => (
                    <AssetPreview key={option.id} option={option} size={18} />
                  ))}
                </span>
                <span>{preset.label}</span>
                <small className="asset-source-badge">{preset.deco.length} decos</small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
