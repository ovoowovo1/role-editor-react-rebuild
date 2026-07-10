import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { t } from '../../i18n';
import { Modal } from '../ui/Modal';
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
    setInputValue('');
    setInputError('');
  }, [open]);

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
    onClose();
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') handleConfirm();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('layers.selectItems')}
      closeLabel={t('layers.cancel')}
      size="small"
      titleId="select-items-title"
      initialFocusRef={inputRef}
      showCloseButton={false}
      footer={(
        <>
          <button type="button" className="button button--secondary" onClick={onClose}>
            {t('layers.cancel')}
          </button>
          <button type="button" className="button button--primary" onClick={handleConfirm}>
            {t('layers.selectButton')}
          </button>
        </>
      )}
    >
      <div className="dialog-form">
        <label className="dialog-field">
          <span>{t('layers.itemNumbers')}</span>
          <input
            ref={inputRef}
            className="form-input"
            value={inputValue}
            aria-invalid={Boolean(inputError)}
            aria-describedby="select-layer-help select-layer-error"
            onChange={(event) => {
              setInputValue(event.target.value);
              setInputError('');
            }}
            onKeyDown={handleInputKeyDown}
          />
        </label>
        <p id="select-layer-help" className="form-hint">
          {t('layers.selectHelp')}
        </p>
        {inputError ? (
          <p id="select-layer-error" className="form-error" role="alert">
            {inputError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
