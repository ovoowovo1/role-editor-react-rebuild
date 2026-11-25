import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject
} from 'react';

type FocusableElement = HTMLElement & { focus(options?: FocusOptions): void };

export type ModalSize = 'small' | 'medium' | 'large';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose(): void;
  closeLabel: string;
  className?: string;
  contentClassName?: string;
  footer?: ReactNode;
  headerActions?: ReactNode;
  initialFocusRef?: RefObject<FocusableElement | null>;
  showCloseButton?: boolean;
  size?: ModalSize;
  titleId?: string;
}

function isOutsideDialog(clientX: number, clientY: number, dialog: HTMLDialogElement): boolean {
  const rect = dialog.getBoundingClientRect();
  return clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom;
}

export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  closeLabel,
  className = '',
  contentClassName = '',
  footer,
  headerActions,
  initialFocusRef,
  showCloseButton = true,
  size = 'medium',
  titleId
}: ModalProps) {
  const generatedTitleId = useId();
  const generatedSubtitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      const focusTarget = initialFocusRef?.current ?? closeButtonRef.current;
      if (focusTarget) {
        window.setTimeout(() => focusTarget.focus({ preventScroll: true }), 0);
      }
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
  }, [initialFocusRef, open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    if (typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype) return;

    let pressedOutside = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutsideDialog(event.clientX, event.clientY, dialog);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutsideDialog(event.clientX, event.clientY, dialog)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size} ${className}`.trim()}
      aria-labelledby={resolvedTitleId}
      aria-describedby={subtitle ? generatedSubtitleId : undefined}
      {...({ closedby: 'any' } as Record<string, string>)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <header className="modal-header">
        <div className="modal-heading">
          <strong id={resolvedTitleId}>{title}</strong>
          {subtitle ? <span id={generatedSubtitleId}>{subtitle}</span> : null}
        </div>
        <div className="modal-header-actions">
          {headerActions}
          {showCloseButton ? (
            <button ref={closeButtonRef} type="button" className="button button--secondary" onClick={onClose}>
              {closeLabel}
            </button>
          ) : null}
        </div>
      </header>

      <div className={`modal-content ${contentClassName}`.trim()}>{children}</div>
      {footer ? <footer className="modal-footer">{footer}</footer> : null}
    </dialog>
  );
}
