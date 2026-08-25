import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEATURE_COUNT } from './featureSchema';
import {
  encodePortableDatasetRow,
  PORTABLE_DATASET_RECORD_BYTES,
  sha256Hex,
  type PortableDatasetManifest
} from './portableDataset';
import { validatePortableRankerModel } from './portableModel';
import type { PersistedCandidateLearningExample } from './types';

describe('local AutoCreate trainer CLI', () => {
  it('trains a portable model from a verified binary fixture', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'auto-create-local-trainer-'));
    const dataset = path.join(root, 'dataset');
    const output = path.join(root, 'output');
    await mkdir(dataset);
    try {
      const rows = 64;
      const bytes = new Uint8Array(rows * PORTABLE_DATASET_RECORD_BYTES);
      for (let row = 0; row < rows; row += 1) {
        const exact = row % 3 !== 0;
        const example: PersistedCandidateLearningExample = {
          id: `fixture-${row}`,
          camp: 'civil',
          featureSchema: 'auto-create-numeric-v1',
          features: Array.from(
            { length: FEATURE_COUNT },
            (_, feature) => ((row + feature) % 17) / 17
          ),
          mode: row % 2 === 0 ? 'add' : 'replace',
          runHash: 'fixture',
          targetSignature: `target-${row % 4}`,
          modelRevision: null,
          provenance: { kind: 'exploration', inclusionProbability: 1 },
          outcome: exact
            ? {
                kind: 'exact',
                valid: true,
                globalGainMse: row / 100,
                score: row / 100,
                decisionMargin: row / 100
              }
            : { kind: 'invalid', valid: false, reason: 'fixture' },
          createdAt: row,
          sequence: row,
          estimatedBytes: 1,
          retention: { tier: 'recent' }
        };
        encodePortableDatasetRow(bytes, row, example, row % 4);
      }
      await writeFile(path.join(dataset, 'shard-00000.bin'), bytes);
      const manifest: PortableDatasetManifest = {
        format: 'auto-create-portable-dataset',
        version: 1,
        complete: true,
        camp: 'civil',
        featureSchema: 'auto-create-numeric-v1',
        rankingPolicy: 'strict-cascade-v1',
        featureCount: FEATURE_COUNT,
        recordBytes: PORTABLE_DATASET_RECORD_BYTES,
        exportedAt: 1,
        sourceExampleCount: rows,
        sourceEstimatedBytes: bytes.byteLength,
        exportedTrainableCount: rows,
        skippedCensoredCount: 0,
        outcomeCounts: { exact: 42, invalid: 22, censored: 0 },
        modeCounts: { add: 32, replace: 32 },
        trainableModeCounts: { add: 32, replace: 32 },
        targetSignatures: ['target-0', 'target-1', 'target-2', 'target-3'],
        shards: [{
          file: 'shard-00000.bin',
          rows,
          bytes: bytes.byteLength,
          sha256: await sha256Hex(bytes)
        }]
      };
      await writeFile(path.join(dataset, 'manifest.json'), JSON.stringify(manifest));
      execFileSync(process.execPath, [
        path.resolve('node_modules/tsx/dist/cli.mjs'),
        path.resolve('scripts/trainAutoCreateLocal.ts'),
        '--dataset', dataset,
        '--output', output,
        '--max-examples', '48',
        '--epochs', '1',
        '--batch-size', '16',
        '--validation-split', '0.1'
      ], { cwd: path.resolve('.'), stdio: 'pipe', timeout: 30_000 });
      const model = JSON.parse(await readFile(path.join(output, 'model.json'), 'utf8'));
      await expect(validatePortableRankerModel(model, 'civil')).resolves.toMatchObject({
        model: { trainedModes: ['add', 'replace'] }
      });
      const report = JSON.parse(
        await readFile(path.join(output, 'training-report.json'), 'utf8')
      ) as { trainingExampleCount: number; epochLosses: number[] };
      expect(report.trainingExampleCount).toBeLessThanOrEqual(48);
      expect(report.epochLosses).toHaveLength(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 40_000);
});
