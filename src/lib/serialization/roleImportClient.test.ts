import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRoleFileWithWorkerFallback } from './roleImportClient';

const mock = vi.hoisted(() => ({
  parserModuleInitialized: vi.fn(),
  parseRoleBytes: vi.fn()
}));

vi.mock('./roleSerializationImport', () => {
  mock.parserModuleInitialized();
  return { parseRoleBytes: mock.parseRoleBytes };
});

afterEach(() => vi.unstubAllGlobals());

describe('worker-first file import loading', () => {
  it('loads the main-thread parser only after a Worker failure and uses retained bytes', async () => {
    const result = { role: { name: 'worker result' }, warnings: [] };
    const fileBuffer = new TextEncoder().encode('file bytes').buffer;
    const arrayBuffer = vi.fn(async () => fileBuffer);
    const file = { arrayBuffer } as unknown as File;
    const terminate = vi.fn();
    let sent: ArrayBuffer | undefined;
    vi.stubGlobal('Worker', class {
      onmessage: ((event: { data: unknown }) => void) | null = null;

      postMessage(message: { bytes: ArrayBuffer }, transfer: ArrayBuffer[]) {
        [sent] = transfer;
        expect(message.bytes).toBe(sent);
        structuredClone(message, { transfer });
        queueMicrotask(() => this.onmessage?.({ data: { type: 'parse-role-ok', result } }));
      }
      terminate() { terminate(); }
    });

    await expect(parseRoleFileWithWorkerFallback(file)).resolves.toBe(result);
    expect(mock.parserModuleInitialized).not.toHaveBeenCalled();
    expect(mock.parseRoleBytes).not.toHaveBeenCalled();
    expect(terminate).toHaveBeenCalledExactlyOnceWith();
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(sent?.byteLength).toBe(0);
    expect(fileBuffer.byteLength).toBe(10);

    vi.stubGlobal('Worker', class {
      constructor() { throw new Error('Worker unavailable'); }
    });
    const fallback = { role: { name: 'fallback result' }, warnings: [] };
    mock.parseRoleBytes.mockReturnValue(fallback);
    await expect(parseRoleFileWithWorkerFallback(file)).resolves.toBe(fallback);
    expect(mock.parserModuleInitialized).toHaveBeenCalledTimes(1);
    expect(mock.parseRoleBytes).toHaveBeenCalledExactlyOnceWith(new Uint8Array(fileBuffer));
    expect(arrayBuffer).toHaveBeenCalledTimes(2);
  });
});
