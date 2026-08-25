export type AutoCreateDiagnosticPhase =
  | 'targetLoad'
  | 'sourceLoad'
  | 'engineInit'
  | 'rankerLoad'
  | 'run'
  | 'finalPrune'
  | 'resultBuild'
  | 'workerPreview'
  | 'checkpoint'
  | 'candidateDescriptor'
  | 'candidateRanking'
  | 'candidateMaterialization'
  | 'variantTransform'
  | 'candidateEvaluation'
  | 'candidateApply'
  | 'pruneReplace';

export type AutoCreateDiagnosticCounter =
  | 'candidatesProposed'
  | 'descriptorsProposed'
  | 'descriptorsRanked'
  | 'descriptorsExplorationSelected'
  | 'descriptorsUpperBoundPruned'
  | 'candidateMaterializations'
  | 'candidatesGeometryRejected'
  | 'candidatesGeometryScoreRejected'
  | 'candidatesEvaluated'
  | 'replaceCandidatesEvaluated'
  | 'candidatePixelsEvaluated'
  | 'containmentFastAccepted'
  | 'containmentFallbacks'
  | 'containmentRejected'
  | 'containmentPixelsChecked'
  | 'candidateUpperBoundRejected'
  | 'candidateAfterSseEarlyRejected'
  | 'replaceAfterSseEarlyRejected'
  | 'candidateObjectsAllocated'
  | 'rankerBatches'
  | 'rankerCandidates'
  | 'rankerFallbacks'
  | 'learningExamplesQueued'
  | 'learningExamplesCensored'
  | 'variantCacheHits'
  | 'variantCacheMisses'
  | 'variantCacheEvictions'
  | 'variantPixelsRasterized'
  | 'variantRastersAllocated'
  | 'scratchBuffersAllocated'
  | 'decoDraftsAllocated'
  | 'checkpointsBuilt'
  | 'tilesAccepted'
  | 'tilesPruned'
  | 'tilesReplaced';

export interface AutoCreateTwroleDiagnostics {
  phaseMs: Record<AutoCreateDiagnosticPhase, number>;
  counters: Record<AutoCreateDiagnosticCounter, number>;
}

const PHASES: AutoCreateDiagnosticPhase[] = [
  'targetLoad',
  'sourceLoad',
  'engineInit',
  'rankerLoad',
  'run',
  'finalPrune',
  'resultBuild',
  'workerPreview',
  'checkpoint',
  'candidateDescriptor',
  'candidateRanking',
  'candidateMaterialization',
  'variantTransform',
  'candidateEvaluation',
  'candidateApply',
  'pruneReplace'
];

const COUNTERS: AutoCreateDiagnosticCounter[] = [
  'candidatesProposed',
  'descriptorsProposed',
  'descriptorsRanked',
  'descriptorsExplorationSelected',
  'descriptorsUpperBoundPruned',
  'candidateMaterializations',
  'candidatesGeometryRejected',
  'candidatesGeometryScoreRejected',
  'candidatesEvaluated',
  'replaceCandidatesEvaluated',
  'candidatePixelsEvaluated',
  'containmentFastAccepted',
  'containmentFallbacks',
  'containmentRejected',
  'containmentPixelsChecked',
  'candidateUpperBoundRejected',
  'candidateAfterSseEarlyRejected',
  'replaceAfterSseEarlyRejected',
  'candidateObjectsAllocated',
  'rankerBatches',
  'rankerCandidates',
  'rankerFallbacks',
  'learningExamplesQueued',
  'learningExamplesCensored',
  'variantCacheHits',
  'variantCacheMisses',
  'variantCacheEvictions',
  'variantPixelsRasterized',
  'variantRastersAllocated',
  'scratchBuffersAllocated',
  'decoDraftsAllocated',
  'checkpointsBuilt',
  'tilesAccepted',
  'tilesPruned',
  'tilesReplaced'
];

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export class AutoCreateDiagnosticsCollector {
  private readonly phaseMs = Object.fromEntries(PHASES.map((phase) => [phase, 0])) as Record<AutoCreateDiagnosticPhase, number>;
  private readonly counters = Object.fromEntries(COUNTERS.map((counter) => [counter, 0])) as Record<AutoCreateDiagnosticCounter, number>;

  add(counter: AutoCreateDiagnosticCounter, amount = 1): void {
    this.counters[counter] += amount;
  }

  begin(phase: AutoCreateDiagnosticPhase): () => void {
    const startedAt = nowMs();
    return () => {
      this.phaseMs[phase] += nowMs() - startedAt;
    };
  }

  measure<T>(phase: AutoCreateDiagnosticPhase, operation: () => T): T {
    const startedAt = nowMs();
    try {
      return operation();
    } finally {
      this.phaseMs[phase] += nowMs() - startedAt;
    }
  }

  async measureAsync<T>(phase: AutoCreateDiagnosticPhase, operation: () => Promise<T>): Promise<T> {
    const startedAt = nowMs();
    try {
      return await operation();
    } finally {
      this.phaseMs[phase] += nowMs() - startedAt;
    }
  }

  snapshot(): AutoCreateTwroleDiagnostics {
    return {
      phaseMs: { ...this.phaseMs },
      counters: { ...this.counters }
    };
  }
}
