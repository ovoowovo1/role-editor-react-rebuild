import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appendHistoryFuture,
  appendHistoryPast,
  defaultHistorySerialize,
  historyMeta,
  resolveHistoryUpdater,
  sameHistoryValue,
  type HistoryCommitMode
} from './historyCore';

type Updater<T> = T | ((current: T) => T);

interface UseHistoryOptions<T> {
  limit?: number;
  serialize?: (value: T) => string;
}

export function useHistory<T>(initialValue: T, options: UseHistoryOptions<T> = {}) {
  const limit = options.limit ?? 200;
  const serialize = options.serialize ?? defaultHistorySerialize;
  const [present, setPresentState] = useState<T>(initialValue);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const presentRef = useRef(present);
  const transientStartRef = useRef<T | null>(null);

  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  const commitPast = useCallback(
    (previous: T) => {
      setPast((items) => {
        const last = items[items.length - 1];
        if (last && sameHistoryValue(last, previous, serialize)) return items;
        return appendHistoryPast(items, previous, { limit, serialize });
      });
      setFuture([]);
    },
    [limit, serialize]
  );

  const setPresent = useCallback(
    (updater: Updater<T>, mode: HistoryCommitMode = 'history') => {
      setPresentState((current) => {
        const next = resolveHistoryUpdater(current, updater);
        if (sameHistoryValue(next, current, serialize)) return current;
        if (mode === 'history') commitPast(current);
        return next;
      });
    },
    [commitPast, serialize]
  );

  const beginTransient = useCallback(() => {
    transientStartRef.current = presentRef.current;
  }, []);

  const commitTransient = useCallback(() => {
    const before = transientStartRef.current;
    transientStartRef.current = null;
    const current = presentRef.current;
    if (before && !sameHistoryValue(before, current, serialize)) {
      commitPast(before);
    }
  }, [commitPast, serialize]);

  const cancelTransient = useCallback(() => {
    transientStartRef.current = null;
  }, []);

  const undo = useCallback(() => {
    setPast((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      setFuture((futureItems) => appendHistoryFuture(futureItems, presentRef.current, limit));
      setPresentState(previous);
      return items.slice(0, -1);
    });
  }, [limit]);

  const redo = useCallback(() => {
    setFuture((items) => {
      if (!items.length) return items;
      const next = items[0];
      setPast((pastItems) => [...pastItems, presentRef.current].slice(-limit));
      setPresentState(next);
      return items.slice(1);
    });
  }, [limit]);

  const reset = useCallback((next: T, keepHistory = false) => {
    transientStartRef.current = null;
    setPresentState(next);
    if (!keepHistory) {
      setPast([]);
      setFuture([]);
    }
  }, []);

  const meta = useMemo(
    () => historyMeta({ past, future }),
    [future.length, past.length]
  );

  return {
    present,
    setPresent,
    beginTransient,
    commitTransient,
    cancelTransient,
    undo,
    redo,
    reset,
    ...meta
  };
}
