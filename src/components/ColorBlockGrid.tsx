import { useMemo } from 'react';
import { t } from '../i18n';
import type { ColorBlockPreset } from '../mock/colorBlocks';
import { AssetPreview } from './AssetPreview';
import { colorBlockPreviewOptions } from './auto-create/autoCreateColorBlockSources';

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
          return [preset.id, colorBlockPreviewOptions(preset)] as const;
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
                style={{
                  width: 54,
                  height: 32,
                  borderRadius: 8,
                  background: preset.color,
                  border: '1px solid rgba(255,255,255,0.45)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)'
                }}
              />
              <span className="color-block-preview-row">
                {previewOptions.map((option) => (
                  <AssetPreview key={option.id} option={option} size={18} />
                ))}
              </span>
              <span className="choice-label">{preset.label}</span>
              <small className="asset-source-badge">{preset.deco.length} decos</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
