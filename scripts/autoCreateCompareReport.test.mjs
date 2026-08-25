import { describe, expect, it } from 'vitest';
import {
  AUTO_CREATE_SEARCH_STRATEGIES,
  aggregateCompareReport,
  buildMarkdownReport,
  compareAgainstBaseline,
  evaluateFixture,
  hasCompleteTrainedModes,
  recommendRuntimeAdapter,
  seededShuffle,
  summarize
} from './autoCreateCompareReport.mjs';

function sample(strategy, overrides = {}) {
  const strict = strategy.startsWith('strict-');
  const outputChecksum = strategy === 'legacy' || strategy === 'descriptor-control'
    ? 'legacy-output'
    : strategy === 'strict-ml-tfjs' || strategy === 'strict-ml-typed'
      ? 'ml-output'
      : 'heuristic-output';
  return {
    searchStrategy: strategy,
    durationMs: strict ? 70 : 100,
    previewRenderMs: 4,
    uiReadyDurationMs: strict ? 74 : 104,
    mse: strict ? 0.09 : 0.1,
    coverage: strict ? 0.91 : 0.9,
    alphaIou: strict ? 0.81 : 0.8,
    containmentLeakagePixels: 0,
    placementLeakagePixels: 0,
    outputChecksum,
    count: 8,
    diagnostics: {
      phaseMs: {
        run: strict ? 65 : 95,
        sourceLoad: 3
      },
      counters: {
        candidatesEvaluated: strict ? 400 : 1000,
        variantRastersAllocated: strict ? 350 : 1000,
        variantPixelsRasterized: strict ? 3000 : 10000,
        replaceCandidatesEvaluated: strict ? 12 : 32
      }
    },
    ...overrides
  };
}

function resumeCheckFor(samples, revision = null) {
  const outputChecksum = samples['strict-ml-typed']?.[0]?.outputChecksum ?? 'ml-output';
  return {
    supported: true,
    pass: true,
    strategy: 'strict-ml-typed',
    revision,
    stoppedStep: 1,
    uninterruptedChecksum: outputChecksum,
    resumedChecksum: outputChecksum,
    expectedChecksum: outputChecksum
  };
}

function passingFixture(id = 'skydow/flat/128/seed-1') {
  const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
    strategy,
    [sample(strategy), sample(strategy)]
  ]));
  return evaluateFixture({
    id,
    samples,
    warmups: {},
    resumeCheck: resumeCheckFor(samples)
  }, { profile: 'quick' });
}

function readyFixture(camp, revision) {
  const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
    strategy,
    [sample(strategy), sample(strategy)]
  ]));
  for (const strategy of ['strict-ml-tfjs', 'strict-ml-typed']) {
    for (const value of samples[strategy]) {
      value.ranker = {
        requestedStrategy: strategy,
        effectiveStrategy: strategy,
        runtime: strategy === 'strict-ml-tfjs' ? 'tfjs' : 'typed',
        modelRevision: revision,
        fallbackReason: null
      };
    }
  }
  return evaluateFixture(
    {
      id: `${camp}/flat/128/seed-1`,
      camp,
      samples,
      warmups: {},
      resumeCheck: resumeCheckFor(samples, revision)
    },
    { profile: 'full', requireReadyModel: true }
  );
}

function modelPreflight(models) {
  return {
    requireReady: true,
    pass: true,
    models: models.map(({ camp, revision }) => ({
      camp,
      requireReady: true,
      ready: true,
      revision,
      featureSchema: 'f1',
      portableWeights: true,
      trainedModes: ['add', 'replace'],
      trainedModesComplete: true,
      trainingProofPresent: true,
      trainingTargetSignatures: [`train-${camp}`],
      benchmarkTargetSignatures: [`bench-${camp}`],
      overlappingTargetSignatures: [],
      leakageSafe: true,
      pass: true
    }))
  };
}

function runtimeParityChecks(models, overrides = {}) {
  return models.map(({ camp, revision }) => ({
    camp,
    supported: true,
    ready: true,
    revision,
    featureSchema: 'f1',
    rowCount: 384,
    measuredRuns: 7,
    featureMatrixChecksum: `matrix-${camp}`,
    maxAbsError: 1e-6,
    stableRankingMatch: true,
    tfjsPredictMs: 10,
    typedPredictMs: 8,
    ...overrides
  }));
}

describe('autoCreateCompareReport', () => {
  it('summarizes median and nearest-rank p95 deterministically', () => {
    expect(summarize([9, 1, 7, 3, 5], 0)).toEqual({
      median: 5,
      p95: 9,
      min: 1,
      max: 9
    });
    expect(summarize([])).toEqual({
      median: null,
      p95: null,
      min: null,
      max: null
    });
  });

  it('uses a stable seeded strategy shuffle without changing the input', () => {
    const input = [...AUTO_CREATE_SEARCH_STRATEGIES];
    const first = seededShuffle(input, 12345);
    const second = seededShuffle(input, 12345);
    expect(second).toEqual(first);
    expect(input).toEqual(AUTO_CREATE_SEARCH_STRATEGIES);
    expect([...first].sort()).toEqual([...AUTO_CREATE_SEARCH_STRATEGIES].sort());
  });

  it('accepts only the complete, sorted and duplicate-free Add/Replace mode list', () => {
    expect(hasCompleteTrainedModes(['add', 'replace'])).toBe(true);
    expect(hasCompleteTrainedModes(['replace', 'add'])).toBe(false);
    expect(hasCompleteTrainedModes(['add', 'add', 'replace'])).toBe(false);
    expect(hasCompleteTrainedModes(['add'])).toBe(false);
    expect(hasCompleteTrainedModes(null)).toBe(false);
  });

  it('passes exact control, quality, containment and reduction gates', () => {
    const fixture = passingFixture();
    expect(fixture.gates.pass).toBe(true);
    expect(fixture.gates.checks.find((gate) => gate.id === 'descriptor-control-exact')?.pass).toBe(true);
    expect(
      fixture.gates.checks.find((gate) => gate.id === 'strict-ml-typed-candidate-reduction')?.actual
    ).toBe(0.6);
  });

  it('rejects a per-case MSE regression even when other samples are good', () => {
    const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
      strategy,
      [sample(strategy), sample(strategy)]
    ]));
    samples['strict-ml-tfjs'][1] = sample('strict-ml-tfjs', { mse: 0.100001 });
    const fixture = evaluateFixture({
      id: 'regression',
      samples,
      resumeCheck: resumeCheckFor(samples)
    }, { profile: 'quick' });
    expect(fixture.gates.pass).toBe(false);
    expect(fixture.gates.checks.find((gate) => gate.id === 'strict-ml-tfjs-mse')?.pass).toBe(false);
  });

  it('treats cold ML fallback as a fallback check instead of a speed regression', () => {
    const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
      strategy,
      [sample(strategy)]
    ]));
    for (const strategy of ['strict-ml-tfjs', 'strict-ml-typed']) {
      samples[strategy][0] = sample(strategy, {
        durationMs: 100,
        outputChecksum: 'legacy-output',
        diagnostics: sample('legacy').diagnostics,
        ranker: {
          requestedStrategy: strategy,
          effectiveStrategy: 'legacy',
          runtime: 'none',
          fallbackReason: 'model-not-ready'
        }
      });
    }

    const fixture = evaluateFixture({
      id: 'cold-fallback',
      samples,
      resumeCheck: resumeCheckFor(samples)
    }, { profile: 'quick' });
    const speedGate = fixture.gates.checks.find(
      (gate) => gate.id === 'strict-ml-typed-candidate-reduction'
    );
    expect(speedGate?.pass).toBe(false);
    expect(speedGate?.enforced).toBe(false);
    expect(fixture.gates.pass).toBe(true);
  });

  it('rejects full-profile fallback even when quality and timing look good', () => {
    const fixture = passingFixture();
    const aggregate = aggregateCompareReport([fixture], { profile: 'full' });
    expect(aggregate.gates.pass).toBe(false);
    expect(
      aggregate.gates.checks.find((gate) => gate.id === 'model-skydow-session-frozen')?.pass
    ).toBe(false);
  });

  it('enforces full timing with independently frozen per-camp revisions and measured parity', () => {
    const models = [
      { camp: 'skydow', revision: 'skydow-r1' },
      { camp: 'civil', revision: 'civil-r7' }
    ];
    const fixtures = models.map(({ camp, revision }) => readyFixture(camp, revision));
    const aggregate = aggregateCompareReport(fixtures, {
      profile: 'full',
      modelPreflight: modelPreflight(models),
      runtimeParityChecks: runtimeParityChecks(models)
    });
    expect(aggregate.gates.pass).toBe(true);
    expect(aggregate.gates.checks.find((gate) => gate.id === 'strict-ml-tfjs-worker-median')?.pass).toBe(true);
    expect(
      aggregate.gates.checks.find((gate) => gate.id === 'model-skydow-session-frozen')?.pass
    ).toBe(true);
    expect(
      aggregate.gates.checks.find((gate) => gate.id === 'model-civil-session-frozen')?.pass
    ).toBe(true);
  });

  it('selects TypedArray only after active-runtime parity and the 15% speed threshold', () => {
    const models = [{ camp: 'skydow', revision: 'r1' }];
    const fixture = readyFixture('skydow', 'r1');
    const parity = runtimeParityChecks(models);
    const aggregate = aggregateCompareReport([fixture], {
      profile: 'full',
      modelPreflight: modelPreflight(models),
      runtimeParityChecks: parity
    });
    expect(recommendRuntimeAdapter(aggregate, [fixture], {
      runtimeParityChecks: parity
    })).toMatchObject({
      comparable: true,
      fullGatePassed: true,
      rolloutEligible: true,
      typedRankingSpeedup: 0.2,
      selected: 'typed'
    });
  });

  it('does not select a rollout adapter from a quick benchmark alone', () => {
    const fixture = readyFixture('skydow', 'r1');
    const aggregate = aggregateCompareReport([fixture], { profile: 'quick' });
    const decision = recommendRuntimeAdapter(aggregate, [fixture], {
      runtimeParityChecks: runtimeParityChecks([{ camp: 'skydow', revision: 'r1' }])
    });
    expect(decision.fullGatePassed).toBe(false);
    expect(decision.rolloutEligible).toBe(false);
    expect(decision.selected).toBeNull();
  });

  it('keeps runtime selection pending when speed loses and gzip comparison is unknown', () => {
    const fixture = readyFixture('skydow', 'r1');
    const models = [{ camp: 'skydow', revision: 'r1' }];
    const parity = runtimeParityChecks(models, {
      tfjsPredictMs: 10,
      typedPredictMs: 9
    });
    const aggregate = aggregateCompareReport([fixture], {
      profile: 'full',
      modelPreflight: modelPreflight(models),
      runtimeParityChecks: parity
    });
    expect(recommendRuntimeAdapter(aggregate, [fixture], {
      runtimeParityChecks: parity
    })).toMatchObject({
      comparable: true,
      bundleComparisonKnown: false,
      selected: null
    });
    expect(recommendRuntimeAdapter(aggregate, [fixture], {
      runtimeParityChecks: parity,
      tfjsGzipBytes: 200_000,
      typedGzipBytes: 150_000
    })).toMatchObject({
      bundleComparisonKnown: true,
      selected: 'tfjs'
    });
  });

  it('does not accept end-to-end checksum parity without prediction-level parity', () => {
    const fixture = readyFixture('skydow', 'r1');
    const aggregate = aggregateCompareReport([fixture], {
      profile: 'full',
      modelPreflight: modelPreflight([{ camp: 'skydow', revision: 'r1' }]),
      runtimeParityChecks: runtimeParityChecks(
        [{ camp: 'skydow', revision: 'r1' }],
        { maxAbsError: 2e-5, stableRankingMatch: false }
      )
    });
    const decision = recommendRuntimeAdapter(aggregate, [fixture], {
      runtimeParityChecks: runtimeParityChecks(
        [{ camp: 'skydow', revision: 'r1' }],
        { maxAbsError: 2e-5, stableRankingMatch: false }
      )
    });
    expect(aggregate.gates.pass).toBe(false);
    expect(decision.comparable).toBe(false);
    expect(decision.selected).toBeNull();
  });

  it('fails a ready model when training signature proof is missing or overlaps benchmark targets', () => {
    const fixture = readyFixture('skydow', 'r1');
    const preflight = modelPreflight([{ camp: 'skydow', revision: 'r1' }]);
    preflight.models[0].trainingProofPresent = false;
    preflight.models[0].leakageSafe = false;
    preflight.models[0].overlappingTargetSignatures = ['bench-skydow'];
    const aggregate = aggregateCompareReport([fixture], {
      profile: 'full',
      modelPreflight: preflight,
      runtimeParityChecks: runtimeParityChecks([{ camp: 'skydow', revision: 'r1' }])
    });
    expect(aggregate.gates.pass).toBe(false);
    expect(
      aggregate.gates.checks.find((gate) => gate.id === 'model-skydow-no-target-leakage')?.pass
    ).toBe(false);
  });

  it('requires a full frozen model to contain both sorted Add and Replace modes', () => {
    const fixture = readyFixture('skydow', 'r1');
    const preflight = modelPreflight([{ camp: 'skydow', revision: 'r1' }]);
    preflight.models[0].trainedModes = ['replace', 'add'];
    preflight.models[0].trainedModesComplete = false;
    preflight.models[0].pass = false;
    const aggregate = aggregateCompareReport([fixture], {
      profile: 'full',
      modelPreflight: preflight,
      runtimeParityChecks: runtimeParityChecks([{ camp: 'skydow', revision: 'r1' }])
    });
    expect(aggregate.gates.pass).toBe(false);
    expect(
      aggregate.gates.checks.find((gate) => gate.id === 'model-skydow-trained-modes')?.pass
    ).toBe(false);
  });

  it('fails the fixture when stop/resume does not reproduce its measured checksum', () => {
    const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
      strategy,
      [sample(strategy)]
    ]));
    const fixture = evaluateFixture({
      id: 'resume-regression',
      samples,
      resumeCheck: {
        ...resumeCheckFor(samples),
        pass: false,
        resumedChecksum: 'different-output'
      }
    }, { profile: 'quick' });
    expect(fixture.gates.pass).toBe(false);
    expect(
      fixture.gates.checks.find((gate) => gate.id === 'strict-ml-typed-stop-resume')?.pass
    ).toBe(false);
  });

  it('requires every quick measured run to exercise the Replace evaluator', () => {
    const samples = Object.fromEntries(AUTO_CREATE_SEARCH_STRATEGIES.map((strategy) => [
      strategy,
      [sample(strategy)]
    ]));
    delete samples.legacy[0].diagnostics.counters.replaceCandidatesEvaluated;
    const fixture = evaluateFixture({
      id: 'no-replace',
      samples,
      resumeCheck: resumeCheckFor(samples)
    }, { profile: 'quick' });
    expect(fixture.gates.pass).toBe(false);
    expect(
      fixture.gates.checks.find((gate) => gate.id === 'legacy-replace-evaluator')?.pass
    ).toBe(false);
  });

  it('compares matching prior reports and renders a Markdown summary', () => {
    const fixture = passingFixture();
    const aggregate = aggregateCompareReport([fixture], { profile: 'quick' });
    const baseline = {
      benchmark: 'auto-create-twrole-compare',
      generatedAt: '2026-07-23T00:00:00.000Z',
      fixtures: [fixture]
    };
    const report = {
      generatedAt: '2026-07-24T00:00:00.000Z',
      profile: 'quick',
      overallPass: true,
      environment: { commitSha: 'abc', chromium: 'test' },
      model: { revision: 'r1', featureSchema: 'f1' },
      fixtures: [fixture],
      aggregate
    };
    report.baselineComparison = compareAgainstBaseline(report, baseline);
    expect(report.baselineComparison.pass).toBe(true);
    expect(report.baselineComparison.matched).toBe(AUTO_CREATE_SEARCH_STRATEGIES.length);
    expect(buildMarkdownReport(report)).toContain('AutoCreateTwrole A/B benchmark');
    expect(buildMarkdownReport(report)).toContain('skydow/flat/128/seed-1');
  });

  it('reports quick baseline timing without gating it, but enforces full timing', () => {
    const previousFixture = passingFixture();
    const currentFixture = passingFixture();
    for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
      currentFixture.summaries[strategy].metrics.durationMs = {
        median: 200,
        p95: 200,
        min: 200,
        max: 200
      };
    }
    const environment = {
      platform: 'win32',
      release: 'test',
      arch: 'x64',
      cpuCount: 8,
      cpuModels: ['test cpu'],
      chromium: 'test'
    };
    const quickComparison = compareAgainstBaseline(
      { profile: 'quick', environment, fixtures: [currentFixture] },
      { profile: 'quick', environment, fixtures: [previousFixture] }
    );
    expect(quickComparison.pass).toBe(true);
    expect(
      quickComparison.comparisons[0].checks.find((gate) => gate.id === 'duration-p95')
        ?.enforced
    ).toBe(false);

    const fullComparison = compareAgainstBaseline(
      { profile: 'full', environment, fixtures: [currentFixture] },
      { profile: 'full', environment, fixtures: [previousFixture] }
    );
    expect(fullComparison.pass).toBe(false);
    expect(
      fullComparison.comparisons[0].checks.find((gate) => gate.id === 'duration-p95')
        ?.enforced
    ).toBe(true);
  });
});
