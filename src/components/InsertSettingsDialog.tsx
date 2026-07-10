import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import type { InsertDraftSettings } from '../hooks/useRoleEditor';
import { Modal } from './ui/Modal';

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
  const [draft, setDraft] = useState(settings);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const validIndex = draft.placement !== 'after_index' || isValidAfterIndex(draft.index);

  const updateDraft = (patch: Partial<InsertDraftSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateScopes = (patch: Partial<InsertDraftSettings['scopes']>) => {
    setDraft((current) => ({ ...current, scopes: { ...current.scopes, ...patch } }));
  };

  const saveAndClose = () => {
    if (!validIndex) return;
    onChange(draft);
    onClose();
  };

  const indexHint = draft.placement === 'after_index'
    ? validIndex
      ? t('insert.newItemsBelow')
      : t('insert.enterInteger')
    : t('insert.enableBelow');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('insert.title')}
      closeLabel={t('insert.cancel')}
      size="small"
      titleId="insert-settings-title"
      initialFocusRef={firstInputRef}
      showCloseButton={false}
      footer={(
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>
            {t('insert.cancel')}
          </button>
          <button type="button" className="button button--primary" disabled={!validIndex} onClick={saveAndClose}>
            {t('insert.save')}
          </button>
        </>
      )}
    >
      <div className="dialog-form">
        <fieldset className="dialog-fieldset">
          <legend>{t('insert.target')}</legend>
          <label className="dialog-choice">
            <input
              ref={firstInputRef}
              type="radio"
              name="insert-placement"
              checked={draft.placement === 'top'}
              onChange={() => updateDraft({ placement: 'top' })}
            />
            <span>{t('insert.listTop')}</span>
          </label>
          <label className="dialog-choice">
            <input
              type="radio"
              name="insert-placement"
              checked={draft.placement === 'bottom'}
              onChange={() => updateDraft({ placement: 'bottom' })}
            />
            <span>{t('insert.listBottom')}</span>
          </label>
          <label className="dialog-choice">
            <input
              type="radio"
              name="insert-placement"
              checked={draft.placement === 'after_index'}
              onChange={() => updateDraft({ placement: 'after_index' })}
            />
            <span>{t('insert.belowIndex')}</span>
          </label>

          <label className="dialog-field">
            <span>{t('insert.visibleRow')}</span>
            <input
              className="form-input"
              type="number"
              min={1}
              step={1}
              value={draft.index}
              disabled={draft.placement !== 'after_index'}
              aria-invalid={!validIndex}
              aria-describedby="insert-index-hint"
              onChange={(event) => updateDraft({ index: event.target.value })}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') saveAndClose();
              }}
            />
            <small id="insert-index-hint" className={validIndex ? 'form-hint' : 'form-error'}>
              {indexHint}
            </small>
          </label>
        </fieldset>

        <fieldset className="dialog-fieldset">
          <legend>{t('insert.affectSources')}</legend>
          <label className="dialog-choice">
            <input
              type="checkbox"
              checked={draft.scopes.palette}
              onChange={() => updateScopes({ palette: !draft.scopes.palette })}
            />
            <span>{t('insert.scopePalette')}</span>
          </label>
          <label className="dialog-choice">
            <input
              type="checkbox"
              checked={draft.scopes.copy}
              onChange={() => updateScopes({ copy: !draft.scopes.copy })}
            />
            <span>{t('insert.scopeCopy')}</span>
          </label>
          <label className="dialog-choice">
            <input
              type="checkbox"
              checked={draft.scopes.mergeBatch}
              onChange={() => updateScopes({ mergeBatch: !draft.scopes.mergeBatch })}
            />
            <span>{t('insert.scopeMergeBatch')}</span>
          </label>
        </fieldset>
      </div>
    </Modal>
  );
}
