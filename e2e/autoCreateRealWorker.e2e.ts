import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';

interface NormalizedAutoCreateResult {
  exportJson: { deco: Array<{ c: string; x: number; y: number; sx: number; sy: number; r: number }> };
  mse: number;
  accepted: number;
  rejected: number;
  pruned: number;
  replaced: number;
  targetWidth: number;
  targetHeight: number;
  sourceCount: number;
}

interface RealWorkerLifecycleResult {
  uninterrupted: NormalizedAutoCreateResult;
  resumed: NormalizedAutoCreateResult;
  stopped: {
    errorName: string;
    checkpointStep: number;
    checkpointVersion: number;
    checkpointTotalSteps: number;
    progressMessage?: string;
    callbackCheckpointSteps: number[];
  };
  pixels: {
    previewHash: string;
    insertedHash: string;
    outsideAlphaPixels: number;
    renderedAlphaPixels: number;
    rotatedDecorationCount: number;
  };
}

test('real Chromium Worker completes, checkpoints on stop, and resumes deterministically', async ({ page }) => {
  test.setTimeout(120_000);

  let dedicatedWorkers = 0;
  page.on('worker', () => {
    dedicatedWorkers += 1;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const lifecycle = await page.evaluate(async (): Promise<RealWorkerLifecycleResult> => {
    const [
      { runAutoCreateTwroleInWorker },
      { filterPartOptionsByCamp },
      { renderAutoCreateWorkspacePreview },
      { renderFullRoleToDataUrl },
      { insertDecorationBatchIntoRole },
      { DEFAULT_INSERT_SETTINGS },
      { makeRoleDocument }
    ] = await Promise.all([
      import('/src/lib/conversion/autoCreateTwroleWorkerClient.ts'),
      import('/src/mock/options.ts'),
      import('/src/components/auto-create/autoCreateWorkspacePreview.ts'),
      import('/src/lib/stage/fullRoleRenderer.ts'),
      import('/src/lib/editor/editorImportMerge.ts'),
      import('/src/lib/editor/editorInsertSettings.ts'),
      import('/src/test/roleFixtures.ts')
    ]);

    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in the E2E browser.');

    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const dx = x - (size - 1) / 2;
        const dy = y - (size - 1) / 2;
        const inside = dx * dx + dy * dy <= 13 * 13;
        rgba[offset] = (x * 17 + y * 3) & 0xff;
        rgba[offset + 1] = (x * 5 + y * 13) & 0xff;
        rgba[offset + 2] = (x * 7 + y * 11) & 0xff;
        rgba[offset + 3] = inside ? 255 : 0;
      }
    }
    context.putImageData(new ImageData(rgba, size, size), 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Could not encode the E2E target.'));
      }, 'image/png');
    });
    const targetFile = new File([blob], 'auto-create-worker-e2e.png', {
      type: 'image/png',
      lastModified: 0
    });
    // Two known-good atlas frames ensure checkpoint determinism also covers
    // the adaptive ExperienceMemory source/color statistics.
    const decoOptions = filterPartOptionsByCamp('deco', 'skydow')
      .filter((option) => option.code === 'skydow_deco_25' || option.code === 'skydow_deco_26');
    const settings = {
      tiles: 24,
      tileBudget: 24,
      seed: 0x51a7c0de,
      logEvery: 1,
      exportEvery: 4,
      candidateBatch: 24,
      replaceCandidateBatch: 8,
      colorTopk: 12,
      finalPruneRounds: 0,
      variantCacheItems: 256,
      experienceJson: 'auto-create-real-worker-e2e.json',
      resetExperience: true
    };

    const normalize = (result: Awaited<ReturnType<typeof runAutoCreateTwroleInWorker>>): NormalizedAutoCreateResult => ({
      exportJson: result.exportJson,
      mse: result.mse,
      accepted: result.accepted,
      rejected: result.rejected,
      pruned: result.pruned,
      replaced: result.replaced,
      targetWidth: result.targetWidth,
      targetHeight: result.targetHeight,
      sourceCount: result.sourceCount
    });

    const uninterrupted = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings
    });

    const blankRole = makeRoleDocument({ decorations: [], groups: [] });
    const preview = await renderAutoCreateWorkspacePreview({ role: blankRole, result: uninterrupted });
    const inserted = insertDecorationBatchIntoRole(
      blankRole,
      uninterrupted.decorations,
      'AutoCreate E2E',
      DEFAULT_INSERT_SETTINGS
    );
    if (!inserted) throw new Error('AutoCreate E2E did not produce any insertable decorations.');
    const workspaceRender = await renderFullRoleToDataUrl(inserted.role, {
      width: uninterrupted.targetWidth,
      height: uninterrupted.targetHeight,
      background: 'transparent',
      stageScale: 1 / uninterrupted.insertScale,
      includeImageData: true,
      debug: { onlyDecorations: true, hideHeadLayer: true }
    });
    if (!workspaceRender.imageData) throw new Error('Could not read the inserted workspace pixels.');

    const previewImage = new Image();
    previewImage.src = preview.dataUrl;
    await previewImage.decode();
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = uninterrupted.targetWidth;
    previewCanvas.height = uninterrupted.targetHeight;
    const previewContext = previewCanvas.getContext('2d');
    if (!previewContext) throw new Error('Could not decode the workspace preview pixels.');
    previewContext.drawImage(previewImage, 0, 0);
    const previewPixels = previewContext.getImageData(
      0,
      0,
      uninterrupted.targetWidth,
      uninterrupted.targetHeight
    ).data;
    const insertedPixels = workspaceRender.imageData.data;
    const hashPixels = async (pixels: Uint8ClampedArray): Promise<string> => {
      const bytes = new Uint8Array(pixels.buffer.slice(
        pixels.byteOffset,
        pixels.byteOffset + pixels.byteLength
      ));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    };
    let outsideAlphaPixels = 0;
    let renderedAlphaPixels = 0;
    for (let pixel = 0; pixel < size * size; pixel += 1) {
      const outputAlpha = insertedPixels[pixel * 4 + 3];
      if (outputAlpha > 0) renderedAlphaPixels += 1;
      if (rgba[pixel * 4 + 3] === 0 && outputAlpha > 0) outsideAlphaPixels += 1;
    }
    const pixels = {
      previewHash: await hashPixels(previewPixels),
      insertedHash: await hashPixels(insertedPixels),
      outsideAlphaPixels,
      renderedAlphaPixels,
      rotatedDecorationCount: uninterrupted.decorations.filter((decoration) => Math.abs(decoration.rotation) > 1.0e-6).length
    };

    const controller = new AbortController();
    const callbackCheckpointSteps: number[] = [];
    let stoppedCheckpoint: {
      progress: { message?: string };
      snapshot: { step: number; version: number; totalSteps: number };
    } | null = null;
    let errorName = '';

    try {
      await runAutoCreateTwroleInWorker({
        targetFile,
        decoOptions,
        settings,
        signal: controller.signal,
        onProgress(progress) {
          if (progress.stage === 'run' && progress.step >= 1) controller.abort();
        },
        onCheckpoint(checkpoint) {
          callbackCheckpointSteps.push(checkpoint.snapshot.step);
          stoppedCheckpoint = checkpoint;
        }
      });
      throw new Error('The stopped Worker run unexpectedly completed.');
    } catch (error) {
      errorName = error instanceof Error ? error.name : String(error);
      const stoppedError = error as {
        checkpoint?: {
          progress: { message?: string };
          snapshot: { step: number; version: number; totalSteps: number };
        };
      };
      stoppedCheckpoint = stoppedError.checkpoint ?? stoppedCheckpoint;
    }

    if (!stoppedCheckpoint) throw new Error('The stopped Worker run did not return a checkpoint.');
    const checkpoint = stoppedCheckpoint;
    const resumed = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings,
      resumeSnapshot: checkpoint.snapshot as Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']
    });

    return {
      uninterrupted: normalize(uninterrupted),
      resumed: normalize(resumed),
      stopped: {
        errorName,
        checkpointStep: checkpoint.snapshot.step,
        checkpointVersion: checkpoint.snapshot.version,
        checkpointTotalSteps: checkpoint.snapshot.totalSteps,
        progressMessage: checkpoint.progress.message,
        callbackCheckpointSteps
      },
      pixels
    };
  });

  expect(dedicatedWorkers).toBeGreaterThanOrEqual(3);
  expect(lifecycle.uninterrupted.targetWidth).toBe(32);
  expect(lifecycle.uninterrupted.targetHeight).toBe(32);
  expect(lifecycle.uninterrupted.sourceCount).toBeGreaterThan(0);
  expect(lifecycle.stopped).toMatchObject({
    errorName: 'AutoCreateTwroleStoppedError',
    checkpointVersion: 4,
    checkpointTotalSteps: 24,
    progressMessage: 'stopped'
  });
  expect(lifecycle.stopped.checkpointStep).toBeGreaterThanOrEqual(1);
  expect(lifecycle.stopped.checkpointStep).toBeLessThan(24);
  expect(lifecycle.stopped.callbackCheckpointSteps).toContain(lifecycle.stopped.checkpointStep);
  expect(lifecycle.uninterrupted.accepted).toBeGreaterThan(0);
  expect(lifecycle.pixels.renderedAlphaPixels).toBeGreaterThan(0);
  expect(lifecycle.pixels.rotatedDecorationCount).toBeGreaterThan(0);
  expect(lifecycle.pixels.outsideAlphaPixels).toBe(0);
  expect(lifecycle.pixels.previewHash).toBe(lifecycle.pixels.insertedHash);

  // Decoration layer IDs and PNG bytes are intentionally excluded. The legacy
  // export, scores and counters are the deterministic engine contract.
  expect(lifecycle.resumed).toEqual(lifecycle.uninterrupted);
  const normalizedHash = createHash('sha256')
    .update(JSON.stringify(lifecycle.uninterrupted))
    .digest('hex');
  expect(normalizedHash).toBe('a881316f57f02d89d9d190f41138ff115b87ef4d74bccec3218132c6b5ff1ab4');
});

test('real Chromium Worker resumes v4 but safely restarts v1-v3 and malformed v4 snapshots', async ({ page }) => {
  test.setTimeout(120_000);

  let dedicatedWorkers = 0;
  page.on('worker', () => {
    dedicatedWorkers += 1;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const comparison = await page.evaluate(async () => {
    const [{ runAutoCreateTwroleInWorker }, { filterPartOptionsByCamp }] = await Promise.all([
      import('/src/lib/conversion/autoCreateTwroleWorkerClient.ts'),
      import('/src/mock/options.ts')
    ]);

    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in the E2E browser.');

    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        rgba[offset] = (x * 19 + y * 7) & 0xff;
        rgba[offset + 1] = (x * 3 + y * 23) & 0xff;
        rgba[offset + 2] = (x * 11 + y * 5) & 0xff;
        rgba[offset + 3] = 255;
      }
    }
    context.putImageData(new ImageData(rgba, size, size), 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Could not encode the v4 snapshot E2E target.'));
      }, 'image/png');
    });
    const targetFile = new File([blob], 'auto-create-v4-snapshot-e2e.png', {
      type: 'image/png',
      lastModified: 0
    });

    const goodSource = filterPartOptionsByCamp('deco', 'skydow')
      .find((option) => option.code === 'skydow_deco_25');
    if (!goodSource) throw new Error('The known-good AutoCreate E2E source is missing.');
    const badSource = {
      ...goodSource,
      id: 'auto-create-e2e-broken-source',
      code: 'auto_create_e2e_broken_source',
      label: 'Broken E2E source',
      icon: '/__auto_create_e2e_missing_source__.png',
      atlas: undefined,
      source: 'mock' as const
    };
    const decoOptions = [goodSource, badSource];
    const settings = {
      tiles: 12,
      tileBudget: 12,
      seed: 0x13579bdf,
      logEvery: 1,
      exportEvery: 4,
      candidateBatch: 16,
      replaceCandidateBatch: 8,
      colorTopk: 8,
      finalPruneRounds: 1,
      variantCacheItems: 128,
      experienceJson: 'auto-create-v4-snapshot-e2e.json',
      resetExperience: true
    };

    const normalize = (result: Awaited<ReturnType<typeof runAutoCreateTwroleInWorker>>): NormalizedAutoCreateResult => ({
      exportJson: result.exportJson,
      mse: result.mse,
      accepted: result.accepted,
      rejected: result.rejected,
      pruned: result.pruned,
      replaced: result.replaced,
      targetWidth: result.targetWidth,
      targetHeight: result.targetHeight,
      sourceCount: result.sourceCount
    });

    const fresh = await runAutoCreateTwroleInWorker({ targetFile, decoOptions, settings });
    const stopController = new AbortController();
    let validV4Checkpoint: { snapshot: NonNullable<Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']> } | null = null;
    try {
      await runAutoCreateTwroleInWorker({
        targetFile,
        decoOptions,
        settings,
        signal: stopController.signal,
        onCheckpoint(checkpoint) {
          if (validV4Checkpoint) return;
          validV4Checkpoint = checkpoint;
          stopController.abort();
        }
      });
    } catch (stopped) {
      validV4Checkpoint = validV4Checkpoint
        ?? (stopped as { checkpoint?: typeof validV4Checkpoint })?.checkpoint
        ?? null;
    }
    if (!validV4Checkpoint) throw new Error('Could not create a valid v4 checkpoint for resume testing.');

    const resumedProgressMessages: string[] = [];
    const resumedV4 = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings,
      resumeSnapshot: validV4Checkpoint.snapshot,
      onProgress(progress) {
        if (progress.message) resumedProgressMessages.push(progress.message);
      }
    });

    const legacyRuns = [];
    for (const version of [1, 2, 3]) {
      const progressMessages: string[] = [];
      const legacySnapshot = {
        ...validV4Checkpoint.snapshot,
        version
      } as NonNullable<Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']>;
      const result = await runAutoCreateTwroleInWorker({
        targetFile,
        decoOptions,
        settings,
        resumeSnapshot: legacySnapshot,
        onProgress(progress) {
          if (progress.message) progressMessages.push(progress.message);
        }
      });
      legacyRuns.push({ version, result: normalize(result), progressMessages });
    }

    const malformedV4Snapshot = {
      ...validV4Checkpoint.snapshot,
      tiles: [null]
    } as unknown as NonNullable<Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']>;
    const malformedV4ProgressMessages: string[] = [];
    const fromMalformedV4 = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings,
      resumeSnapshot: malformedV4Snapshot,
      onProgress(progress) {
        if (progress.message) malformedV4ProgressMessages.push(progress.message);
      }
    });

    const missingFinalPruneStepSnapshot = {
      ...validV4Checkpoint.snapshot
    } as Partial<typeof validV4Checkpoint.snapshot>;
    delete missingFinalPruneStepSnapshot.finalPruneStep;
    const missingFinalPruneStepProgressMessages: string[] = [];
    const fromMissingFinalPruneStep = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings,
      resumeSnapshot: missingFinalPruneStepSnapshot as NonNullable<Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']>,
      onProgress(progress) {
        if (progress.message) missingFinalPruneStepProgressMessages.push(progress.message);
      }
    });

    const invalidStateSnapshots = [
      {
        kind: 'fractional-step',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          step: validV4Checkpoint.snapshot.step + 0.5
        }
      },
      {
        kind: 'final-prune-before-run-finished',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          step: Math.min(validV4Checkpoint.snapshot.step, validV4Checkpoint.snapshot.totalSteps - 1),
          finalPruneStep: 1
        }
      },
      {
        kind: 'invalid-rng-state',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          rngState: 0
        }
      },
      {
        kind: 'inconsistent-counters',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          accepted: validV4Checkpoint.snapshot.accepted + 1
        }
      },
      {
        kind: 'settings-signature-mismatch',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          settingsSignature: `${validV4Checkpoint.snapshot.settingsSignature}:changed`
        }
      },
      {
        kind: 'malformed-experience-state',
        snapshot: {
          ...validV4Checkpoint.snapshot,
          experienceState: '{bad'
        }
      }
    ];
    const invalidStateRuns = [];
    for (const invalid of invalidStateSnapshots) {
      const progressMessages: string[] = [];
      const result = await runAutoCreateTwroleInWorker({
        targetFile,
        decoOptions,
        settings,
        resumeSnapshot: invalid.snapshot,
        onProgress(progress) {
          if (progress.message) progressMessages.push(progress.message);
        }
      });
      invalidStateRuns.push({
        kind: invalid.kind,
        result: normalize(result),
        progressMessages
      });
    }

    return {
      fresh: normalize(fresh),
      checkpointVersion: validV4Checkpoint.snapshot.version,
      resumedV4: normalize(resumedV4),
      legacyRuns,
      fromMalformedV4: normalize(fromMalformedV4),
      resumedProgressMessages,
      malformedV4ProgressMessages,
      fromMissingFinalPruneStep: normalize(fromMissingFinalPruneStep),
      missingFinalPruneStepProgressMessages,
      invalidStateRuns,
      warnings: fromMalformedV4.warnings
    };
  });

  expect(dedicatedWorkers).toBeGreaterThanOrEqual(10);
  expect(comparison.checkpointVersion).toBe(4);
  expect(comparison.resumedProgressMessages).toContain('resumed');
  expect(comparison.resumedV4).toEqual(comparison.fresh);
  for (const legacy of comparison.legacyRuns) {
    expect(legacy.progressMessages).not.toContain('resumed');
    expect(legacy.result).toEqual(comparison.fresh);
  }
  expect(comparison.legacyRuns.map((legacy) => legacy.version)).toEqual([1, 2, 3]);
  expect(comparison.malformedV4ProgressMessages).not.toContain('resumed');
  expect(comparison.fromMalformedV4).toEqual(comparison.fresh);
  expect(comparison.missingFinalPruneStepProgressMessages).not.toContain('resumed');
  expect(comparison.fromMissingFinalPruneStep).toEqual(comparison.fresh);
  expect(comparison.invalidStateRuns.map((run) => run.kind)).toEqual([
    'fractional-step',
    'final-prune-before-run-finished',
    'invalid-rng-state',
    'inconsistent-counters',
    'settings-signature-mismatch',
    'malformed-experience-state'
  ]);
  for (const invalid of comparison.invalidStateRuns) {
    expect(invalid.progressMessages).not.toContain('resumed');
    expect(invalid.result).toEqual(comparison.fresh);
  }
  expect(comparison.fromMalformedV4.sourceCount).toBe(1);
  expect(comparison.warnings.some((warning) => warning.includes('Broken E2E source'))).toBe(true);
});

test('real Chromium Worker stops and resumes final prune without duplicate checkpoints or result drift', async ({ page }) => {
  test.setTimeout(120_000);

  let dedicatedWorkers = 0;
  page.on('worker', () => {
    dedicatedWorkers += 1;
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const lifecycle = await page.evaluate(async () => {
    const [{ runAutoCreateTwroleInWorker }, { filterPartOptionsByCamp }] = await Promise.all([
      import('/src/lib/conversion/autoCreateTwroleWorkerClient.ts'),
      import('/src/mock/options.ts')
    ]);

    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in the final-prune E2E browser.');

    const rgba = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        const dx = x - (size - 1) / 2;
        const dy = y - (size - 1) / 2;
        const inside = dx * dx + dy * dy <= 13 * 13;
        rgba[offset] = (x * 17 + y * 3) & 0xff;
        rgba[offset + 1] = (x * 5 + y * 13) & 0xff;
        rgba[offset + 2] = (x * 7 + y * 11) & 0xff;
        rgba[offset + 3] = inside ? 255 : 0;
      }
    }
    context.putImageData(new ImageData(rgba, size, size), 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Could not encode the final-prune E2E target.'));
      }, 'image/png');
    });
    const targetFile = new File([blob], 'auto-create-final-prune-e2e.png', {
      type: 'image/png',
      lastModified: 0
    });
    const decoOptions = filterPartOptionsByCamp('deco', 'skydow')
      .filter((option) => option.code === 'skydow_deco_25');
    const settings = {
      tiles: 24,
      tileBudget: 24,
      seed: 0x51a7c0de,
      logEvery: 1,
      // Keep the callback count isolated to the terminal final-prune stop.
      exportEvery: 0,
      candidateBatch: 24,
      replaceCandidateBatch: 8,
      colorTopk: 12,
      removeEvery: 100_000,
      replaceEvery: 100_000,
      finalPruneRounds: 8,
      // Make each final-prune round removable without changing add scoring.
      prunePenaltyFactor: 1.0e12,
      variantCacheItems: 256,
      experienceJson: 'auto-create-final-prune-e2e.json',
      resetExperience: true
    };

    const normalize = (result: Awaited<ReturnType<typeof runAutoCreateTwroleInWorker>>): NormalizedAutoCreateResult => ({
      exportJson: result.exportJson,
      mse: result.mse,
      accepted: result.accepted,
      rejected: result.rejected,
      pruned: result.pruned,
      replaced: result.replaced,
      targetWidth: result.targetWidth,
      targetHeight: result.targetHeight,
      sourceCount: result.sourceCount
    });

    const uninterrupted = await runAutoCreateTwroleInWorker({ targetFile, decoOptions, settings });
    if (uninterrupted.accepted <= 0) {
      throw new Error('The final-prune E2E fixture did not create a prunable decoration.');
    }

    const stopController = new AbortController();
    const callbackCheckpoints: Array<{
      stage: string;
      message?: string;
      snapshotStep: number;
      finalPruneStep: number;
    }> = [];
    const stoppedProgressMessages: string[] = [];
    let stoppedErrorName = '';
    let stoppedCheckpoint: {
      progress: { stage: string; message?: string };
      snapshot: NonNullable<Parameters<typeof runAutoCreateTwroleInWorker>[0]['resumeSnapshot']>;
    } | null = null;

    try {
      await runAutoCreateTwroleInWorker({
        targetFile,
        decoOptions,
        settings,
        signal: stopController.signal,
        onProgress(progress) {
          if (progress.message) stoppedProgressMessages.push(progress.message);
          if (progress.stage === 'final' && progress.message === 'final prune' && progress.step >= 1) {
            stopController.abort();
          }
        },
        onCheckpoint(checkpoint) {
          callbackCheckpoints.push({
            stage: checkpoint.progress.stage,
            message: checkpoint.progress.message,
            snapshotStep: checkpoint.snapshot.step,
            finalPruneStep: checkpoint.snapshot.finalPruneStep
          });
          stoppedCheckpoint = checkpoint;
        }
      });
      throw new Error('The final-prune stop run unexpectedly completed.');
    } catch (caught) {
      stoppedErrorName = caught instanceof Error ? caught.name : String(caught);
      stoppedCheckpoint = (caught as { checkpoint?: typeof stoppedCheckpoint }).checkpoint ?? stoppedCheckpoint;
    }

    if (!stoppedCheckpoint) throw new Error('The final-prune stop did not produce a checkpoint.');
    const checkpoint = stoppedCheckpoint;
    const resumedProgressMessages: string[] = [];
    const resumed = await runAutoCreateTwroleInWorker({
      targetFile,
      decoOptions,
      settings,
      resumeSnapshot: checkpoint.snapshot,
      onProgress(progress) {
        if (progress.message) resumedProgressMessages.push(progress.message);
      }
    });

    return {
      uninterrupted: normalize(uninterrupted),
      resumed: normalize(resumed),
      stoppedErrorName,
      stoppedProgressMessages,
      resumedProgressMessages,
      callbackCheckpoints,
      terminalCheckpoint: {
        stage: checkpoint.progress.stage,
        message: checkpoint.progress.message,
        snapshotStep: checkpoint.snapshot.step,
        totalSteps: checkpoint.snapshot.totalSteps,
        finalPruneStep: checkpoint.snapshot.finalPruneStep
      }
    };
  });

  expect(dedicatedWorkers).toBeGreaterThanOrEqual(3);
  expect(lifecycle.stoppedErrorName).toBe('AutoCreateTwroleStoppedError');
  expect(lifecycle.stoppedProgressMessages).toContain('final prune');
  expect(lifecycle.callbackCheckpoints).toHaveLength(1);
  expect(lifecycle.callbackCheckpoints[0]).toMatchObject({
    stage: 'final',
    message: 'stopped',
    finalPruneStep: 1
  });
  expect(lifecycle.terminalCheckpoint).toMatchObject({
    stage: 'final',
    message: 'stopped',
    snapshotStep: 24,
    totalSteps: 24,
    finalPruneStep: 1
  });
  expect(lifecycle.resumedProgressMessages).toContain('resumed');
  expect(lifecycle.resumed).toEqual(lifecycle.uninterrupted);

  const uninterruptedHash = createHash('sha256')
    .update(JSON.stringify(lifecycle.uninterrupted))
    .digest('hex');
  const resumedHash = createHash('sha256')
    .update(JSON.stringify(lifecycle.resumed))
    .digest('hex');
  expect(resumedHash).toBe(uninterruptedHash);
});

test('real Chromium Worker serializes empty and no-placement target errors', async ({ page }) => {
  test.setTimeout(60_000);

  let dedicatedWorkers = 0;
  page.on('worker', () => {
    dedicatedWorkers += 1;
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const errors = await page.evaluate(async () => {
    const [{ runAutoCreateTwroleInWorker }, { filterPartOptionsByCamp }] = await Promise.all([
      import('/src/lib/conversion/autoCreateTwroleWorkerClient.ts'),
      import('/src/mock/options.ts')
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in the E2E browser.');
    const decoOptions = filterPartOptionsByCamp('deco', 'skydow')
      .filter((option) => option.code === 'skydow_deco_25');

    const runInvalidTarget = async (name: string) => {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error(`Could not encode ${name}.`)), 'image/png');
      });
      const targetFile = new File([blob], `${name}.png`, { type: 'image/png', lastModified: 0 });
      try {
        await runAutoCreateTwroleInWorker({
          targetFile,
          decoOptions,
          settings: { tiles: 1, seed: 123, finalPruneRounds: 0, resetExperience: true }
        });
        return { name: '', message: 'unexpected success' };
      } catch (caught) {
        return {
          name: caught instanceof Error ? caught.name : '',
          message: caught instanceof Error ? caught.message : String(caught)
        };
      }
    };

    const transparent = await runInvalidTarget('fully-transparent');
    context.fillStyle = '#ffffff';
    context.fillRect(4, 4, 1, 1);
    const noPlacement = await runInvalidTarget('no-placement-area');
    return { transparent, noPlacement };
  });

  expect(dedicatedWorkers).toBe(2);
  expect(errors.transparent.name).toBe('AutoCreateEmptyTargetError');
  expect(errors.transparent.message).toMatch(/fully transparent/i);
  expect(errors.noPlacement.name).toBe('AutoCreateNoPlacementAreaError');
  expect(errors.noPlacement.message).toMatch(/safely contain/i);
});

test('native AutoCreate rasters match Pixi frame-one output for the three special GAF decorations', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const metrics = await page.evaluate(async () => {
    const [
      { partOptions },
      { optionToSourceTile },
      { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS },
      { renderFullRoleToDataUrl },
      { makeDecorationLayer, makeRoleDocument },
      { resolveGafFrameOneDisplayList },
      { decorationRuntimeManifest }
    ] = await Promise.all([
      import('/src/mock/options.ts'),
      import('/src/lib/conversion/auto-create-twrole/sourcePipeline.ts'),
      import('/src/lib/conversion/auto-create-twrole/contracts.ts'),
      import('/src/lib/stage/fullRoleRenderer.ts'),
      import('/src/test/roleFixtures.ts'),
      import('/src/lib/runtime/gafFrameDisplayList.ts'),
      import('/src/lib/runtime/gafRuntimeManifest.ts')
    ]);
    if (!decorationRuntimeManifest) throw new Error('Expected the GAF decoration runtime manifest.');

    const codes = ['third_deco_05', 'third_xmas_deco_05', 'royal_xmas_deco_06'];
    const output: Array<{
      code: string;
      displayItems: number;
      sourceAlphaPixels: number;
      pixiAlphaPixels: number;
      alphaIou: number;
      alphaSumRatio: number;
      meanPremultipliedError: number;
      sourceMaxAlpha: number;
      pixiMaxAlpha: number;
    }> = [];

    for (let sourceIndex = 0; sourceIndex < codes.length; sourceIndex += 1) {
      const code = codes[sourceIndex];
      const sourceOption = partOptions.deco.find((option) => option.code === code);
      if (!sourceOption) throw new Error(`Missing special GAF option ${code}.`);
      const source = await optionToSourceTile(sourceOption, sourceIndex, {
        ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
        maxTileSize: 40
      });
      if (!source) throw new Error(`Could not rasterize special GAF option ${code}.`);
      const sourceContext = source.canvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new Error(`Could not read source raster ${code}.`);
      const sourcePixels = sourceContext.getImageData(0, 0, source.thumbW, source.thumbH).data;

      const decoration = makeDecorationLayer(`special-${code}`, {
        code,
        assetId: sourceOption.id,
        name: sourceOption.label,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        visible: true
      });
      const canvasSize = 256;
      const rendered = await renderFullRoleToDataUrl(
        makeRoleDocument({ decorations: [decoration], groups: [] }),
        {
          width: canvasSize,
          height: canvasSize,
          background: 'transparent',
          stageScale: 1,
          includeImageData: true,
          debug: { onlyDecorations: true, hideHeadLayer: true }
        }
      );
      if (!rendered.imageData) throw new Error(`Could not read Pixi output ${code}.`);

      const originX = source.localCenterX - source.thumbW / 2;
      const originY = source.localCenterY - source.thumbH / 2;
      const cropX = Math.round(canvasSize / 2 + originX);
      const cropY = Math.round(canvasSize / 2 + originY);
      let sourceAlphaPixels = 0;
      let pixiAlphaPixels = 0;
      let alphaIntersection = 0;
      let alphaUnion = 0;
      let sourceAlphaSum = 0;
      let pixiAlphaSum = 0;
      let premultipliedError = 0;
      let sourceMaxAlpha = 0;
      let pixiMaxAlpha = 0;

      for (let y = 0; y < source.thumbH; y += 1) {
        for (let x = 0; x < source.thumbW; x += 1) {
          const sourceOffset = (y * source.thumbW + x) * 4;
          const pixiOffset = ((cropY + y) * canvasSize + cropX + x) * 4;
          const sourceAlpha = sourcePixels[sourceOffset + 3];
          const pixiAlpha = rendered.imageData.data[pixiOffset + 3];
          const sourceVisible = sourceAlpha > 0;
          const pixiVisible = pixiAlpha > 0;
          if (sourceVisible) sourceAlphaPixels += 1;
          if (pixiVisible) pixiAlphaPixels += 1;
          if (sourceVisible && pixiVisible) alphaIntersection += 1;
          if (sourceVisible || pixiVisible) alphaUnion += 1;
          sourceAlphaSum += sourceAlpha;
          pixiAlphaSum += pixiAlpha;
          sourceMaxAlpha = Math.max(sourceMaxAlpha, sourceAlpha);
          pixiMaxAlpha = Math.max(pixiMaxAlpha, pixiAlpha);
          for (let channel = 0; channel < 3; channel += 1) {
            const sourcePremultiplied = sourcePixels[sourceOffset + channel] * sourceAlpha / 255;
            const pixiPremultiplied = rendered.imageData.data[pixiOffset + channel] * pixiAlpha / 255;
            premultipliedError += Math.abs(sourcePremultiplied - pixiPremultiplied);
          }
          premultipliedError += Math.abs(sourceAlpha - pixiAlpha);
        }
      }

      output.push({
        code,
        displayItems: resolveGafFrameOneDisplayList(decorationRuntimeManifest, code).length,
        sourceAlphaPixels,
        pixiAlphaPixels,
        alphaIou: alphaIntersection / Math.max(1, alphaUnion),
        alphaSumRatio: pixiAlphaSum / Math.max(1, sourceAlphaSum),
        meanPremultipliedError: premultipliedError / Math.max(1, source.thumbW * source.thumbH * 4),
        sourceMaxAlpha,
        pixiMaxAlpha
      });
    }
    return output;
  });

  expect(metrics.map((metric) => metric.displayItems)).toEqual([1, 3, 3]);
  for (const metric of metrics) {
    expect(metric.sourceAlphaPixels, metric.code).toBeGreaterThan(0);
    expect(metric.pixiAlphaPixels, metric.code).toBeGreaterThan(0);
    expect(metric.alphaIou, metric.code).toBeGreaterThan(0.9);
    expect(metric.alphaSumRatio, metric.code).toBeGreaterThan(0.9);
    expect(metric.alphaSumRatio, metric.code).toBeLessThan(1.1);
    expect(metric.meanPremultipliedError, metric.code).toBeLessThan(12);
  }
  const halfAlpha = metrics.find((metric) => metric.code === 'third_deco_05');
  expect(halfAlpha?.sourceMaxAlpha).toBeLessThanOrEqual(128);
  expect(halfAlpha?.pixiMaxAlpha).toBeLessThanOrEqual(128);
});
