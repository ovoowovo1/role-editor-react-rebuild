import { t } from '../i18n';
import type { InsertDraftSettings } from '../hooks/useRoleEditor';

interface InsertSettingsDialogProps {
  open: boolean;
  settings: InsertDraftSettings;
  onChange(settings: InsertDraftSettings): void;
  onClose(): void;
}

function isValidAfterIndex(value: string): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1;
}

export function InsertSettingsDialog({ open, settings, onChange, onClose }: InsertSettingsDialogProps) {
  const validIndex = settings.placement !== 'after_index' || isValidAfterIndex(settings.index);
  if (!open) return null;

  const updateSettings = (patch: Partial<InsertDraftSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const updateScopes = (patch: Partial<InsertDraftSettings['scopes']>) => {
    onChange({ ...settings, scopes: { ...settings.scopes, ...patch } });
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insert-settings-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(430px, calc(100vw - 32px))',
          borderRadius: 12,
          border: '1px solid rgba(174, 244, 255, 0.45)',
          background: 'linear-gradient(#08384a, #02141d)',
          boxShadow: '0 18px 60px rgba(0, 0, 0, 0.45)',
          color: 'white',
          padding: 18
        }}
      >
        <h3 id="insert-settings-title" style={{ margin: '0 0 14px', fontSize: 18 }}>
          {t('insert.title')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 320 }}>
          <strong>{t('insert.target')}</strong>
          <label>
            <input type="radio" checked={settings.placement === 'top'} onChange={() => updateSettings({ placement: 'top' })} /> {t('insert.listTop')}
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'bottom'} onChange={() => updateSettings({ placement: 'bottom' })} /> {t('insert.listBottom')}
          </label>
          <label>
            <input type="radio" checked={settings.placement === 'after_index'} onChange={() => updateSettings({ placement: 'after_index' })} /> {t('insert.belowIndex')}
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>{t('insert.visibleRow')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={settings.index}
              disabled={settings.placement !== 'after_index'}
              onChange={(event) => updateSettings({ index: event.target.value })}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' && validIndex) onClose();
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: 8,
                border: validIndex ? '1px solid rgba(174, 244, 255, 0.45)' : '1px solid #ff9c9c',
                background: 'rgba(0, 0, 0, 0.32)',
                color: 'white',
                padding: '10px 12px'
              }}
            />
            <small style={{ color: validIndex ? 'rgba(232, 252, 255, 0.75)' : '#ffb4b4' }}>
              {settings.placement === 'after_index'
                ? validIndex
                  ? t('insert.newItemsBelow')
                  : t('insert.enterInteger')
                : t('insert.enableBelow')}
            </small>
          </label>

          <strong>{t('insert.affectSources')}</strong>
          <label>
            <input type="checkbox" checked={settings.scopes.palette} onChange={() => updateScopes({ palette: !settings.scopes.palette })} /> {t('insert.scopePalette')}
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.copy} onChange={() => updateScopes({ copy: !settings.scopes.copy })} /> {t('insert.scopeCopy')}
          </label>
          <label>
            <input type="checkbox" checked={settings.scopes.mergeBatch} onChange={() => updateScopes({ mergeBatch: !settings.scopes.mergeBatch })} /> {t('insert.scopeMergeBatch')}
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" onClick={onClose}>{t('insert.cancel')}</button>
          <button type="button" disabled={!validIndex} onClick={onClose}>{t('insert.save')}</button>
        </div>
      </div>
    </div>
  );
}
