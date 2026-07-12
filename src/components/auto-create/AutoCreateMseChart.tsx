import { lazy, Suspense, useMemo } from 'react';
import { t } from '../../i18n';
import type { AutoCreateTwroleProgress } from '../../lib/conversion/autoCreateTwrole';
import { formatNumber } from './autoCreatePanelUtils';

export const MAX_MSE_HISTORY_POINTS = 240;

let chartCanvasModulePromise: Promise<typeof import('./AutoCreateMseChartCanvas')> | null = null;

function loadAutoCreateMseChartCanvas() {
  chartCanvasModulePromise ??= import('./AutoCreateMseChartCanvas');
  return chartCanvasModulePromise;
}

/** Starts loading Chart.js without mounting a canvas. */
export function preloadAutoCreateMseChartCanvas(): void {
  void loadAutoCreateMseChartCanvas();
}

const LazyAutoCreateMseChartCanvas = lazy(loadAutoCreateMseChartCanvas);

export interface MseHistoryPoint {
  key: string;
  label: string;
  stage: AutoCreateTwroleProgress['stage'];
  step: number;
  mse: number;
}

export function shouldRecordMseProgress(progress: AutoCreateTwroleProgress): boolean {
  return (progress.stage === 'run' || progress.stage === 'final') && Number.isFinite(progress.mse);
}

function mseHistoryKey(progress: AutoCreateTwroleProgress): string {
  return `${progress.stage}:${progress.step}:${progress.mse.toPrecision(12)}`;
}

export function mseHistoryPoint(progress: AutoCreateTwroleProgress): MseHistoryPoint {
  return {
    key: mseHistoryKey(progress),
    label: `${progress.stage} ${progress.step}`,
    stage: progress.stage,
    step: progress.step,
    mse: progress.mse
  };
}

interface AutoCreateMseChartProps {
  points: MseHistoryPoint[];
}

export function AutoCreateMseChart({ points }: AutoCreateMseChartProps) {
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let min = points[0].mse;
    let max = points[0].mse;
    for (const point of points) {
      min = Math.min(min, point.mse);
      max = Math.max(max, point.mse);
    }
    return {
      latest: points[points.length - 1].mse,
      min,
      max
    };
  }, [points]);

  return (
    <div
      className="auto-create-mse-chart"
      aria-label={t('autoCreate.mseChart.title')}
      data-testid="auto-create-mse-chart"
    >
      <div className="auto-create-mse-chart-header">
        <strong>{t('autoCreate.mseChart.title')}</strong>
        {stats ? (
          <span>
            {t('autoCreate.mseChart.latest')} {formatNumber(stats.latest, 6)}
          </span>
        ) : null}
      </div>
      {stats ? (
        <>
          <Suspense
            fallback={(
              <div
                className="auto-create-mse-chart-canvas"
                data-testid="auto-create-mse-chart-loading"
                aria-hidden="true"
              />
            )}
          >
            <LazyAutoCreateMseChartCanvas points={points} />
          </Suspense>
          <div className="auto-create-mse-chart-stats">
            <span>
              {t('autoCreate.mseChart.min')} {formatNumber(stats.min, 6)}
            </span>
            <span>
              {t('autoCreate.mseChart.max')} {formatNumber(stats.max, 6)}
            </span>
          </div>
        </>
      ) : (
        <div className="auto-create-mse-chart-empty" data-testid="auto-create-mse-chart-empty">
          {t('autoCreate.mseChart.empty')}
        </div>
      )}
    </div>
  );
}
