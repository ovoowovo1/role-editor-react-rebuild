import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AutoCreateTwroleProgress } from '../../lib/conversion/autoCreateTwrole';
import {
  AutoCreateMseChart,
  mseHistoryPoint,
  shouldRecordMseProgress
} from './AutoCreateMseChart';

function progress(patch: Partial<AutoCreateTwroleProgress> = {}): AutoCreateTwroleProgress {
  return {
    stage: 'run',
    step: 2,
    total: 10,
    mse: 0.125,
    active: 1,
    accepted: 1,
    rejected: 0,
    pruned: 0,
    replaced: 0,
    ...patch
  };
}

describe('Auto Create MSE chart shell', () => {
  it('records only finite run and final MSE points with stable keys', () => {
    expect(shouldRecordMseProgress(progress({ stage: 'sources' }))).toBe(false);
    expect(shouldRecordMseProgress(progress({ mse: Number.NaN }))).toBe(false);
    expect(shouldRecordMseProgress(progress())).toBe(true);
    expect(shouldRecordMseProgress(progress({ stage: 'final' }))).toBe(true);
    expect(mseHistoryPoint(progress())).toEqual({
      key: 'run:2:0.125000000000',
      label: 'run 2',
      stage: 'run',
      step: 2,
      mse: 0.125
    });
  });

  it('renders the static empty state without mounting the lazy canvas', () => {
    const html = renderToStaticMarkup(<AutoCreateMseChart points={[]} />);

    expect(html).toContain('data-testid="auto-create-mse-chart"');
    expect(html).toContain('data-testid="auto-create-mse-chart-empty"');
    expect(html).not.toContain('data-testid="auto-create-mse-chart-canvas"');
  });
});
