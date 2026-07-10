import { useMemo } from 'react';
import { t } from '../i18n';
import {
  DEFAULT_ACTOR_BODY_ANIMATION_LABEL,
  getActorBodyAnimationOptions
} from '../lib/runtime/actorBodyAnimation';
import { Modal } from './ui/Modal';

interface WeaponAnimationModalProps {
  open: boolean;
  value: string;
  onChange(value: string): void;
  onClose(): void;
}

function formatFrameRange(startFrame: number, endFrame: number): string {
  return startFrame === endFrame ? String(startFrame) : `${startFrame}-${endFrame}`;
}

export function WeaponAnimationModal({ open, value, onChange, onClose }: WeaponAnimationModalProps) {
  const options = useMemo(() => getActorBodyAnimationOptions(), []);

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('weapon.title')}
      subtitle={value}
      closeLabel={t('weapon.close')}
      size="large"
      className="weapon-modal"
      contentClassName="weapon-modal-content"
      titleId="weapon-modal-title"
      headerActions={(
        <button
          type="button"
          className="button button--secondary"
          onClick={() => selectValue(DEFAULT_ACTOR_BODY_ANIMATION_LABEL)}
        >
          {t('weapon.default')}
        </button>
      )}
    >
      <div className="weapon-animation-list" role="listbox" aria-label={t('weapon.sequences')}>
        {options.map((option) => {
          const selected = option.label === value;
          return (
            <button
              key={option.label}
              type="button"
              role="option"
              aria-selected={selected}
              className={`weapon-animation-option ${selected ? 'selected' : ''}`}
              onClick={() => selectValue(option.label)}
            >
              <span>{option.label}</span>
              <small>{formatFrameRange(option.startFrame, option.endFrame)}</small>
            </button>
          );
        })}
        {options.length === 0 ? <p className="weapon-animation-empty">{t('weapon.noSequences')}</p> : null}
      </div>
    </Modal>
  );
}
