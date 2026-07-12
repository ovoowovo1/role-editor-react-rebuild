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
import { formatNumber } from './autoCreatePanelUtils';
import type { MseHistoryPoint } from './AutoCreateMseChart';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface AutoCreateMseChartCanvasProps {
  points: MseHistoryPoint[];
}

export default function AutoCreateMseChartCanvas({ points }: AutoCreateMseChartCanvasProps) {
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
    <div className="auto-create-mse-chart-canvas" data-testid="auto-create-mse-chart-canvas">
      <Line data={data} options={options} />
    </div>
  );
}
