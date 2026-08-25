import { describe, expect, it } from 'vitest';
import { createWebLocksLearningExclusiveCoordinator } from './exclusiveCoordinator';

class FakeLockManager {
  readonly requestedNames: string[] = [];
  private readonly queues = new Map<string, Promise<void>>();

  request<T>(
    name: string,
    _options: LockOptions,
    callback: () => T | PromiseLike<T>
  ): Promise<T> {
    this.requestedNames.push(name);
    const previous = this.queues.get(name) ?? Promise.resolve();
    const current = previous.then(callback, callback);
    const tracked = Promise.resolve(current).then(
      () => undefined,
      () => undefined
    );
    this.queues.set(name, tracked);
    void tracked.then(() => {
      if (this.queues.get(name) === tracked) this.queues.delete(name);
    });
    return Promise.resolve(current);
  }
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('Web Locks learning exclusive coordinator', () => {
  it('uses a namespace and serializes the same camp', async () => {
    const locks = new FakeLockManager();
    const coordinator = createWebLocksLearningExclusiveCoordinator({
      namespace: 'learning:test-db:1',
      lockManager: locks as unknown as LockManager
    });
    const gate = deferred();
    const order: string[] = [];
    const first = coordinator.runExclusive('civil', async () => {
      order.push('first:start');
      await gate.promise;
      order.push('first:end');
    });
    const second = coordinator.runExclusive('civil', async () => {
      order.push('second');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);
    gate.resolve();
    await Promise.all([first, second]);

    expect(order).toEqual(['first:start', 'first:end', 'second']);
    expect(locks.requestedNames).toEqual([
      'learning:test-db:1:civil',
      'learning:test-db:1:civil'
    ]);
  });

  it('does not block a different camp', async () => {
    const locks = new FakeLockManager();
    const coordinator = createWebLocksLearningExclusiveCoordinator({
      namespace: 'learning:test-db:1',
      lockManager: locks as unknown as LockManager
    });
    const gate = deferred();
    const order: string[] = [];
    const civil = coordinator.runExclusive('civil', async () => {
      order.push('civil:start');
      await gate.promise;
      order.push('civil:end');
    });
    const skydow = coordinator.runExclusive('skydow', async () => {
      order.push('skydow');
    });

    await skydow;
    expect(order).toEqual(['civil:start', 'skydow']);
    gate.resolve();
    await civil;
    expect(order).toEqual(['civil:start', 'skydow', 'civil:end']);
  });
});
