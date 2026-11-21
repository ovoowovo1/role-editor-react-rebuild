import { describe, expect, it, vi } from 'vitest';
import { createReferenceImageUrlOwner, retainReferenceImageUrl } from './referenceImageUrlResources';

function observe(owner: ReturnType<typeof createReferenceImageUrlOwner>, src: string, retained: string[] = []) {
  owner.begin(src);
  owner.submit(src);
  owner.collect(new Set([src, ...retained]));
}

describe('reference image URL resources', () => {
  it('preserves shared history sources and releases discarded redo sources', () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    observe(owner, 'blob:history');
    observe(owner, 'blob:discarded-redo', ['blob:history']);

    owner.collect(new Set(['blob:history', 'blob:discarded-redo']));
    expect(revoke).not.toHaveBeenCalled();

    owner.collect(new Set(['blob:history']));
    expect(revoke.mock.calls).toEqual([['blob:discarded-redo']]);
    owner.collect(new Set());
    expect(revoke.mock.calls).toEqual([['blob:discarded-redo'], ['blob:history']]);
  });

  it('waits for every live renderer consumer and releases each URL only once', () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    const src = 'blob:renderer';
    observe(owner, src);
    const releaseOldScene = retainReferenceImageUrl(src);
    const releaseNewScene = retainReferenceImageUrl(src);

    owner.collect(new Set());
    releaseOldScene();
    releaseOldScene();
    expect(revoke).not.toHaveBeenCalled();
    releaseNewScene();
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
  });

  it('does not sweep pending or newly submitted uploads between committed states', () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    const src = 'blob:pending';
    const signal = owner.begin(src);
    owner.collect(new Set());
    owner.submit(src);
    owner.collect(new Set());
    expect(revoke).not.toHaveBeenCalled();
    expect(signal.aborted).toBe(false);

    owner.collect(new Set(), 0, new Set([src]));
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
  });

  it('releases a submitted image superseded before commit by clearing the editor', () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    const src = 'blob:clear';
    owner.begin(src);
    owner.submit(src);
    const oldDecode = owner.begin('blob:old-decode');
    const clearedGeneration = owner.prepareClear();
    const newDecode = owner.begin('blob:new-decode');
    owner.begin('blob:new-submit');
    owner.submit('blob:new-submit');

    expect(oldDecode.aborted).toBe(true);
    expect(revoke.mock.calls).toEqual([['blob:old-decode']]);
    owner.collect(new Set(), clearedGeneration);
    expect(revoke.mock.calls).toEqual([['blob:old-decode'], [src]]);
    expect(newDecode.aborted).toBe(false);
    owner.fail('blob:new-decode');
    owner.collect(new Set(['blob:new-submit']));
    owner.collect(new Set());
    expect(revoke.mock.calls).toEqual([['blob:old-decode'], [src], ['blob:new-decode'], ['blob:new-submit']]);
  });

  it('does not revoke on StrictMode replay, but aborts and releases on real teardown', async () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    owner.activate();
    observe(owner, 'blob:mounted');
    const signal = owner.begin('blob:decode');
    const releaseRenderer = retainReferenceImageUrl('blob:mounted');

    owner.deactivate();
    owner.activate();
    await Promise.resolve();
    expect(revoke).not.toHaveBeenCalled();
    expect(signal.aborted).toBe(false);

    owner.deactivate();
    await Promise.resolve();
    expect(signal.aborted).toBe(true);
    expect(revoke.mock.calls).toEqual([['blob:decode']]);
    releaseRenderer();
    expect(revoke.mock.calls).toEqual([['blob:decode'], ['blob:mounted']]);
  });

  it('releases a failed decoder without retaining or double-revoking its URL', () => {
    const revoke = vi.fn();
    const owner = createReferenceImageUrlOwner(revoke);
    const src = 'blob:failed';
    owner.begin(src);
    owner.fail(src);
    owner.collect(new Set());
    owner.fail(src);
    expect(revoke).toHaveBeenCalledExactlyOnceWith(src);
  });
});
