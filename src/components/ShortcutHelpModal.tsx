import { useEffect, useRef } from 'react';
import { t } from '../i18n';

interface ShortcutItem {
  keys: string[];
  description: string;
}

export function getShortcutItems(): ShortcutItem[] {
  return [
    { keys: ['Ctrl', 'Z'], description: t('shortcuts.undo') },
    { keys: ['Ctrl', 'Y'], description: t('shortcuts.redo') },
    { keys: ['Ctrl', 'C'], description: t('shortcuts.copy') },
    { keys: ['Ctrl', 'V'], description: t('shortcuts.paste') },
    { keys: ['Ctrl', 'A'], description: t('shortcuts.selectAll') },
    { keys: ['Ctrl', 'G'], description: t('shortcuts.group') },
    { keys: ['Ctrl', 'Shift', ']'], description: t('shortcuts.moveTop') },
    { keys: ['Ctrl', 'Shift', '['], description: t('shortcuts.moveBottom') },
    { keys: ['W / ↑'], description: t('shortcuts.moveUp') },
    { keys: ['S / ↓'], description: t('shortcuts.moveDown') },
    { keys: ['A / ←'], description: t('shortcuts.moveLeft') },
    { keys: ['D / →'], description: t('shortcuts.moveRight') },
    { keys: ['C'], description: t('shortcuts.rotateCW') },
    { keys: ['V'], description: t('shortcuts.rotateCCW') },
    { keys: ['Z'], description: t('shortcuts.scaleUp') },
    { keys: ['X'], description: t('shortcuts.scaleDown') },
    { keys: ['Shift', 'Z'], description: t('shortcuts.ratioUp') },
    { keys: ['Shift', 'X'], description: t('shortcuts.ratioDown') },
    { keys: ['Delete / Backspace'], description: t('shortcuts.deleteSelected') }
  ];
}

function ShortcutKeys({ item }: { item: ShortcutItem }) {
  return (
    <>
      {item.keys.map((key, index) => (
        <span className="shortcut-key-part" key={`${item.description}-${key}-${index}`}>
          {index > 0 ? <span className="shortcut-plus">+</span> : null}
          <kbd>{key}</kbd>
        </span>
      ))}
    </>
  );
}

interface ShortcutHelpModalProps {
  open: boolean;
  onClose(): void;
}

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcut-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="shortcut-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-modal-title"
        data-shortcut-modal
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            onClose();
          }
        }}
      >
        <div className="shortcut-header">
          <div>
            <strong id="shortcut-modal-title">{t('shortcuts.title')}</strong>
            <span>{t('shortcuts.macHint')}</span>
          </div>
          <button ref={closeButtonRef} type="button" className="shortcut-close" onClick={onClose}>
            {t('shortcuts.close')}
          </button>
        </div>
        <dl className="shortcut-grid">
          {getShortcutItems().map((item) => (
            <div className="shortcut-row" key={`${item.keys.join('+')}-${item.description}`}>
              <dt>
                <ShortcutKeys item={item} />
              </dt>
              <dd>{item.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
