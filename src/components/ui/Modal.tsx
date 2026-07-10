import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

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

function getFocusableElements(container: HTMLElement): FocusableElement[] {
  return Array.from(container.querySelectorAll<FocusableElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = initialFocusRef?.current
      ?? closeButtonRef.current
      ?? (dialogRef.current ? getFocusableElements(dialogRef.current)[0] : null)
      ?? dialogRef.current;
    window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 0);

    return () => {
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal--${size} ${className}`.trim()}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={subtitle ? generatedSubtitleId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
          }

          if (event.key !== 'Tab' || !dialogRef.current) return;
          const focusable = getFocusableElements(dialogRef.current);
          if (!focusable.length) {
            event.preventDefault();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
          }
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
      </div>
    </div>
  );
}
