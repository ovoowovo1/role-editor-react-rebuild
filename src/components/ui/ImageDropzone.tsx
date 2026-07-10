import { useRef, type KeyboardEvent } from 'react';

interface ImageDropzoneProps {
  accept?: string;
  actionLabel: string;
  className?: string;
  disabled?: boolean;
  emptyLabel: string;
  previewUrl?: string | null;
  previewAlt?: string;
  onSelect(file: File | null | undefined): void;
}

export function ImageDropzone({
  accept = 'image/*',
  actionLabel,
  className = '',
  disabled = false,
  emptyLabel,
  previewUrl,
  previewAlt = '',
  onSelect
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPicker();
  };

  return (
    <div
      className={`extra-dropzone image-dropzone ${previewUrl ? 'has-file' : ''} ${disabled ? 'disabled' : ''} ${className}`.trim()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={actionLabel}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        onSelect(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(event) => {
          onSelect(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {previewUrl ? <img src={previewUrl} alt={previewAlt} /> : <span className="extra-dropzone-empty">{emptyLabel}</span>}
      <span className="extra-upload-button" aria-hidden="true">
        {actionLabel}
      </span>
    </div>
  );
}
