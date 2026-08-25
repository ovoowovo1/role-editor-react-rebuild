export interface LearningExclusiveCoordinator {
  runExclusive<T>(camp: string, operation: () => Promise<T>): Promise<T>;
}

export interface WebLocksLearningExclusiveCoordinatorOptions {
  namespace: string;
  lockManager?: LockManager | null;
}

export const NOOP_LEARNING_EXCLUSIVE_COORDINATOR:
LearningExclusiveCoordinator = Object.freeze({
  runExclusive<T>(_camp: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }
});

function defaultLockManager(): LockManager | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.locks ?? null;
}

/**
 * Serializes learning-store mutations across every Window and Worker sharing
 * the same origin. IndexedDB CAS remains the fallback for browsers without
 * Web Locks and for older app versions that do not acquire this lock.
 */
export function createWebLocksLearningExclusiveCoordinator({
  namespace,
  lockManager = defaultLockManager()
}: WebLocksLearningExclusiveCoordinatorOptions): LearningExclusiveCoordinator {
  const normalizedNamespace = namespace.trim();
  if (!normalizedNamespace) throw new Error('Learning lock namespace must not be empty.');
  if (!lockManager) return NOOP_LEARNING_EXCLUSIVE_COORDINATOR;
  return {
    runExclusive<T>(camp: string, operation: () => Promise<T>): Promise<T> {
      // The DOM declaration models a promise-returning callback as
      // Promise<Promise<T>>, while the Web Locks algorithm adopts the
      // callback promise before resolving the request promise.
      return lockManager.request<Promise<T>>(
        `${normalizedNamespace}:${camp}`,
        { mode: 'exclusive' },
        () => operation()
      ) as unknown as Promise<T>;
    }
  };
}
