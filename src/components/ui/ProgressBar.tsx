interface ProgressBarProps {
  value: number;
  className?: string;
  label?: string;
}

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function ProgressBar({ value, className = '', label }: ProgressBarProps) {
  const normalized = normalizeProgress(value);

  return (
    <div
      className={`progress-bar ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized)}
    >
      <span style={{ transform: `scaleX(${normalized / 100})` }} />
    </div>
  );
}
