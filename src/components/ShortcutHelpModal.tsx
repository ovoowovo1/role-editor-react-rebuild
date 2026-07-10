import { t } from '../i18n';
import { Modal } from './ui/Modal';

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('shortcuts.title')}
      subtitle={t('shortcuts.macHint')}
      closeLabel={t('shortcuts.close')}
      size="large"
      contentClassName="shortcut-modal-content"
      titleId="shortcut-modal-title"
    >
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
    </Modal>
  );
}
