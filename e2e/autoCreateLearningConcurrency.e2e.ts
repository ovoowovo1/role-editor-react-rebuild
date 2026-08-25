import { expect, test } from '@playwright/test';

test('two same-origin pages preserve concurrent learning batches for one camp', async ({
  browser
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const firstPage = await context.newPage();
  const secondPage = await context.newPage();
  const concurrentWarnings: string[] = [];
  for (const page of [firstPage, secondPage]) {
    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('due to concurrent updates')) concurrentWarnings.push(text);
    });
  }

  await Promise.all([
    firstPage.goto('/', { waitUntil: 'domcontentloaded' }),
    secondPage.goto('/', { waitUntil: 'domcontentloaded' })
  ]);
  const supportsWebLocks = await firstPage.evaluate(() => Boolean(navigator.locks));
  expect(supportsWebLocks).toBe(true);

  const camp = 'learning-concurrency-e2e';
  await firstPage.evaluate(async (scope) => {
    const { createIndexedDbLearningStore } = await import(
      '/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts'
    );
    const store = createIndexedDbLearningStore();
    await store.clearCamp(scope, { preserveEnabled: false });
    store.close();
  }, camp);

  const appendFromPage = (
    page: typeof firstPage,
    prefix: string
  ): Promise<unknown> => page.evaluate(async ({ scope, samplePrefix }) => {
    const { createIndexedDbLearningStore } = await import(
      '/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts'
    );
    const store = createIndexedDbLearningStore();
    const batch = (batchIndex: number) => Array.from(
      { length: 8 },
      (_, itemIndex) => {
        const index = batchIndex * 8 + itemIndex;
        return {
          sampleId: `${samplePrefix}-${index}`,
          featureSchema: 'auto-create-numeric-v1',
          features: new Float32Array([index / 64, 0.5]),
          mode: 'add' as const,
          runHash: `run-${samplePrefix}`,
          targetSignature: `target-${samplePrefix}`,
          modelRevision: null,
          provenance: {
            kind: 'exploration' as const,
            inclusionProbability: 1
          },
          outcome: {
            kind: 'exact' as const,
            valid: true as const,
            globalGainMse: 0.25,
            score: 0.25,
            decisionMargin: 0.25
          }
        };
      }
    );
    for (let batchIndex = 0; batchIndex < 8; batchIndex += 1) {
      await store.appendExamples(scope, batch(batchIndex));
    }
    const status = await store.getStatus(scope);
    store.close();
    return status;
  }, { scope: camp, samplePrefix: prefix });

  await Promise.all([
    appendFromPage(firstPage, 'first'),
    appendFromPage(secondPage, 'second')
  ]);

  const finalStatus = await firstPage.evaluate(async (scope) => {
    const { createIndexedDbLearningStore } = await import(
      '/src/lib/conversion/auto-create-twrole/learning/indexedDbStore.ts'
    );
    const store = createIndexedDbLearningStore();
    const status = await store.getStatus(scope);
    const ids = (await store.getExamples(scope)).map((example) => example.id);
    await store.clearCamp(scope, { preserveEnabled: false });
    store.close();
    return { status, ids };
  }, camp);

  expect(finalStatus.status.exampleCount).toBe(128);
  expect(new Set(finalStatus.ids).size).toBe(128);
  expect(finalStatus.ids.filter((id) => id.startsWith('first-'))).toHaveLength(64);
  expect(finalStatus.ids.filter((id) => id.startsWith('second-'))).toHaveLength(64);
  expect(concurrentWarnings).toEqual([]);
  await context.close();
});
