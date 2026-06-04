import type { RangeControlProps } from './types';

export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  disabled,
  hint,
  numberMin = min,
  numberMax = max,
  onBegin,
  onCommit,
  onChange
}: RangeControlProps) {
  const inputMin = numberMin === null ? undefined : numberMin;
  const inputMax = numberMax === null ? undefined : numberMax;

  return (
    <label className="range-box">
      <span className="range-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onPointerDown={onBegin}
        onPointerUp={onCommit}
        onBlur={onCommit}
        onChange={(event) => onChange(Number(event.target.value), false)}
      />
      <input
        className="number-box"
        type="number"
        min={inputMin}
        max={inputMax}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onFocus={onBegin}
        onBlur={onCommit}
        onChange={(event) => onChange(Number(event.target.value), false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
      />
      {hint ? <span className="range-hint">{hint}</span> : null}
    </label>
  );
}
