import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzip } from 'pako';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import {
  createTwroleBlob,
  decodeRolePayload,
  exportOriginalLikeRoleConfig,
  isMissingDecoAssetId,
  makeMissingDecoAssetId,
  normalizeImportedRole,
  parseRoleBytes,
  parseRoleFileWithWorkerFallback
} from './roleSerialization';

vi.mock('../stage/fullRoleRenderer', () => ({
  renderFullRoleToDataUrl: vi.fn(async () => ({
    dataUrl: 'data:image/png;base64,cm9sZS1zZXJpYWxpemF0aW9u',
    width: 256,
    height: 256,
    alphaPixels: 4,
    nonTransparentBounds: { minX: 100, minY: 100, maxX: 101, maxY: 101 },
    warnings: [],
    missingTextureCount: 0
  }))
}));

function layer(id: string, patch: Partial<DecorationLayer> = {}): DecorationLayer {
  return {
    id,
    code: id,
    assetId: id,
    name: id,
    x: 1,
    y: 2,
    scaleX: 1,
    scaleY: 1,
    rotation: 90,
    visible: true,
    opacity: 1,
    ...patch
  };
}

function role(patch: Partial<RoleDocument> = {}): RoleDocument {
  return {
    schemaVersion: 1,
    name: 'role',
    camp: 'twilight',
    gender: 'male',
    positionRange: 60,
    parts: { head: 'head', hand: 'hand', foot: 'foot', cape: 'cape' },
    partFrames: { head: 1, hand: 1, foot: 1, cape: 1 },
    partScales: { head: 1, hand: 1, foot: 1, cape: 1 },
    headLayerIndex: 1,
    headLayer: { x: 3, y: 4, scaleX: 1.2, scaleY: 1.2, rotation: 45, visible: true, opacity: 1 },
    decorations: [layer('a'), layer('b')],
    groups: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch
  };
}

function withTwroleHeader(compressed: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(compressed.length + 2);
  bytes.set([0, 1]);
  bytes.set(compressed, 2);
  return bytes;
}

function mockFile(bytes: Uint8Array) {
  const arrayBuffer = vi.fn(async () => bytes.slice().buffer as ArrayBuffer);
  return { file: { name: 'role.twrole', arrayBuffer } as unknown as File, arrayBuffer };
}

type WorkerMode = 'success' | 'response-error' | 'error';

function installWorker(mode: WorkerMode, postedBuffers: ArrayBuffer[] = []) {
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    postMessage(message: { type: string; bytes: ArrayBuffer }, transfer: Transferable[]) {
      postedBuffers.push(message.bytes);
      expect(transfer).toEqual([message.bytes]);
      const delivered = structuredClone(message, { transfer });
      if (mode === 'success') {
        this.onmessage?.({
          data: { type: 'parse-role-ok', result: parseRoleBytes(new Uint8Array(delivered.bytes)) }
        } as MessageEvent);
      } else if (mode === 'response-error') {
        this.onmessage?.({ data: { type: 'parse-role-error', error: 'worker parse failed' } } as MessageEvent);
      } else {
        this.onerror?.({ message: 'worker crashed' } as ErrorEvent);
      }
    }

    terminate() {}
  }
  vi.stubGlobal('Worker', FakeWorker);
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('role serialization', () => {
  it('marks unknown deco ids as missing placeholders', () => {
    const assetId = makeMissingDecoAssetId('missing_deco');

    expect(assetId).toBe('deco:missing:missing_deco');
    expect(isMissingDecoAssetId(assetId)).toBe(true);
    expect(isMissingDecoAssetId('normal')).toBe(false);
  });

  it('normalizes schema v1 roles and warns about missing deco symbols', () => {
    const result = normalizeImportedRole({
      ...role({
        positionRange: '20000' as unknown as number,
        headLayerIndex: '99' as unknown as number,
        decorations: [
          { code: 'missing_deco', x: '5', y: '6', sx: '-2', sy: '0.5', r: Math.PI / 2 }
        ] as unknown as DecorationLayer[]
      })
    });

    expect(result.role.positionRange).toBe(10000);
    expect(result.role.headLayerIndex).toBe(1);
    expect(result.role.decorations[0]).toMatchObject({
      code: 'missing_deco',
      x: 5,
      y: 6,
      scaleX: -2,
      scaleY: 0.5,
      rotation: 90
    });
    expect(isMissingDecoAssetId(result.role.decorations[0].assetId)).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('Missing deco symbols'))).toBe(true);
  });

  it('parses JSON role bytes', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'json-role' })));

    const result = parseRoleBytes(bytes);

    expect(result.role.name).toBe('json-role');
    expect(result.role.decorations).toHaveLength(2);
  });

  it('decodes JSON, header+gzip, raw gzip, and base64 gzip to identical roles', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const json = JSON.stringify(role({ name: 'gzip-role' }));
    const jsonBytes = new TextEncoder().encode(json);
    const compressed = gzip(json);
    const base64 = Buffer.from(compressed).toString('base64');
    const formats = [
      jsonBytes,
      withTwroleHeader(compressed),
      compressed,
      new TextEncoder().encode(base64)
    ];
    const expectedPayload = JSON.parse(json);
    const expectedResult = parseRoleBytes(jsonBytes);

    for (const bytes of formats) {
      expect(decodeRolePayload(bytes)).toEqual(expectedPayload);
      expect(parseRoleBytes(bytes)).toEqual(expectedResult);
    }
  });

  it('uses one file read and a transferable copy when the worker succeeds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'worker-role' })));
    const { file, arrayBuffer } = mockFile(bytes);
    const postedBuffers: ArrayBuffer[] = [];
    installWorker('success', postedBuffers);

    const result = await parseRoleFileWithWorkerFallback(file);

    expect(result).toEqual(parseRoleBytes(bytes));
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(postedBuffers).toHaveLength(1);
    expect(postedBuffers[0]).not.toBe(bytes.buffer);
    expect(postedBuffers[0].byteLength).toBe(0);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('falls back with the retained bytes when the Worker constructor fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'constructor-fallback' })));
    const { file, arrayBuffer } = mockFile(bytes);
    vi.stubGlobal('Worker', class {
      constructor() {
        throw new Error('Worker unavailable');
      }
    });

    const result = await parseRoleFileWithWorkerFallback(file);

    expect(result).toEqual(parseRoleBytes(bytes));
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it('falls back with the retained bytes when the worker emits an error', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'error-fallback' })));
    const { file, arrayBuffer } = mockFile(bytes);
    installWorker('error');

    const result = await parseRoleFileWithWorkerFallback(file);

    expect(result).toEqual(parseRoleBytes(bytes));
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it('falls back with the retained bytes when the worker reports a parse error', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const bytes = new TextEncoder().encode(JSON.stringify(role({ name: 'response-fallback' })));
    const { file, arrayBuffer } = mockFile(bytes);
    installWorker('response-error');

    const result = await parseRoleFileWithWorkerFallback(file);

    expect(result).toEqual(parseRoleBytes(bytes));
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  it('keeps worker success and fallback identical for all formats with legacy metadata', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
    const payload = {
      ...role({ name: 'metadata-role' }),
      dr: 9,
      decoGroups: [{ id: 'metadata-group', itemIndexes: [0, 2] }]
    };
    const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
    const compressed = gzip(jsonBytes);
    const formats = [
      jsonBytes,
      withTwroleHeader(compressed),
      compressed,
      new TextEncoder().encode(Buffer.from(compressed).toString('base64'))
    ];
    const expected = parseRoleBytes(jsonBytes);

    for (const bytes of formats) {
      const workerFile = mockFile(bytes);
      installWorker('success');
      const workerResult = await parseRoleFileWithWorkerFallback(workerFile.file);

      const fallbackFile = mockFile(bytes);
      vi.stubGlobal('Worker', class {
        constructor() {
          throw new Error('Worker unavailable');
        }
      });
      const fallbackResult = await parseRoleFileWithWorkerFallback(fallbackFile.file);

      expect(workerResult).toEqual(expected);
      expect(fallbackResult).toEqual(expected);
      expect(workerFile.arrayBuffer).toHaveBeenCalledTimes(1);
      expect(fallbackFile.arrayBuffer).toHaveBeenCalledTimes(1);
    }
    expect(expected.role).toMatchObject({ camp: 'third', gender: 'female' });
    expect(expected.role.groups[0]).toMatchObject({ id: 'metadata-group' });
  });

  it.each(['false', '0', '""'])('continues to reject the legacy-invalid falsy JSON payload %s', (json) => {
    expect(() => decodeRolePayload(new TextEncoder().encode(json))).toThrow('Unsupported role file');
  });

  it('round-trips exported twrole bytes through the legacy parser path', async () => {
    const blob = await createTwroleBlob(role());
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const result = parseRoleBytes(bytes);

    expect(result.role.decorations).toHaveLength(2);
    expect(result.role.headLayer).toMatchObject({ x: 3, y: 4, rotation: 45 });
    expect(result.warnings[0]).toContain('legacy or foreign role file');
  });

  it('exports an original-like config with the head layer and radians', () => {
    const config = exportOriginalLikeRoleConfig(role());

    expect(config.head).toEqual({ f: 1, s: 1.2 });
    expect(config.deco).toHaveLength(3);
    expect(config.deco[0]).toMatchObject({ c: 'b' });
    expect(config.deco[1]).toMatchObject({ c: 'head', x: 3, y: 4 });
    expect(config.deco[1].r).toBeCloseTo(Math.PI / 4);
  });
});
