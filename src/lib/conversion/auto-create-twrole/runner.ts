import {
  AUTO_CREATE_SNAPSHOT_VERSION,
  AutoCreateTwroleStoppedError,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  autoCreateSnapshotSettingsSignature,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleProgressStage,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings,
  type RunAutoCreateTwroleOptions
} from './contracts';
import { ColorLearningCollage } from './collageEngine';
import { roleExportScaleForTarget } from './candidateSearch';
import { SeededRandom } from './numericCore';
import { nextFrame, throwIfAborted } from './platform';
import {
  loadSourceTiles,
  loadTargetImage,
  sourceSignatureForTiles,
  targetSignatureForImage
} from './sourcePipeline';
import { AutoCreateDiagnosticsCollector } from './diagnostics';

function hasValidSnapshotState(snapshot: NonNullable<RunAutoCreateTwroleOptions['resumeSnapshot']>): boolean {
  const counters = [snapshot.accepted, snapshot.rejected, snapshot.pruned, snapshot.replaced];
  return (
    Number.isInteger(snapshot.step) &&
    Number.isInteger(snapshot.totalSteps) &&
    Number.isInteger(snapshot.seed) &&
    Number.isInteger(snapshot.rngState) &&
    snapshot.rngState >= 1 &&
    snapshot.rngState <= 0xffffffff &&
    (snapshot.rngSpareNormal === null || Number.isFinite(snapshot.rngSpareNormal)) &&
    counters.every((value) => Number.isInteger(value) && value >= 0) &&
    Number.isFinite(snapshot.mse) &&
    snapshot.mse >= 0 &&
    Number.isInteger(snapshot.finalPruneStep) &&
    snapshot.finalPruneStep >= 0 &&
    typeof snapshot.settingsSignature === 'string' &&
    snapshot.settingsSignature.length > 0 &&
    typeof snapshot.experienceState === 'string' &&
    snapshot.experienceState.length > 0 &&
    Array.isArray(snapshot.tiles) &&
    snapshot.accepted - snapshot.pruned === snapshot.tiles.length &&
    Array.isArray(snapshot.warnings) &&
    snapshot.warnings.every((warning) => typeof warning === 'string')
  );
}

export function createProgress(collage: ColorLearningCollage, stage: AutoCreateTwroleProgressStage, step: number, total: number, message?: string): AutoCreateTwroleProgress {
  return {
    stage,
    step,
    total,
    mse: collage.currentMse(),
    active: collage.activeCount(),
    accepted: collage.accepted,
    rejected: collage.rejected,
    pruned: collage.pruned,
    replaced: collage.replaced,
    message
  };
}

export async function runAutoCreateTwrole(options: RunAutoCreateTwroleOptions): Promise<AutoCreateTwroleResult> {
  return runAutoCreateTwroleInternal(options, null);
}

export async function runAutoCreateTwroleWithDiagnostics(
  options: RunAutoCreateTwroleOptions,
  diagnostics: AutoCreateDiagnosticsCollector
): Promise<AutoCreateTwroleResult> {
  return runAutoCreateTwroleInternal(options, diagnostics);
}

async function runAutoCreateTwroleInternal({
  targetFile,
  decoOptions,
  settings: rawSettings,
  resumeSnapshot,
  signal,
  onProgress,
  onCheckpoint
}: RunAutoCreateTwroleOptions, diagnostics: AutoCreateDiagnosticsCollector | null): Promise<AutoCreateTwroleResult> {
  const settings: AutoCreateTwroleSettings = { ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS, ...rawSettings };
  throwIfAborted(signal);

  const target = diagnostics
    ? await diagnostics.measureAsync('targetLoad', () => loadTargetImage(targetFile, settings))
    : await loadTargetImage(targetFile, settings);
  throwIfAborted(signal);

  const loadSources = () => loadSourceTiles(decoOptions, settings, signal, (done, total) => {
    onProgress?.({
      stage: 'sources',
      step: done,
      total,
      mse: 0,
      active: 0,
      accepted: 0,
      rejected: 0,
      pruned: 0,
      replaced: 0,
      message: 'sources ' + done + '/' + total
    });
  });
  const sourceLoad = diagnostics
    ? await diagnostics.measureAsync('sourceLoad', loadSources)
    : await loadSources();

  if (!sourceLoad.sources.length) {
    throw new Error('No usable deco sources were found. Check the current deco palette and atlas PNG assets.');
  }

  const totalSteps = Math.max(1, Math.round(settings.tiles));
  const logEvery = Math.max(1, Math.round(settings.logEvery));
  const exportEvery = Math.round(settings.exportEvery);
  const sourceSignature = sourceSignatureForTiles(sourceLoad.sources);
  const targetSignature = targetSignatureForImage(target);
  const settingsSignature = autoCreateSnapshotSettingsSignature(settings);
  const canResume = Boolean(
    resumeSnapshot &&
      hasValidSnapshotState(resumeSnapshot) &&
      resumeSnapshot.version === AUTO_CREATE_SNAPSHOT_VERSION &&
      resumeSnapshot.targetWidth === target.width &&
      resumeSnapshot.targetHeight === target.height &&
      resumeSnapshot.sourceWidth === target.sourceWidth &&
      resumeSnapshot.sourceHeight === target.sourceHeight &&
      resumeSnapshot.sourceCount === sourceLoad.sources.length &&
      resumeSnapshot.sourceSignature === sourceSignature &&
      resumeSnapshot.targetSignature === targetSignature &&
      resumeSnapshot.settingsSignature === settingsSignature &&
      resumeSnapshot.totalSteps === totalSteps &&
      resumeSnapshot.step >= 0 &&
      resumeSnapshot.step <= totalSteps &&
      resumeSnapshot.finalPruneStep <= Math.max(0, Math.round(settings.finalPruneRounds)) &&
      (resumeSnapshot.finalPruneStep === 0 || resumeSnapshot.step === totalSteps)
  );

  const fallbackSeed = settings.seed > 0 ? settings.seed : Math.floor(Date.now() % 2147483647);
  let seed = canResume && resumeSnapshot ? resumeSnapshot.seed : fallbackSeed;
  let rng = new SeededRandom(seed);
  const createCollage = (collageRng: SeededRandom) => new ColorLearningCollage(
    sourceLoad.sources,
    target.straight,
    target.premult,
    target.mask,
    target.placementMask,
    target.width,
    target.height,
    collageRng,
    settings,
    diagnostics
  );
  const instantiateCollage = (collageRng: SeededRandom) => diagnostics
    ? diagnostics.measure('engineInit', () => createCollage(collageRng))
    : createCollage(collageRng);
  let collage = instantiateCollage(rng);
  let didResume = false;

  if (canResume && resumeSnapshot) {
    if (collage.restoreFromSnapshot(resumeSnapshot)) {
      rng.restore(resumeSnapshot.rngState, resumeSnapshot.rngSpareNormal);
      didResume = true;
    } else {
      // Restore is transactional. If any tile fails strict geometry or alpha
      // validation, discard the complete checkpoint and start from a clean RNG.
      seed = fallbackSeed;
      rng = new SeededRandom(seed);
      collage = instantiateCollage(rng);
    }
  }

  const buildResult = (previewDataUrl: string): AutoCreateTwroleResult => {
    const decorations = collage.exportDecorations();
    return {
      decorations,
      exportJson: { deco: collage.exportLegacyDeco() },
      previewDataUrl,
      targetWidth: target.width,
      targetHeight: target.height,
      sourceWidth: target.sourceWidth,
      sourceHeight: target.sourceHeight,
      sourceCount: sourceLoad.sources.length,
      insertScale: roleExportScaleForTarget(target.width, target.height),
      mse: collage.currentMse(),
      accepted: collage.accepted,
      rejected: collage.rejected,
      pruned: collage.pruned,
      replaced: collage.replaced,
      warnings: sourceLoad.warnings
    };
  };
  const createResult = async (): Promise<AutoCreateTwroleResult> => {
    const previewDataUrl = diagnostics
      ? await diagnostics.measureAsync('workerPreview', () => collage.previewDataUrl())
      : await collage.previewDataUrl();
    return diagnostics
      ? diagnostics.measure('resultBuild', () => buildResult(previewDataUrl))
      : buildResult(previewDataUrl);
  };

  const publishCheckpoint = async (
    stage: AutoCreateTwroleProgressStage,
    progressStep: number,
    progressTotal: number,
    snapshotStep: number,
    finalPruneStep = 0,
    message?: string
  ): Promise<AutoCreateTwroleCheckpoint> => {
    const buildCheckpoint = async (): Promise<AutoCreateTwroleCheckpoint> => {
      const progress = createProgress(collage, stage, progressStep, progressTotal, message);
      const result = await createResult();
      return {
        progress,
        result,
        snapshot: collage.createSnapshot(
          snapshotStep,
          totalSteps,
          finalPruneStep,
          seed,
          target,
          targetSignature,
          sourceLoad.warnings
        )
      };
    };
    const checkpoint = diagnostics
      ? await diagnostics.measureAsync('checkpoint', buildCheckpoint)
      : await buildCheckpoint();
    diagnostics?.add('checkpointsBuilt');
    onCheckpoint?.(checkpoint);
    return checkpoint;
  };
  const publishStoppedCheckpointWithResult = (
    result: AutoCreateTwroleResult,
    stage: AutoCreateTwroleProgressStage,
    progressStep: number,
    progressTotal: number,
    snapshotStep: number,
    finalPruneStep: number
  ): AutoCreateTwroleCheckpoint => {
    const buildCheckpoint = (): AutoCreateTwroleCheckpoint => ({
      progress: createProgress(collage, stage, progressStep, progressTotal, 'stopped'),
      result,
      snapshot: collage.createSnapshot(
        snapshotStep,
        totalSteps,
        finalPruneStep,
        seed,
        target,
        targetSignature,
        sourceLoad.warnings
      )
    });
    const checkpoint = diagnostics
      ? diagnostics.measure('checkpoint', buildCheckpoint)
      : buildCheckpoint();
    diagnostics?.add('checkpointsBuilt');
    onCheckpoint?.(checkpoint);
    return checkpoint;
  };

  let startStep = 1;
  if (didResume && resumeSnapshot) {
    const restoredStep = Math.min(totalSteps, Math.max(0, Math.round(resumeSnapshot.step)));
    startStep = Math.min(totalSteps + 1, restoredStep + 1);
    onProgress?.(createProgress(collage, 'run', restoredStep, totalSteps, 'resumed'));
  }

  const finishRunDiagnostics = diagnostics?.begin('run');
  try {
    for (let step = startStep; step <= totalSteps; step += 1) {
      if (signal?.aborted) {
        const stoppedStep = Math.max(0, step - 1);
        const checkpoint = await publishCheckpoint('run', stoppedStep, totalSteps, stoppedStep, 0, 'stopped');
        throw new AutoCreateTwroleStoppedError({ result: checkpoint.result, checkpoint });
      }

      let didWork = false;
      const active = collage.activeCount();

      if (settings.tileBudget > 0 && active >= settings.tileBudget) {
        if (step % 2 === 0) didWork = collage.tryReplaceOnce(step, totalSteps);
        if (!didWork) didWork = collage.tryPruneOnce();
      } else {
        didWork = collage.tryAdd(step, totalSteps);
        if (step % Math.max(1, Math.round(settings.removeEvery)) === 0 && collage.activeCount() > 0) {
          collage.tryPrune(settings.pruneRounds);
        }
        if (step % Math.max(1, Math.round(settings.replaceEvery)) === 0 && collage.activeCount() > 0) {
          collage.tryReplaceOnce(step, totalSteps);
        }
      }

      if (step % Math.max(250, Math.round(settings.fullErrorRecomputeEvery)) === 0) {
        collage.recomputeErrors();
      }

      if (step === 1 || step % logEvery === 0 || step === totalSteps) {
        onProgress?.(createProgress(collage, 'run', step, totalSteps, didWork ? 'accepted/refined' : 'searched'));
        await nextFrame();
      }

      if (exportEvery > 0 && (step === 1 || step % exportEvery === 0 || step === totalSteps)) {
        collage.saveMemory();
        await publishCheckpoint('run', step, totalSteps, step, 0, 'checkpoint');
        await nextFrame();
      }
    }
  } finally {
    finishRunDiagnostics?.();
  }

  const finalRounds = Math.max(0, Math.round(settings.finalPruneRounds));
  let completedFinalPruneRounds = didResume && resumeSnapshot
    ? Math.min(finalRounds, Math.max(0, Math.round(resumeSnapshot.finalPruneStep)))
    : 0;
  const finishFinalPruneDiagnostics = diagnostics?.begin('finalPrune');
  try {
    if (finalRounds > 0) {
      for (let i = completedFinalPruneRounds; i < finalRounds; i += 1) {
        if (signal?.aborted) {
          const checkpoint = await publishCheckpoint(
            'final',
            completedFinalPruneRounds,
            finalRounds,
            totalSteps,
            completedFinalPruneRounds,
            'stopped'
          );
          throw new AutoCreateTwroleStoppedError({ result: checkpoint.result, checkpoint });
        }
        if (!collage.tryPruneOnce()) {
          completedFinalPruneRounds = finalRounds;
          break;
        }
        completedFinalPruneRounds = i + 1;
        if (i % 10 === 0) {
          onProgress?.(createProgress(collage, 'final', i + 1, finalRounds, 'final prune'));
          await nextFrame();
        }
      }
    }
  } finally {
    finishFinalPruneDiagnostics?.();
  }

  if (signal?.aborted) {
    const checkpoint = await publishCheckpoint(
      'final',
      completedFinalPruneRounds,
      finalRounds || 1,
      totalSteps,
      completedFinalPruneRounds,
      'stopped'
    );
    throw new AutoCreateTwroleStoppedError({ result: checkpoint.result, checkpoint });
  }

  collage.recomputeErrors();
  collage.saveMemory();
  onProgress?.(createProgress(collage, 'final', finalRounds, finalRounds || 1, 'done'));

  const result = await createResult();
  if (signal?.aborted) {
    const checkpoint = publishStoppedCheckpointWithResult(
      result,
      'final',
      finalRounds,
      finalRounds || 1,
      totalSteps,
      finalRounds
    );
    throw new AutoCreateTwroleStoppedError({ result, checkpoint });
  }
  return result;
}
