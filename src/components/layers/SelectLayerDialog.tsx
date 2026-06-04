import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { t } from '../../i18n';
import { parseLayerNumberInput } from './layerListVirtualization';

interface SelectableLayerNumber {
  number: number;
  id: string;
}

interface SelectLayerDialogProps {
  open: boolean;
  selectableLayerNumbers: SelectableLayerNumber[];
  onConfirm(ids: string[]): void;
  onClose(): void;
}

export function SelectLayerDialog({
  open,
  selectableLayerNumbers,
  onConfirm,
  onClose
}: SelectLayerDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setInputError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    let numbers: number[];
    try {
      numbers = parseLayerNumberInput(inputValue);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : String(error));
      return;
    }

    const idByNumber = new Map(selectableLayerNumbers.map((item) => [item.number, item.id]));
    const missing = numbers.filter((number) => !idByNumber.has(number));
    if (!numbers.length) {
      setInputError(t('layers.enterOne'));
      return;
    }
    if (missing.length) {
      setInputError(t('layers.layerNotFound', { missing: missing.join(', ') }));
      return;
    }

    const ids = numbers.map((number) => idByNumber.get(number)).filter((id): id is string => Boolean(id));
    onConfirm(ids);
    setInputError('');
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') handleConfirm();
    if (event.key === 'Escape') onClose();
  };

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-items-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(420px, calc(100vw - 32px))',
          borderRadius: 12,
          border: '1px solid rgba(174, 244, 255, 0.45)',
          background: 'linear-gradient(#08384a, #02141d)',
          boxShadow: '0 18px 60px rgba(0, 0, 0, 0.45)',
          color: 'white',
          padding: 18
        }}
      >
        <h3 id="select-items-title" style={{ margin: '0 0 14px', fontSize: 18 }}>
          {t('layers.selectItems')}
        </h3>
        <label style={{ display: 'grid', gap: 8, fontSize: 13 }}>
          <span>{t('layers.itemNumbers')}</span>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              setInputError('');
            }}
            onKeyDown={handleInputKeyDown}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: 8,
              border: '1px solid rgba(174, 244, 255, 0.45)',
              background: 'rgba(0, 0, 0, 0.32)',
              color: 'white',
              outline: 'none',
              padding: '10px 12px'
            }}
          />
        </label>
        <p style={{ marginTop: 10, fontSize: '0.8em', color: 'rgba(232, 252, 255, 0.8)' }}>
          {t('layers.selectHelp')}
        </p>
        {inputError ? <p style={{ color: '#ffb4b4', fontSize: 12, marginTop: 8 }}>{inputError}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={onClose}>
            {t('layers.cancel')}
          </button>
          <button type="button" onClick={handleConfirm}>
            {t('layers.selectButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
