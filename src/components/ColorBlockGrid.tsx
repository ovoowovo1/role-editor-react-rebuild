import { useMemo, type CSSProperties } from 'react';
import { t } from '../i18n';
import { findOptionByCode } from '../mock/options';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import { AssetPreview } from './AssetPreview';

interface ColorBlockGridProps {
  presets: ColorBlockPreset[];
  loading?: boolean;
  error?: string | null;
  onPick(preset: ColorBlockPreset): void;
}

export function ColorBlockGrid({ presets, loading = false, error, onPick }: ColorBlockGridProps) {
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
    <section className="choice-list" aria-label={t('colorBlock.choices')}>
      <div className="choice-list-header">
        <strong>{t('colorBlock.title')}</strong>
        <span>{loading ? t('colorBlock.loading') : t('colorBlock.count', { count: presets.length })}</span>
      </div>
      {error ? <div className="choice-empty-state">{error}</div> : null}
      <div className="color-block-grid">
        {presets.map((preset) => {
          const previewOptions = previewOptionsByPreset.get(preset.id) ?? [];
          return (
            <button
              type="button"
              key={preset.id}
              className="choice-block color-block-choice"
              title={`${preset.label} (${t('colorBlock.decoCount', { count: preset.deco.length })})`}
              onClick={() => onPick(preset)}
            >
              <span
                className="color-block-swatch"
                style={{ '--color-block-swatch': preset.color } as CSSProperties}
              />
              <span className="color-block-preview-row">
                {previewOptions.map((option) => (
                  <AssetPreview key={option.id} option={option} size={18} />
                ))}
              </span>
              <span className="choice-label">{preset.label}</span>
              <small className="asset-source-badge">{t('colorBlock.decoCount', { count: preset.deco.length })}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
