import { useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_ACTOR_BODY_ANIMATION_LABEL,
  getActorBodyAnimationOptions
} from '../lib/actorBodyAnimation';

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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const options = useMemo(() => getActorBodyAnimationOptions(), []);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    onClose();
  };

  return (
    <div className="shortcut-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="shortcut-modal weapon-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weapon-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') onClose();
        }}
      >
        <div className="shortcut-header">
          <div>
            <strong id="weapon-modal-title">Weapon Animation</strong>
            <span>{value}</span>
          </div>
          <div className="weapon-modal-actions">
            <button
              type="button"
              className="shortcut-close"
              onClick={() => selectValue(DEFAULT_ACTOR_BODY_ANIMATION_LABEL)}
            >
              Default
            </button>
            <button ref={closeButtonRef} type="button" className="shortcut-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="weapon-animation-list" role="listbox" aria-label="Weapon animation sequences">
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
          {options.length === 0 ? <p className="weapon-animation-empty">No actor body sequences found.</p> : null}
        </div>
      </div>
    </div>
  );
}
