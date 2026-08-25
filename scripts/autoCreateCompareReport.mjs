export const AUTO_CREATE_COMPARE_SCHEMA_VERSION = 2;

export const AUTO_CREATE_SEARCH_STRATEGIES = Object.freeze([
  'legacy',
  'descriptor-control',
  'strict-heuristic',
  'strict-ml-tfjs',
  'strict-ml-typed'
]);

export const AUTO_CREATE_STRICT_STRATEGIES = Object.freeze([
  'strict-heuristic',
  'strict-ml-tfjs',
  'strict-ml-typed'
]);

export const AUTO_CREATE_ML_STRATEGIES = Object.freeze([
  'strict-ml-tfjs',
  'strict-ml-typed'
]);

export const AUTO_CREATE_COMPARE_THRESHOLDS = Object.freeze({
  mseTolerance: 1e-9,
  qualityTolerance: 1e-12,
  minimumCandidateReduction: 0.5,
  minimumRasterReduction: 0.5,
  minimumWorkerSpeedup: 0.2,
  minimumRunPhaseSpeedup: 0.25,
  maximumP95Slowdown: 0.05,
  maximumPredictionAbsError: 1e-5
});

export function hasCompleteTrainedModes(value) {
  return Array.isArray(value) &&
    value.length === 2 &&
    value[0] === 'add' &&
    value[1] === 'replace';
}

export function round(value, digits = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function percentile(values, percentileValue) {
  const finiteValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!finiteValues.length) return null;
  const sorted = [...finiteValues].sort((left, right) => left - right);
  const rank = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[rank];
}

export function summarize(values, digits = 3) {
  const finiteValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!finiteValues.length) {
    return { median: null, p95: null, min: null, max: null };
  }
  const sorted = [...finiteValues].sort((left, right) => left - right);
  return {
    median: round(percentile(sorted, 0.5), digits),
    p95: round(percentile(sorted, 0.95), digits),
    min: round(sorted[0], digits),
    max: round(sorted[sorted.length - 1], digits)
  };
}

export function mixUint32(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function deriveSeed(...values) {
  let seed = 0x9e3779b9;
  for (const value of values) {
    if (typeof value === 'number') {
      seed = mixUint32(seed ^ (value >>> 0));
      continue;
    }
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      seed = mixUint32(seed ^ text.charCodeAt(index));
    }
  }
  return seed || 1;
}

export function seededShuffle(values, seed) {
  const output = [...values];
  let state = (seed >>> 0) || 1;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapAt = Math.floor(random() * (index + 1));
    [output[index], output[swapAt]] = [output[swapAt], output[index]];
  }
  return output;
}

function valuesAt(samples, getter) {
  return samples.map(getter).filter((value) => typeof value === 'number' && Number.isFinite(value));
}

function knownKeys(samples, field) {
  const keys = new Set();
  for (const sample of samples) {
    const record = sample?.diagnostics?.[field];
    if (!record || typeof record !== 'object') continue;
    for (const key of Object.keys(record)) keys.add(key);
  }
  return [...keys].sort();
}

export function summarizeStrategySamples(samples) {
  const safeSamples = Array.isArray(samples) ? samples : [];
  const metrics = {
    durationMs: summarize(valuesAt(safeSamples, (sample) => sample.durationMs), 3),
    runPhaseMs: summarize(valuesAt(safeSamples, (sample) => sample.diagnostics?.phaseMs?.run), 3),
    sourceLoadMs: summarize(valuesAt(safeSamples, (sample) => sample.diagnostics?.phaseMs?.sourceLoad), 3),
    previewRenderMs: summarize(valuesAt(safeSamples, (sample) => sample.previewRenderMs), 3),
    uiReadyDurationMs: summarize(valuesAt(safeSamples, (sample) => sample.uiReadyDurationMs), 3),
    mse: summarize(valuesAt(safeSamples, (sample) => sample.mse), 12),
    coverage: summarize(valuesAt(safeSamples, (sample) => sample.coverage), 12),
    alphaIou: summarize(valuesAt(safeSamples, (sample) => sample.alphaIou), 12),
    containmentLeakagePixels: summarize(
      valuesAt(safeSamples, (sample) => sample.containmentLeakagePixels),
      0
    ),
    placementLeakagePixels: summarize(
      valuesAt(safeSamples, (sample) => sample.placementLeakagePixels),
      0
    ),
    count: summarize(valuesAt(safeSamples, (sample) => sample.count), 0)
  };
  const counters = {};
  for (const key of knownKeys(safeSamples, 'counters')) {
    counters[key] = summarize(
      valuesAt(safeSamples, (sample) => sample.diagnostics?.counters?.[key]),
      0
    );
  }
  const phaseMs = {};
  for (const key of knownKeys(safeSamples, 'phaseMs')) {
    phaseMs[key] = summarize(
      valuesAt(safeSamples, (sample) => sample.diagnostics?.phaseMs?.[key]),
      3
    );
  }
  const rankerRuns = safeSamples
    .map((sample) => sample.ranker ?? sample.rankerSummary)
    .filter((ranker) => ranker && typeof ranker === 'object');
  const distinctRankerValue = (key) => [
    ...new Set(rankerRuns.map((ranker) => ranker[key]).filter((value) => value !== undefined && value !== null))
  ];
  return {
    sampleCount: safeSamples.length,
    outputChecksums: [...new Set(safeSamples.map((sample) => sample.outputChecksum).filter(Boolean))],
    metrics,
    counters,
    phaseMs,
    ranker: {
      requestedStrategies: distinctRankerValue('requestedStrategy'),
      effectiveStrategies: distinctRankerValue('effectiveStrategy'),
      statuses: distinctRankerValue('status'),
      runtimes: distinctRankerValue('runtime'),
      modelRevisions: distinctRankerValue('modelRevision'),
      fallbackReasons: distinctRankerValue('fallbackReason'),
      fallbackSamples: rankerRuns.filter((ranker) => Boolean(ranker.fallbackReason)).length
    }
  };
}

function check(id, label, pass, actual, expected, options = {}) {
  return {
    id,
    label,
    pass: Boolean(pass),
    actual,
    expected,
    enforced: options.enforced !== false,
    ...(options.strategy ? { strategy: options.strategy } : {}),
    ...(options.note ? { note: options.note } : {})
  };
}

function allPaired(samples, baselineSamples, predicate) {
  if (!samples.length || samples.length !== baselineSamples.length) return false;
  return samples.every((sample, index) => predicate(sample, baselineSamples[index]));
}

function medianCounter(summary, counter) {
  return summary?.counters?.[counter]?.median ?? null;
}

function reductionFromBaseline(baseline, candidate) {
  if (typeof baseline !== 'number' || typeof candidate !== 'number') return null;
  if (baseline === 0) return candidate === 0 ? 1 : -Infinity;
  return (baseline - candidate) / baseline;
}

function formatReduction(value) {
  return typeof value === 'number' && Number.isFinite(value) ? round(value, 6) : value;
}

export function evaluateFixture(fixture, options = {}) {
  const thresholds = { ...AUTO_CREATE_COMPARE_THRESHOLDS, ...(options.thresholds ?? {}) };
  const profile = options.profile ?? 'quick';
  const samplesByStrategy = fixture.samples ?? {};
  const summaries = {};
  for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
    summaries[strategy] = summarizeStrategySamples(samplesByStrategy[strategy] ?? []);
  }

  const checks = [];
  const legacySamples = samplesByStrategy.legacy ?? [];
  checks.push(check(
    'legacy-deterministic',
    'legacy 相同 seed 輸出一致',
    summaries.legacy.outputChecksums.length === 1 && legacySamples.length > 0,
    summaries.legacy.outputChecksums,
    'exactly one checksum'
  ));

  for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
    const samples = samplesByStrategy[strategy] ?? [];
    const observedEffectiveStrategies = summaries[strategy].ranker.effectiveStrategies;
    checks.push(check(
      `${strategy}-deterministic`,
      `${strategy} 相同 seed 輸出一致`,
      samples.length > 0 && summaries[strategy].outputChecksums.length === 1,
      summaries[strategy].outputChecksums,
      'exactly one checksum',
      { strategy }
    ));
    if (observedEffectiveStrategies.length > 0) {
      const effectiveMatches = observedEffectiveStrategies.length === 1 &&
        observedEffectiveStrategies[0] === strategy;
      checks.push(check(
        `${strategy}-effective-strategy`,
        `${strategy} 實際使用要求的 strategy`,
        effectiveMatches,
        {
          effectiveStrategies: observedEffectiveStrategies,
          fallbackReasons: summaries[strategy].ranker.fallbackReasons
        },
        strategy,
        {
          strategy,
          enforced:
            !strategy.startsWith('strict-ml-') ||
            options.requireReadyModel === true ||
            profile === 'full',
          note: strategy.startsWith('strict-ml-') && options.requireReadyModel !== true
            ? '未指定 frozen model revision；cold-start fallback 只記錄、不單獨令 gate 失敗。'
            : undefined
        }
      ));
    }
    checks.push(check(
      `${strategy}-containment`,
      `${strategy} containment leakage 為 0`,
      samples.length > 0 && samples.every((sample) => sample.containmentLeakagePixels === 0),
      summaries[strategy].metrics.containmentLeakagePixels.max,
      0,
      { strategy }
    ));
    checks.push(check(
      `${strategy}-placement`,
      `${strategy} placement leakage 為 0`,
      samples.length > 0 && samples.every((sample) => sample.placementLeakagePixels === 0),
      summaries[strategy].metrics.placementLeakagePixels.max,
      0,
      { strategy }
    ));
  }

  if (profile === 'quick') {
    for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
      const samples = samplesByStrategy[strategy] ?? [];
      const replaceEvaluatorCounts = samples.map(
        (sample) => sample.diagnostics?.counters?.replaceCandidatesEvaluated
      );
      checks.push(check(
        `${strategy}-replace-evaluator`,
        `${strategy} quick profile exercises the Replace exact evaluator`,
        samples.length > 0 &&
          replaceEvaluatorCounts.length === samples.length &&
          replaceEvaluatorCounts.every(
            (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
          ),
        replaceEvaluatorCounts,
        'every measured run > 0',
        { strategy }
      ));
    }
  }

  const descriptorSamples = samplesByStrategy['descriptor-control'] ?? [];
  checks.push(check(
    'descriptor-control-exact',
    'descriptor-control 與 legacy normalized output 完全相同',
    allPaired(
      descriptorSamples,
      legacySamples,
      (sample, baseline) => sample.outputChecksum === baseline.outputChecksum
    ),
    summaries['descriptor-control'].outputChecksums,
    summaries.legacy.outputChecksums,
    { strategy: 'descriptor-control' }
  ));
  const resumeCheck = fixture.resumeCheck ?? null;
  checks.push(check(
    'strict-ml-typed-stop-resume',
    'strict-ml-typed uninterrupted and stop/resume outputs are identical',
    resumeCheck?.supported === true &&
      resumeCheck.pass === true &&
      typeof resumeCheck.uninterruptedChecksum === 'string' &&
      resumeCheck.uninterruptedChecksum === resumeCheck.resumedChecksum,
    resumeCheck,
    'same normalized checksum and frozen revision after resume',
    { strategy: 'strict-ml-typed' }
  ));

  for (const strategy of AUTO_CREATE_STRICT_STRATEGIES) {
    const samples = samplesByStrategy[strategy] ?? [];
    const observedEffectiveStrategies = summaries[strategy].ranker.effectiveStrategies;
    const isMlStrategy = AUTO_CREATE_ML_STRATEGIES.includes(strategy);
    const performanceGateEnforced = isMlStrategy && (
      profile === 'full' ||
      observedEffectiveStrategies.length === 0 ||
      observedEffectiveStrategies.includes(strategy) ||
      options.requireReadyModel === true
    );
    const performanceGateNote = !isMlStrategy
      ? 'strict-heuristic 是診斷用 ablation；只記錄效能，不作 ML rollout gate。'
      : !performanceGateEnforced
        ? '模型未 ready 並安全回退 legacy；cold/failure 狀態不套用 ML 效能 gate。'
        : undefined;
    if (isMlStrategy) {
      const expectedRuntime = strategy === 'strict-ml-tfjs' ? 'tfjs' : 'typed';
      const runtimeObservations = samples.map((sample) => {
        const ranker = sample.ranker ?? sample.rankerSummary ?? {};
        return {
          effectiveStrategy: ranker.effectiveStrategy ?? null,
          runtime: ranker.runtime ?? null,
          modelRevision: ranker.modelRevision ?? null,
          fallbackReason: ranker.fallbackReason ?? null
        };
      });
      const readyRuntime = samples.length > 0 && runtimeObservations.every((ranker) => (
        ranker.effectiveStrategy === strategy &&
        ranker.runtime === expectedRuntime &&
        typeof ranker.modelRevision === 'string' &&
        ranker.modelRevision.length > 0 &&
        !ranker.fallbackReason
      ));
      checks.push(check(
        `${strategy}-ready-runtime`,
        `${strategy} uses the requested ready runtime without fallback`,
        readyRuntime,
        runtimeObservations,
        {
          effectiveStrategy: strategy,
          runtime: expectedRuntime,
          modelRevision: 'non-empty and frozen',
          fallbackReason: null
        },
        {
          strategy,
          enforced: profile === 'full' || options.requireReadyModel === true,
          note:
            profile !== 'full' && options.requireReadyModel !== true
              ? 'Cold/failure quick runs may safely fall back to legacy.'
              : undefined
        }
      ));
    }
    checks.push(check(
      `${strategy}-mse`,
      `${strategy} final MSE 不高於 legacy`,
      allPaired(
        samples,
        legacySamples,
        (sample, baseline) => sample.mse <= baseline.mse + thresholds.mseTolerance
      ),
      summaries[strategy].metrics.mse.max,
      `<= paired legacy + ${thresholds.mseTolerance}`,
      { strategy }
    ));
    checks.push(check(
      `${strategy}-coverage`,
      `${strategy} scoring-mask coverage 不低於 legacy`,
      allPaired(
        samples,
        legacySamples,
        (sample, baseline) => sample.coverage + thresholds.qualityTolerance >= baseline.coverage
      ),
      summaries[strategy].metrics.coverage.min,
      '>= paired legacy',
      { strategy }
    ));
    checks.push(check(
      `${strategy}-alpha-iou`,
      `${strategy} alpha IoU 不低於 legacy`,
      allPaired(
        samples,
        legacySamples,
        (sample, baseline) => sample.alphaIou + thresholds.qualityTolerance >= baseline.alphaIou
      ),
      summaries[strategy].metrics.alphaIou.min,
      '>= paired legacy',
      { strategy }
    ));

    const candidateReduction = reductionFromBaseline(
      medianCounter(summaries.legacy, 'candidatesEvaluated'),
      medianCounter(summaries[strategy], 'candidatesEvaluated')
    );
    checks.push(check(
      `${strategy}-candidate-reduction`,
      `${strategy} exact evaluator 次數至少下降 ${thresholds.minimumCandidateReduction * 100}%`,
      candidateReduction !== null && candidateReduction >= thresholds.minimumCandidateReduction,
      formatReduction(candidateReduction),
      `>= ${thresholds.minimumCandidateReduction}`,
      {
        strategy,
        enforced: performanceGateEnforced,
        note: performanceGateNote
      }
    ));

    for (const counter of ['variantRastersAllocated', 'variantPixelsRasterized']) {
      const reduction = reductionFromBaseline(
        medianCounter(summaries.legacy, counter),
        medianCounter(summaries[strategy], counter)
      );
      checks.push(check(
        `${strategy}-${counter}-reduction`,
        `${strategy} ${counter} 至少下降 ${thresholds.minimumRasterReduction * 100}%`,
        reduction !== null && reduction >= thresholds.minimumRasterReduction,
        formatReduction(reduction),
        `>= ${thresholds.minimumRasterReduction}`,
        {
          strategy,
          enforced: performanceGateEnforced,
          note: performanceGateNote
        }
      ));
    }
  }

  const readyMlRevisions = AUTO_CREATE_ML_STRATEGIES.flatMap((strategy) =>
    (samplesByStrategy[strategy] ?? []).map((sample) => {
      const ranker = sample.ranker ?? sample.rankerSummary ?? {};
      return ranker.effectiveStrategy === strategy ? ranker.modelRevision : null;
    })
  ).filter((revision) => typeof revision === 'string' && revision.length > 0);
  checks.push(check(
    'ml-frozen-revision',
    'TFJS and TypedArray use one frozen model revision for this camp/fixture',
    readyMlRevisions.length > 0 && new Set(readyMlRevisions).size === 1,
    [...new Set(readyMlRevisions)],
    'exactly one non-empty revision',
    {
      enforced: profile === 'full' || options.requireReadyModel === true,
      note:
        profile !== 'full' && options.requireReadyModel !== true
          ? 'No ready model was required for this quick fixture.'
          : undefined
    }
  ));

  const tfjsSamples = samplesByStrategy['strict-ml-tfjs'] ?? [];
  const typedSamples = samplesByStrategy['strict-ml-typed'] ?? [];
  const hasRuntimeInfo =
    summaries['strict-ml-tfjs'].ranker.effectiveStrategies.length > 0 ||
    summaries['strict-ml-typed'].ranker.effectiveStrategies.length > 0;
  const runtimeReady = !hasRuntimeInfo || (
    summaries['strict-ml-tfjs'].ranker.effectiveStrategies.includes('strict-ml-tfjs') &&
    summaries['strict-ml-typed'].ranker.effectiveStrategies.includes('strict-ml-typed')
  );
  const runtimeOutputsMatch = allPaired(
    typedSamples,
    tfjsSamples,
    (sample, baseline) => sample.outputChecksum === baseline.outputChecksum
  );
  checks.push(check(
    'ml-runtime-output-parity',
    'TFJS 與 TypedArray stable ranking 產生相同 normalized output',
    runtimeReady && runtimeOutputsMatch,
    {
      runtimeReady,
      typed: summaries['strict-ml-typed'].outputChecksums,
      tfjs: summaries['strict-ml-tfjs'].outputChecksums
    },
    'ready runtimes and identical outputs',
    {
      enforced: runtimeReady || options.requireReadyModel === true,
      note: runtimeReady
        ? '這是 end-to-end parity gate；prediction-level parity 由 Dense ranker 單元測試負責。'
        : 'ML runtime fallback，未執行 prediction parity。'
    }
  ));

  if (profile !== 'full') {
    for (const gate of checks) {
      if (gate.id.includes('duration') || gate.id.includes('run-phase')) gate.enforced = false;
    }
  }

  const enforcedChecks = checks.filter((gate) => gate.enforced);
  return {
    ...fixture,
    summaries,
    gates: {
      pass: enforcedChecks.every((gate) => gate.pass),
      checks
    }
  };
}

function flattenSamples(fixtures, strategy) {
  return fixtures.flatMap((fixture) => fixture.samples?.[strategy] ?? []);
}

function improvement(baseline, candidate) {
  return reductionFromBaseline(baseline, candidate);
}

export function aggregateCompareReport(fixtures, options = {}) {
  const thresholds = { ...AUTO_CREATE_COMPARE_THRESHOLDS, ...(options.thresholds ?? {}) };
  const profile = options.profile ?? 'quick';
  const strategies = {};
  for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
    strategies[strategy] = summarizeStrategySamples(flattenSamples(fixtures, strategy));
  }

  const checks = [];
  const modelPreflight = options.modelPreflight ?? null;
  for (const model of modelPreflight?.models ?? []) {
    checks.push(check(
      `model-${model.camp}-ready`,
      `${model.camp} has a frozen portable model revision`,
      model.ready === true,
      {
        revision: model.revision ?? null,
        featureSchema: model.featureSchema ?? null,
        portableWeights: model.portableWeights === true
      },
      'ready frozen model',
      {
        enforced: model.requireReady === true || profile === 'full'
      }
    ));
    checks.push(check(
      `model-${model.camp}-trained-modes`,
      `${model.camp} frozen model is trained for both Add and Replace`,
      model.trainedModesComplete === true,
      model.trainedModes ?? null,
      ['add', 'replace'],
      {
        enforced: model.requireReady === true || profile === 'full',
        note:
          model.requireReady !== true && profile !== 'full'
            ? 'A quick implicit model may still be collecting one independently gated mode.'
            : undefined
      }
    ));
    checks.push(check(
      `model-${model.camp}-no-target-leakage`,
      `${model.camp} training signatures prove benchmark isolation`,
      model.trainingProofPresent === true &&
        model.leakageSafe === true &&
        (model.overlappingTargetSignatures?.length ?? 0) === 0,
      {
        trainingProofPresent: model.trainingProofPresent === true,
        overlap: model.overlappingTargetSignatures ?? []
      },
      'non-empty proof and zero overlapping target signatures',
      {
        enforced: model.ready === true || model.requireReady === true || profile === 'full'
      }
    ));
  }

  const fixturesByCamp = new Map();
  for (const fixture of fixtures) {
    const camp = fixture.camp ?? String(fixture.id ?? '').split('/')[0] ?? 'unknown';
    const values = fixturesByCamp.get(camp) ?? [];
    values.push(fixture);
    fixturesByCamp.set(camp, values);
  }
  for (const [camp, campFixtures] of fixturesByCamp) {
    const expectedRevision = modelPreflight?.models
      ?.find((model) => model.camp === camp)?.revision ?? null;
    const revisions = [];
    let allReady = true;
    for (const fixture of campFixtures) {
      for (const strategy of AUTO_CREATE_ML_STRATEGIES) {
        for (const sample of fixture.samples?.[strategy] ?? []) {
          const ranker = sample.ranker ?? sample.rankerSummary ?? {};
          const expectedRuntime = strategy === 'strict-ml-tfjs' ? 'tfjs' : 'typed';
          if (
            ranker.effectiveStrategy !== strategy ||
            ranker.runtime !== expectedRuntime ||
            typeof ranker.modelRevision !== 'string' ||
            ranker.modelRevision.length === 0 ||
            ranker.fallbackReason
          ) {
            allReady = false;
          } else {
            revisions.push(ranker.modelRevision);
          }
        }
      }
    }
    const distinctRevisions = [...new Set(revisions)];
    checks.push(check(
      `model-${camp}-session-frozen`,
      `${camp} keeps one frozen revision for every TFJS/TypedArray run`,
      allReady &&
        distinctRevisions.length === 1 &&
        (!expectedRevision || distinctRevisions[0] === expectedRevision),
      {
        allReady,
        revisions: distinctRevisions,
        expectedRevision
      },
      'one ready revision matching preflight',
      {
        enforced:
          profile === 'full' ||
          modelPreflight?.models?.some((model) => model.camp === camp && model.ready === true)
      }
    ));
  }

  const runtimeParityChecks = options.runtimeParityChecks ?? [];
  const readyModels = (modelPreflight?.models ?? []).filter((model) => model.ready === true);
  for (const model of readyModels) {
    const parity = runtimeParityChecks.find((candidate) => candidate.camp === model.camp);
    checks.push(check(
      `runtime-${model.camp}-prediction-parity`,
      `${model.camp} TFJS and TypedArray predictions/ranking match`,
      parity?.ready === true &&
        parity.revision === model.revision &&
        typeof parity.maxAbsError === 'number' &&
        parity.maxAbsError <= thresholds.maximumPredictionAbsError &&
        parity.stableRankingMatch === true,
      parity ?? null,
      {
        revision: model.revision,
        maxAbsError: `<= ${thresholds.maximumPredictionAbsError}`,
        stableRankingMatch: true
      },
      { enforced: true }
    ));
  }
  checks.push(check(
    'runtime-prediction-parity-all-ready-camps',
    'Every ready camp has measured TFJS/TypedArray prediction parity',
    readyModels.length > 0 &&
      readyModels.every((model) => runtimeParityChecks.some((parity) => (
        parity.camp === model.camp &&
        parity.ready === true &&
        parity.revision === model.revision &&
        typeof parity.maxAbsError === 'number' &&
        parity.maxAbsError <= thresholds.maximumPredictionAbsError &&
        parity.stableRankingMatch === true
      ))),
    runtimeParityChecks,
    'measured parity for every ready camp',
    {
      enforced: profile === 'full' || readyModels.length > 0,
      note:
        profile !== 'full' && readyModels.length === 0
          ? 'Quick cold/failure benchmark has no ready model to compare.'
          : undefined
    }
  ));

  if (profile === 'full') {
    for (const strategy of AUTO_CREATE_ML_STRATEGIES) {
      const durationImprovement = improvement(
        strategies.legacy.metrics.durationMs.median,
        strategies[strategy].metrics.durationMs.median
      );
      const runImprovement = improvement(
        strategies.legacy.metrics.runPhaseMs.median,
        strategies[strategy].metrics.runPhaseMs.median
      );
      const legacyP95 = strategies.legacy.metrics.durationMs.p95;
      const strategyP95 = strategies[strategy].metrics.durationMs.p95;
      const observedEffectiveStrategies = strategies[strategy].ranker.effectiveStrategies;
      const performanceGateEnforced = true;
      const performanceGateNote = performanceGateEnforced
        ? undefined
        : '模型未 ready 並安全回退 legacy；cold/failure 狀態不套用 ML 效能 gate。';
      checks.push(check(
        `${strategy}-worker-median`,
        `${strategy} Worker median 至少快 ${thresholds.minimumWorkerSpeedup * 100}%`,
        durationImprovement !== null && durationImprovement >= thresholds.minimumWorkerSpeedup,
        formatReduction(durationImprovement),
        `>= ${thresholds.minimumWorkerSpeedup}`,
        {
          strategy,
          enforced: performanceGateEnforced,
          note: performanceGateNote
        }
      ));
      checks.push(check(
        `${strategy}-run-median`,
        `${strategy} run phase median 至少快 ${thresholds.minimumRunPhaseSpeedup * 100}%`,
        runImprovement !== null && runImprovement >= thresholds.minimumRunPhaseSpeedup,
        formatReduction(runImprovement),
        `>= ${thresholds.minimumRunPhaseSpeedup}`,
        {
          strategy,
          enforced: performanceGateEnforced,
          note: performanceGateNote
        }
      ));
      checks.push(check(
        `${strategy}-worker-p95`,
        `${strategy} Worker p95 不慢於 legacy 5% 以上`,
        typeof legacyP95 === 'number' &&
          typeof strategyP95 === 'number' &&
          strategyP95 <= legacyP95 * (1 + thresholds.maximumP95Slowdown),
        strategyP95,
        typeof legacyP95 === 'number'
          ? `<= ${round(legacyP95 * (1 + thresholds.maximumP95Slowdown), 3)}`
          : 'legacy p95',
        {
          strategy,
          enforced: performanceGateEnforced,
          note: performanceGateNote
        }
      ));
    }
  }

  const failedFixtureIds = fixtures.filter((fixture) => !fixture.gates?.pass).map((fixture) => fixture.id);
  checks.push(check(
    'all-fixtures',
    '所有 fixture 的逐 case gate 通過',
    failedFixtureIds.length === 0,
    failedFixtureIds,
    []
  ));
  const enforcedChecks = checks.filter((gate) => gate.enforced);

  return {
    profile,
    strategies,
    fixtureCount: fixtures.length,
    passingFixtureCount: fixtures.length - failedFixtureIds.length,
    gates: {
      pass: enforcedChecks.every((gate) => gate.pass),
      checks
    }
  };
}

export function recommendRuntimeAdapter(aggregate, fixtures, options = {}) {
  const tfjs = aggregate?.strategies?.['strict-ml-tfjs'];
  const typed = aggregate?.strategies?.['strict-ml-typed'];
  const tfjsReady = tfjs?.ranker?.effectiveStrategies?.includes('strict-ml-tfjs') ?? false;
  const typedReady = typed?.ranker?.effectiveStrategies?.includes('strict-ml-typed') ?? false;
  const endToEndParity = (fixtures ?? []).every((fixture) => {
    const gate = fixture.gates?.checks?.find((candidate) => candidate.id === 'ml-runtime-output-parity');
    return gate?.pass === true;
  });
  const runtimeParityChecks = options.runtimeParityChecks ?? [];
  const aggregateParityGate = aggregate?.gates?.checks?.find(
    (gate) => gate.id === 'runtime-prediction-parity-all-ready-camps'
  );
  const predictionParity = runtimeParityChecks.length > 0 &&
    (aggregateParityGate?.enforced ? aggregateParityGate.pass === true : true) &&
    runtimeParityChecks.every((parity) => (
      parity.ready === true &&
      typeof parity.maxAbsError === 'number' &&
      parity.maxAbsError <= AUTO_CREATE_COMPARE_THRESHOLDS.maximumPredictionAbsError &&
      parity.stableRankingMatch === true
    ));
  const predictionMaxAbsError = runtimeParityChecks.length > 0
    ? Math.max(...runtimeParityChecks.map((parity) => parity.maxAbsError ?? Number.POSITIVE_INFINITY))
    : null;
  const tfjsRankingMs = summarize(
    runtimeParityChecks.map((parity) => parity.tfjsPredictMs),
    6
  ).median;
  const typedRankingMs = summarize(
    runtimeParityChecks.map((parity) => parity.typedPredictMs),
    6
  ).median;
  const rankingSpeedup = improvement(tfjsRankingMs, typedRankingMs);
  const tfjsGzipBytes = options.tfjsGzipBytes ?? null;
  const typedGzipBytes = options.typedGzipBytes ?? null;
  const gzipSavingBytes = typeof tfjsGzipBytes === 'number' && typeof typedGzipBytes === 'number'
    ? tfjsGzipBytes - typedGzipBytes
    : null;
  const speedWins = typeof rankingSpeedup === 'number' && rankingSpeedup >= 0.15;
  const bundleComparisonKnown =
    typeof tfjsGzipBytes === 'number' &&
    typeof typedGzipBytes === 'number';
  const bundleWins = typeof gzipSavingBytes === 'number' && gzipSavingBytes >= 100_000;
  const comparable = tfjsReady && typedReady && endToEndParity && predictionParity;
  const fullGatePassed = aggregate?.profile === 'full' && aggregate?.gates?.pass === true;
  const rolloutEligible = comparable && fullGatePassed;
  const selected = !rolloutEligible
    ? null
    : speedWins
      ? 'typed'
      : !bundleComparisonKnown
        ? null
        : bundleWins
          ? 'typed'
          : 'tfjs';
  return {
    comparable,
    fullGatePassed,
    rolloutEligible,
    tfjsReady,
    typedReady,
    endToEndParity,
    predictionParity,
    predictionMaxAbsError,
    tfjsCandidateRankingMedianMs: tfjsRankingMs,
    typedCandidateRankingMedianMs: typedRankingMs,
    typedRankingSpeedup: formatReduction(rankingSpeedup),
    tfjsGzipBytes,
    typedGzipBytes,
    gzipSavingBytes,
    bundleComparisonKnown,
    requiredPredictionMaxAbsError: AUTO_CREATE_COMPARE_THRESHOLDS.maximumPredictionAbsError,
    requiredStableRankingMatch: true,
    selected,
    reason: !comparable
      ? 'Both ML runtimes must be active and pass measured prediction, ranking and end-to-end parity.'
      : !fullGatePassed
        ? 'Runtime evidence is comparable, but a passing Full benchmark is required before rollout.'
      : speedWins
        ? 'TypedArray candidate ranking is at least 15% faster.'
        : !bundleComparisonKnown
          ? 'Prediction speed did not select TypedArray and production gzip comparison is unavailable.'
        : bundleWins
          ? 'TypedArray saves at least 100 KB gzip.'
          : 'TypedArray did not clear either selection threshold.'
  };
}

function baselineFixtureIndex(report) {
  const output = new Map();
  for (const fixture of report?.fixtures ?? []) {
    if (fixture?.id) output.set(fixture.id, fixture);
  }
  return output;
}

export function compareAgainstBaseline(currentReport, baselineReport) {
  const baselineIndex = baselineFixtureIndex(baselineReport);
  const environmentKeys = ['platform', 'release', 'arch', 'cpuCount', 'cpuModels', 'chromium'];
  const environmentCompatible = environmentKeys.every((key) =>
    currentReport?.environment?.[key] !== undefined &&
    baselineReport?.environment?.[key] !== undefined &&
      JSON.stringify(currentReport.environment[key]) ===
      JSON.stringify(baselineReport.environment[key])
  );
  const timingGateEnforced = environmentCompatible
    && currentReport?.profile === 'full'
    && baselineReport?.profile === 'full';
  const comparisons = [];
  const unmatched = [];
  for (const fixture of currentReport?.fixtures ?? []) {
    const baseline = baselineIndex.get(fixture.id);
    if (!baseline) {
      unmatched.push(fixture.id);
      continue;
    }
    for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
      const current = fixture.summaries?.[strategy];
      const previous = baseline.summaries?.[strategy];
      if (!current || !previous) continue;
      const checks = [
        check(
          'mse',
          'MSE regression',
          current.metrics.mse.median <= previous.metrics.mse.median + AUTO_CREATE_COMPARE_THRESHOLDS.mseTolerance,
          current.metrics.mse.median,
          `<= ${previous.metrics.mse.median} + ${AUTO_CREATE_COMPARE_THRESHOLDS.mseTolerance}`
        ),
        check(
          'coverage',
          'coverage regression',
          current.metrics.coverage.median + AUTO_CREATE_COMPARE_THRESHOLDS.qualityTolerance >= previous.metrics.coverage.median,
          current.metrics.coverage.median,
          `>= ${previous.metrics.coverage.median}`
        ),
        check(
          'alpha-iou',
          'alpha IoU regression',
          current.metrics.alphaIou.median + AUTO_CREATE_COMPARE_THRESHOLDS.qualityTolerance >= previous.metrics.alphaIou.median,
          current.metrics.alphaIou.median,
          `>= ${previous.metrics.alphaIou.median}`
        ),
        check(
          'containment',
          'containment regression',
          current.metrics.containmentLeakagePixels.max === 0,
          current.metrics.containmentLeakagePixels.max,
          0
        ),
        check(
          'placement',
          'placement regression',
          current.metrics.placementLeakagePixels.max === 0,
          current.metrics.placementLeakagePixels.max,
          0
        ),
        check(
          'duration-p95',
          'same-runner p95 regression',
          typeof current.metrics.durationMs.p95 === 'number' &&
            typeof previous.metrics.durationMs.p95 === 'number' &&
            current.metrics.durationMs.p95 <=
              previous.metrics.durationMs.p95 * (1 + AUTO_CREATE_COMPARE_THRESHOLDS.maximumP95Slowdown),
          current.metrics.durationMs.p95,
          typeof previous.metrics.durationMs.p95 === 'number'
            ? `<= ${round(
                previous.metrics.durationMs.p95 *
                (1 + AUTO_CREATE_COMPARE_THRESHOLDS.maximumP95Slowdown),
                3
              )}`
            : 'prior p95',
          {
            enforced: timingGateEnforced,
            note: !environmentCompatible
              ? 'Different environment; timing is reported but not gated.'
              : timingGateEnforced
                ? 'Full-profile environment fingerprint matches the baseline.'
                : 'Quick-profile wall time is reported but not gated.'
          }
        )
      ];
      comparisons.push({
        fixtureId: fixture.id,
        strategy,
        durationDeltaPct: percentDelta(previous.metrics.durationMs.median, current.metrics.durationMs.median),
        runPhaseDeltaPct: percentDelta(previous.metrics.runPhaseMs.median, current.metrics.runPhaseMs.median),
        pass: checks.filter((gate) => gate.enforced).every((gate) => gate.pass),
        checks
      });
    }
  }
  return {
    source: baselineReport?.generatedAt ?? null,
    environmentCompatible,
    matched: comparisons.length,
    unmatched,
    pass: comparisons.every((comparison) => comparison.pass),
    comparisons
  };
}

export function percentDelta(baseline, candidate) {
  if (typeof baseline !== 'number' || typeof candidate !== 'number' || baseline === 0) return null;
  return round(((candidate - baseline) / baseline) * 100, 3);
}

function markdownValue(value, suffix = '') {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'number') return `${round(value, 3)}${suffix}`;
  return String(value);
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function buildMarkdownReport(report) {
  const lines = [
    '# AutoCreateTwrole A/B benchmark',
    '',
    `- 產生時間：${report.generatedAt}`,
    `- Profile：\`${report.profile}\``,
    `- Commit：\`${report.environment?.commitSha ?? 'unknown'}\``,
    `- Chromium：\`${report.environment?.chromium ?? 'unknown'}\``,
    `- Frozen model：\`${report.model?.revision ?? 'none'}\``,
    `- Feature schema：\`${report.model?.featureSchema ?? 'unknown'}\``,
    `- 整體結果：${report.overallPass ? 'PASS' : 'FAIL'}`,
    '',
    '## 聚合結果',
    '',
    '| Requested | Effective | Runtime | Fallback | Worker median | Worker p95 | Run median | MSE median | Exact eval | Raster pixels | Fixtures |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const strategy of AUTO_CREATE_SEARCH_STRATEGIES) {
    const summary = report.aggregate?.strategies?.[strategy];
    if (!summary) continue;
    const strategyFixtures = report.fixtures?.filter((fixture) =>
      fixture.gates?.checks
        ?.filter((gate) => gate.strategy === strategy && gate.enforced)
        .every((gate) => gate.pass)
    ).length ?? 0;
    lines.push([
      `| ${strategy}`,
      markdownValue(summary.ranker.effectiveStrategies.join(', ') || 'unknown'),
      markdownValue(summary.ranker.runtimes.join(', ') || 'unknown'),
      markdownValue(summary.ranker.fallbackSamples),
      markdownValue(summary.metrics.durationMs.median, ' ms'),
      markdownValue(summary.metrics.durationMs.p95, ' ms'),
      markdownValue(summary.metrics.runPhaseMs.median, ' ms'),
      markdownValue(summary.metrics.mse.median),
      markdownValue(summary.counters.candidatesEvaluated?.median),
      markdownValue(summary.counters.variantPixelsRasterized?.median),
      `${strategyFixtures}/${report.fixtures?.length ?? 0} |`
    ].join(' | '));
  }

  lines.push(
    '',
    '## 逐 fixture 比較',
    '',
    '| Fixture | Legacy ms | Descriptor Δ | Heuristic Δ | TFJS Δ | Typed Δ | Gate |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |'
  );
  for (const fixture of report.fixtures ?? []) {
    const legacy = fixture.summaries?.legacy?.metrics?.durationMs?.median;
    const delta = (strategy) => {
      const value = percentDelta(legacy, fixture.summaries?.[strategy]?.metrics?.durationMs?.median);
      return value === null ? 'n/a' : `${value > 0 ? '+' : ''}${value}%`;
    };
    lines.push(
      `| ${markdownCell(fixture.id)} | ${markdownValue(legacy)} | ${delta('descriptor-control')} | ` +
      `${delta('strict-heuristic')} | ${delta('strict-ml-tfjs')} | ${delta('strict-ml-typed')} | ` +
      `${fixture.gates?.pass ? 'PASS' : 'FAIL'} |`
    );
  }

  const failures = [
    ...(report.aggregate?.gates?.checks ?? []).filter((gate) => gate.enforced && !gate.pass)
      .map((gate) => ({ scope: 'aggregate', ...gate })),
    ...(report.fixtures ?? []).flatMap((fixture) =>
      (fixture.gates?.checks ?? [])
        .filter((gate) => gate.enforced && !gate.pass)
        .map((gate) => ({ scope: fixture.id, ...gate }))
    )
  ];
  lines.push('', '## Gate failures', '');
  if (!failures.length) {
    lines.push('沒有。');
  } else {
    for (const failure of failures) {
      lines.push(
        `- **${markdownCell(failure.scope)} / ${markdownCell(failure.id)}**：` +
        `${markdownCell(failure.label)}（actual: \`${markdownCell(JSON.stringify(failure.actual))}\`; ` +
        `expected: \`${markdownCell(JSON.stringify(failure.expected))}\`）`
      );
    }
  }

  if (report.baselineComparison) {
    lines.push(
      '',
      '## 舊報告 regression',
      '',
      `- Matched：${report.baselineComparison.matched}`,
      `- Unmatched fixtures：${report.baselineComparison.unmatched.length}`,
      `- 結果：${report.baselineComparison.pass ? 'PASS' : 'FAIL'}`
    );
  }

  if (report.modelStateChecks) {
    lines.push(
      '',
      '## Model state smoke checks',
      '',
      `- 控制 API：${report.modelStateChecks.supported ? 'available' : 'unavailable'}`,
      `- 結果：${report.modelStateChecks.skipped ? 'SKIPPED' : report.modelStateChecks.pass ? 'PASS' : 'FAIL'}`
    );
    if (report.modelStateChecks.resumeCheck) {
      lines.push(
        `- Stop/resume deterministic：${report.modelStateChecks.resumeCheck.pass ? 'PASS' : 'FAIL'}`,
        `- Stop/resume revision：\`${report.modelStateChecks.resumeCheck.revision ?? 'legacy'}\``
      );
    }
  }
  if (report.modelPreflight) {
    lines.push(
      '',
      '## Frozen models and train/test isolation',
      '',
      '| Camp | Ready | Revision | Modes | Training proof | Target overlap | Gate |',
      '| --- | --- | --- | --- | --- | ---: | --- |'
    );
    for (const model of report.modelPreflight.models ?? []) {
      lines.push(
        `| ${markdownCell(model.camp)} | ${model.ready ? 'yes' : 'no'} | ` +
        `${markdownCell(model.revision ?? 'none')} | ${markdownCell(
          model.trainedModes?.join(', ') ?? 'none'
        )} | ${model.trainingProofPresent ? 'yes' : 'no'} | ` +
        `${model.overlappingTargetSignatures?.length ?? 0} | ${model.pass ? 'PASS' : 'FAIL'} |`
      );
    }
  }
  if (report.fixtures?.length) {
    lines.push(
      '',
      '## Stop/resume determinism',
      '',
      '| Fixture | Revision | Stopped step | Checksum | Gate |',
      '| --- | --- | ---: | --- | --- |'
    );
    for (const fixture of report.fixtures) {
      const resume = fixture.resumeCheck;
      lines.push(
        `| ${markdownCell(fixture.id)} | ${markdownCell(resume?.revision ?? 'legacy')} | ` +
        `${markdownValue(resume?.stoppedStep)} | ${markdownCell(
          resume?.resumedChecksum ?? 'missing'
        )} | ${resume?.pass ? 'PASS' : 'FAIL'} |`
      );
    }
  }
  if (report.runtimeParityChecks?.length) {
    lines.push(
      '',
      '## Prediction runtime parity',
      '',
      '| Camp | Revision | Rows | Max abs error | Ranking | TFJS median | Typed median |',
      '| --- | --- | ---: | ---: | --- | ---: | ---: |'
    );
    for (const parity of report.runtimeParityChecks) {
      lines.push(
        `| ${markdownCell(parity.camp)} | ${markdownCell(parity.revision ?? 'none')} | ` +
        `${markdownValue(parity.rowCount)} | ${markdownValue(parity.maxAbsError)} | ` +
        `${parity.stableRankingMatch ? 'match' : 'mismatch'} | ` +
        `${markdownValue(parity.tfjsPredictMs, ' ms')} | ${markdownValue(parity.typedPredictMs, ' ms')} |`
      );
    }
  }
  if (report.runtimeDecision) {
    lines.push(
      '',
      '## Runtime adapter decision',
      '',
      `- Comparable：${report.runtimeDecision.comparable ? 'yes' : 'no'}`,
      `- Full quality/performance gate：${report.runtimeDecision.fullGatePassed ? 'PASS' : 'NOT PASSED'}`,
      `- Rollout eligible：${report.runtimeDecision.rolloutEligible ? 'yes' : 'no'}`,
      `- Prediction parity：${report.runtimeDecision.predictionParity ? 'PASS' : 'FAIL'}`,
      `- Prediction max abs error：${markdownValue(report.runtimeDecision.predictionMaxAbsError)}`,
      `- Typed ranking speedup：${markdownValue(
        typeof report.runtimeDecision.typedRankingSpeedup === 'number'
          ? report.runtimeDecision.typedRankingSpeedup * 100
          : null,
        '%'
      )}`,
      `- Gzip saving：${markdownValue(report.runtimeDecision.gzipSavingBytes, ' bytes')}`,
      `- Selection：\`${report.runtimeDecision.selected ?? 'pending'}\``,
      `- Reason：${report.runtimeDecision.reason}`
    );
  }
  lines.push('');
  return lines.join('\n');
}
