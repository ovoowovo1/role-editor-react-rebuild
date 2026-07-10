import { useMemo } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { t } from '../../i18n';
import type { AutoCreateTwroleProgress } from '../../lib/conversion/autoCreateTwrole';
import { formatNumber } from './autoCreatePanelUtils';

export const MAX_MSE_HISTORY_POINTS = 240;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

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

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: t('autoCreate.stat.mse'),
          data: points.map((point) => point.mse),
          borderColor: '#35d0ff',
          backgroundColor: 'rgba(53, 208, 255, 0.18)',
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: '#9cffb2',
          pointBorderColor: '#061622',
          pointBorderWidth: 1,
          pointHoverRadius: 4,
          pointRadius: points.length === 1 ? 3 : 0,
          tension: 0.25
        }
      ]
    }),
    [points]
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      animation: false,
      maintainAspectRatio: false,
      normalized: true,
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => `MSE ${formatNumber(Number(context.parsed.y), 6)}`
          },
          displayColors: false
        }
      },
      scales: {
        x: {
          display: false,
          grid: {
            display: false
          }
        },
        y: {
          border: {
            display: false
          },
          grid: {
            color: 'rgba(188, 239, 255, 0.12)'
          },
          ticks: {
            color: 'rgba(216, 248, 255, 0.72)',
            maxTicksLimit: 4,
            callback: (value) => formatNumber(Number(value), 5)
          }
        }
      }
    }),
    []
  );

  return (
    <div className="auto-create-mse-chart" aria-label={t('autoCreate.mseChart.title')}>
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
          <div className="auto-create-mse-chart-canvas">
            <Line data={data} options={options} />
          </div>
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
        <div className="auto-create-mse-chart-empty">{t('autoCreate.mseChart.empty')}</div>
      )}
    </div>
  );
}
