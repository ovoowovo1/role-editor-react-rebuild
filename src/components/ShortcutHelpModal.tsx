import { useEffect, useRef } from 'react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

export const SHORTCUT_ITEMS: ShortcutItem[] = [
  { keys: ['Ctrl', 'Z'], description: '復原' },
  { keys: ['Ctrl', 'Y'], description: '重做' },
  { keys: ['Ctrl', 'C'], description: '複製選取物件' },
  { keys: ['Ctrl', 'V'], description: '貼上已複製物件' },
  { keys: ['Ctrl', 'A'], description: '全選物件（含頭部）' },
  { keys: ['Ctrl', 'G'], description: '將選取物件建立群組' },
  { keys: ['Ctrl', 'Shift', ']'], description: '將選取物件移到最上層' },
  { keys: ['Ctrl', 'Shift', '['], description: '將選取物件移到最下層' },
  { keys: ['W / ↑'], description: '向上移動選取物件' },
  { keys: ['S / ↓'], description: '向下移動選取物件' },
  { keys: ['A / ←'], description: '向左移動選取物件' },
  { keys: ['D / →'], description: '向右移動選取物件' },
  { keys: ['C'], description: '順時針旋轉選取物件' },
  { keys: ['V'], description: '逆時針旋轉選取物件' },
  { keys: ['Z'], description: '放大選取物件' },
  { keys: ['X'], description: '縮小選取物件' },
  { keys: ['Shift', 'Z'], description: '增加長寬比' },
  { keys: ['Shift', 'X'], description: '降低長寬比' },
  { keys: ['Delete / Backspace'], description: '刪除選取物件' }
];

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
            <strong id="shortcut-modal-title">角色編輯器常用快捷鍵</strong>
            <span>macOS 可用 Cmd 取代 Ctrl</span>
          </div>
          <button ref={closeButtonRef} type="button" className="shortcut-close" onClick={onClose}>
            關閉
          </button>
        </div>
        <dl className="shortcut-grid">
          {SHORTCUT_ITEMS.map((item) => (
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
