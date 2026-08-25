import { expect, test } from '@playwright/test';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZckcAAAAASUVORK5CYII=',
  'base64'
);

test('loopback URL opt-in enables a ready Add-only ranker for one session', async ({
  page
}) => {
  test.setTimeout(60_000);
  await page.goto('/?autoCreateRankerLab=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const [
      { createZeroDenseRankerWeights },
      { createIndexedDbLearningStore }
    ] = await Promise.all([
      import('/src/lib/conversion/auto-create-twrole/learning/denseRanker.ts'),
      import('/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts')
    ]);
    const camp = 'skydow';
    const revision = 'ranker-lab-e2e-add';
    const denseWeights = createZeroDenseRankerWeights(revision);
    const store = createIndexedDbLearningStore();
    await store.clearCamp(camp, { preserveEnabled: false });
    await store.putModelManifest({
      camp,
      revision,
      featureSchema: denseWeights.featureSchema,
      rankingPolicy: 'strict-cascade-v1',
      runtime: 'typed',
      modelStorageUrl: `indexeddb://auto-create-twrole/${camp}/${revision}`,
      inputSize: denseWeights.inputSize,
      outputSize: 2,
      createdAt: Date.now(),
      trainingExampleCount: 8_000,
      targetSignatureCount: 3,
      trainingDataFingerprint:
        'auto-create-training-data-v1:00000000000000000000000000000001',
      trainingTargetSignatures: ['target-a', 'target-b', 'target-c'],
      trainedModes: ['add'],
      byteSize: 27_000,
      denseWeights
    });
    await store.setActiveModelRevision(camp, revision);
    const base = {
      featureSchema: 'auto-create-numeric-v1',
      features: new Float32Array(64),
      mode: 'add' as const,
      runHash: 'portable-export-e2e',
      targetSignature: 'target-a',
      modelRevision: revision,
      provenance: { kind: 'exploration' as const, inclusionProbability: 1 }
    };
    await store.appendExamples(camp, [
      {
        ...base,
        sampleId: 'portable-exact',
        outcome: {
          kind: 'exact' as const,
          valid: true as const,
          globalGainMse: 1,
          score: 1,
          decisionMargin: 1
        }
      },
      {
        ...base,
        sampleId: 'portable-invalid',
        outcome: { kind: 'invalid' as const, valid: false as const, reason: 'fixture' }
      },
      {
        ...base,
        sampleId: 'portable-censored',
        outcome: { kind: 'censored' as const, reason: 'fixture' }
      }
    ]);
    store.close();
  });

  await page.addInitScript(() => {
    type RankerLabWindow = Window & typeof globalThis & {
      __rankerLabStartSettings?: { rankerRolloutApproved?: boolean };
      __portableFiles?: Map<string, BlobPart>;
    };
    const testWindow = window as RankerLabWindow;
    testWindow.__portableFiles = new Map();
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => ({
        getFileHandle: async (name: string) => ({
          createWritable: async () => {
            let value: BlobPart = '';
            return {
              write: async (next: BlobPart) => { value = next; },
              close: async () => { testWindow.__portableFiles?.set(name, value); },
              abort: async () => undefined
            };
          }
        })
      })
    });
    const NativeWorker = window.Worker;

    class FakeAutoCreateWorker extends EventTarget {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      postMessage(message: {
        type?: string;
        id?: string;
        settings?: { rankerRolloutApproved?: boolean };
      }): void {
        if (message.type !== 'start' || !message.id) return;
        testWindow.__rankerLabStartSettings = message.settings;
        const id = message.id;
        window.setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', {
            data: {
              type: 'done',
              id,
              result: {
                decorations: [],
                exportJson: { deco: [] },
                previewDataUrl:
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZckcAAAAASUVORK5CYII=',
                targetWidth: 1,
                targetHeight: 1,
                sourceWidth: 1,
                sourceHeight: 1,
                sourceCount: 1,
                insertScale: 1,
                mse: 0.1,
                accepted: 0,
                rejected: 0,
                pruned: 0,
                replaced: 0,
                warnings: [],
                ranker: {
                  requestedStrategy: 'strict-ml-typed',
                  effectiveStrategy: 'strict-ml-typed',
                  status: 'ready',
                  runtime: 'typed',
                  learningScope: 'skydow',
                  featureSchema: 'auto-create-numeric-v1',
                  rankingPolicy: 'strict-cascade-v1',
                  modelRevision: 'ranker-lab-e2e-add'
                }
              }
            }
          }));
        }, 20);
      }

      terminate(): void {}
    }

    function RoutedWorker(
      scriptURL: string | URL,
      options?: WorkerOptions
    ): Worker {
      if (String(scriptURL).includes('autoCreateTwrole.worker')) {
        return new FakeAutoCreateWorker() as unknown as Worker;
      }
      return new NativeWorker(scriptURL, options);
    }
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      value: RoutedWorker
    });
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();
  await page.locator('#extra-tool-tab-autoCreate').click();

  const toggle = page.getByTestId('auto-create-ranker-lab-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeEnabled();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(page.getByTestId('auto-create-ranker-lab-warning'))
    .toContainText('ranker-lab-e2e-add');
  await expect(page.getByTestId('auto-create-ranker-lab-warning'))
    .toContainText('add');
  await expect(page.getByTestId('auto-create-export-training')).toBeVisible();
  await expect(page.getByTestId('auto-create-import-model')).toBeVisible();
  await page.getByTestId('auto-create-export-training').click();
  await expect.poll(() => page.evaluate(async () => {
    const value = (window as Window & typeof globalThis & {
      __portableFiles?: Map<string, BlobPart>;
    }).__portableFiles?.get('manifest.json');
    if (typeof value !== 'string') return null;
    return JSON.parse(value) as {
      complete: boolean;
      exportedTrainableCount: number;
      skippedCensoredCount: number;
      shards: unknown[];
    };
  })).toMatchObject({
    complete: true,
    exportedTrainableCount: 2,
    skippedCensoredCount: 1,
    shards: [{}]
  });

  const portableModelJson = await page.evaluate(async () => {
    const [
      { createZeroDenseRankerWeights, createTypedDenseRankerPredictor },
      { FEATURE_COUNT },
      { finalizePortableModel }
    ] = await Promise.all([
      import('/src/lib/conversion/auto-create-twrole/learning/denseRanker.ts'),
      import('/src/lib/conversion/auto-create-twrole/learning/featureSchema.ts'),
      import('/src/lib/conversion/auto-create-twrole/learning/portableModel.ts')
    ]);
    const revision = 'ranker-lab-e2e-portable';
    const weights = createZeroDenseRankerWeights(revision);
    const features = Array.from({ length: FEATURE_COUNT }, () => 0.125);
    const predictions = Array.from(createTypedDenseRankerPredictor(weights).predict(features));
    return JSON.stringify(await finalizePortableModel({
      format: 'auto-create-portable-ranker',
      version: 1,
      camp: 'skydow',
      revision,
      featureSchema: 'auto-create-numeric-v1',
      rankingPolicy: 'strict-cascade-v1',
      createdAt: Date.now(),
      trainingExampleCount: 10_000,
      targetSignatureCount: 3,
      trainingDataFingerprint:
        'auto-create-training-data-v1:00000000000000000000000000000002',
      trainingTargetSignatures: ['target-a', 'target-b', 'target-c'],
      trainedModes: ['add', 'replace'],
      weights: {
        dense1Kernel: Array.from(weights.dense1Kernel),
        dense1Bias: Array.from(weights.dense1Bias),
        dense2Kernel: Array.from(weights.dense2Kernel),
        dense2Bias: Array.from(weights.dense2Bias),
        outputKernel: Array.from(weights.outputKernel),
        outputBias: Array.from(weights.outputBias)
      },
      parity: { features, predictions, tolerance: 1e-5 }
    }));
  });
  await page.getByTestId('auto-create-import-model-input').setInputFiles({
    name: 'portable-model.json',
    mimeType: 'application/json',
    buffer: Buffer.from(portableModelJson)
  });
  await expect.poll(async () => ({
    activeRevision: await page.evaluate(async () => {
      const { createIndexedDbLearningStore } = await import(
        '/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts'
      );
      const store = createIndexedDbLearningStore();
      const active = await store.getActiveModelManifest('skydow');
      store.close();
      return active?.revision ?? null;
    }),
    error: await page.locator('#extra-panel-autoCreate .extra-message.error').count() > 0
      ? await page.locator('#extra-panel-autoCreate .extra-message.error').textContent()
      : null
  })).toEqual({
    activeRevision: 'ranker-lab-e2e-portable',
    error: null
  });
  await expect(page.getByText(/ranker-lab-e2e-portable/).first()).toBeVisible();
  await expect(page.getByTestId('auto-create-ranker-lab-warning'))
    .toContainText('ranker-lab-e2e-portable');
  await expect(page.getByTestId('auto-create-ranker-lab-warning'))
    .toContainText('add, replace');

  await page.locator('#extra-panel-autoCreate .auto-create-dropzone input[type="file"]').setInputFiles({
    name: 'ranker-lab-target.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG
  });
  await page.getByTestId('auto-create-generate-button').click();
  await expect.poll(
    () => page.evaluate(
      () => (window as Window & typeof globalThis & {
        __rankerLabStartSettings?: { rankerRolloutApproved?: boolean };
      }).__rankerLabStartSettings?.rankerRolloutApproved
    )
  ).toBe(true);

  const campSelect = page.locator('.menu-selects select').nth(0);
  await campSelect.selectOption('civil');
  await expect(toggle).not.toBeChecked();
  await expect(toggle).toBeDisabled();
  await campSelect.selectOption('skydow');
  await expect(toggle).toBeEnabled();
  await expect(toggle).not.toBeChecked();
  await toggle.check();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();
  await page.locator('#extra-tool-tab-autoCreate').click();
  await expect(page.getByTestId('auto-create-ranker-lab-toggle')).not.toBeChecked();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tab-mode="extra"]').click();
  await page.locator('#extra-tool-tab-autoCreate').click();
  await expect(page.getByTestId('auto-create-ranker-lab-toggle')).toHaveCount(0);

  await page.evaluate(async () => {
    const { createIndexedDbLearningStore } = await import(
      '/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts'
    );
    const store = createIndexedDbLearningStore();
    await store.clearCamp('skydow', { preserveEnabled: false });
    store.close();
  });
});
