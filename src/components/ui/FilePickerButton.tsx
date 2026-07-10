import { useRef, type ReactNode } from 'react';

interface FilePickerButtonProps {
  accept?: string;
  buttonTestId?: string;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
  inputTestId?: string;
  onSelect(file: File): void;
}

export function FilePickerButton({
  accept,
  buttonTestId,
  className,
  children,
  disabled = false,
  inputTestId,
  onSelect
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        data-testid={inputTestId}
        hidden
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onSelect(file);
          event.currentTarget.value = '';
        }}
      />
      <button
        className={className}
        type="button"
        data-testid={buttonTestId}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
    </>
  );
}
