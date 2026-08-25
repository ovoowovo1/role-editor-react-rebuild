import {
  AUTO_CREATE_LEARNING_DB_NAME,
  DEFAULT_LEARNING_FEATURE_SCHEMA,
  DEFAULT_LEARNING_RANKING_POLICY
} from './types';
import { IndexedDbLearningPersistence } from './indexedDbStore';
import {
  encodePortableDatasetRow,
  PORTABLE_DATASET_RECORD_BYTES,
  PORTABLE_DATASET_SHARD_ROWS,
  PORTABLE_DATASET_VERSION,
  sha256Hex,
  type PortableDatasetManifest,
  type PortableDatasetShard
} from './portableDataset';

export interface PortableDatasetExportProgress {
  scanned: number;
  exported: number;
  censored: number;
  shards: number;
}

export interface ExportPortableDatasetOptions {
  camp: string;
  directory: FileSystemDirectoryHandle;
  signal?: AbortSignal;
  onProgress?(progress: PortableDatasetExportProgress): void;
  databaseName?: string;
}

async function writeFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  data: FileSystemWriteChunkType
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw error;
  }
}

function emptyManifest(camp: string, now: number): PortableDatasetManifest {
  return {
    format: 'auto-create-portable-dataset',
    version: PORTABLE_DATASET_VERSION,
    complete: false,
    camp,
    featureSchema: DEFAULT_LEARNING_FEATURE_SCHEMA,
    rankingPolicy: DEFAULT_LEARNING_RANKING_POLICY,
    featureCount: 64,
    recordBytes: PORTABLE_DATASET_RECORD_BYTES,
    exportedAt: now,
    sourceExampleCount: 0,
    sourceEstimatedBytes: 0,
    exportedTrainableCount: 0,
    skippedCensoredCount: 0,
    outcomeCounts: { exact: 0, invalid: 0, censored: 0 },
    modeCounts: { add: 0, replace: 0 },
    trainableModeCounts: { add: 0, replace: 0 },
    targetSignatures: [],
    shards: []
  };
}

export async function exportPortableLearningDataset(
  options: ExportPortableDatasetOptions
): Promise<PortableDatasetManifest> {
  const camp = options.camp.trim().toLocaleLowerCase('en-US');
  if (!camp) throw new Error('camp must not be empty.');
  const persistence = new IndexedDbLearningPersistence({
    databaseName: options.databaseName ?? AUTO_CREATE_LEARNING_DB_NAME
  });
  const meta = await persistence.loadMeta(camp);
  const manifest = emptyManifest(camp, Date.now());
  if (meta) {
    manifest.featureSchema = meta.featureSchema;
    manifest.rankingPolicy = meta.rankingPolicy;
    manifest.sourceExampleCount = meta.aggregate?.exampleCount ?? 0;
    manifest.sourceEstimatedBytes = meta.aggregate?.estimatedBytes ?? 0;
    manifest.outcomeCounts = { ...(meta.aggregate?.outcomeCounts ?? manifest.outcomeCounts) };
    manifest.modeCounts = { ...(meta.aggregate?.modeCounts ?? manifest.modeCounts) };
  }
  await writeFile(
    options.directory,
    'manifest.json',
    JSON.stringify(manifest, null, 2)
  );

  const targetIndices = new Map<string, number>();
  const shards: PortableDatasetShard[] = [];
  let shardRows: Parameters<typeof encodePortableDatasetRow>[2][] = [];
  let cursor: string | null = null;
  let scanned = 0;
  let exported = 0;
  let censored = 0;

  const flushShard = async (): Promise<void> => {
    if (shardRows.length === 0) return;
    const bytes = new Uint8Array(shardRows.length * PORTABLE_DATASET_RECORD_BYTES);
    shardRows.forEach((example, row) => {
      let targetIndex = targetIndices.get(example.targetSignature);
      if (targetIndex === undefined) {
        targetIndex = targetIndices.size;
        if (targetIndex > 0xffff) {
          throw new Error('Portable dataset contains more than 65,536 target signatures.');
        }
        targetIndices.set(example.targetSignature, targetIndex);
      }
      encodePortableDatasetRow(bytes, row, example, targetIndex);
    });
    const file = `shard-${String(shards.length).padStart(5, '0')}.bin`;
    await writeFile(options.directory, file, bytes);
    shards.push({
      file,
      rows: shardRows.length,
      bytes: bytes.byteLength,
      sha256: await sha256Hex(bytes)
    });
    shardRows = [];
  };

  try {
    do {
      if (options.signal?.aborted) throw new DOMException('Dataset export aborted.', 'AbortError');
      const page = await persistence.loadExamplePage(camp, cursor, 5_000);
      for (const example of page.examples) {
        scanned += 1;
        if (example.outcome.kind === 'censored') {
          censored += 1;
          continue;
        }
        if (example.featureSchema !== manifest.featureSchema) continue;
        shardRows.push(example);
        manifest.trainableModeCounts[example.mode] += 1;
        exported += 1;
        if (shardRows.length >= PORTABLE_DATASET_SHARD_ROWS) await flushShard();
      }
      cursor = page.nextCursor;
      options.onProgress?.({ scanned, exported, censored, shards: shards.length });
    } while (cursor !== null);
    await flushShard();

    manifest.complete = true;
    manifest.exportedTrainableCount = exported;
    manifest.skippedCensoredCount = censored;
    manifest.targetSignatures = [...targetIndices.keys()];
    manifest.shards = shards;
    await writeFile(options.directory, 'manifest.json', JSON.stringify(manifest, null, 2));
    return manifest;
  } catch (error) {
    manifest.exportedTrainableCount = exported;
    manifest.skippedCensoredCount = censored;
    manifest.targetSignatures = [...targetIndices.keys()];
    manifest.shards = shards;
    await writeFile(options.directory, 'manifest.json', JSON.stringify(manifest, null, 2))
      .catch(() => undefined);
    throw error;
  } finally {
    persistence.close();
  }
}
