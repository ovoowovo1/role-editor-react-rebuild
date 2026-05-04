import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Updater<T> = T | ((current: T) => T);

type CommitMode = 'history' | 'silent';

interface UseHistoryOptions<T> {
  limit?: number;
  serialize?: (value: T) => string;
}

export function useHistory<T>(initialValue: T, options: UseHistoryOptions<T> = {}) {
  const limit = options.limit ?? 200;
  const serialize = options.serialize ?? ((value: T) => JSON.stringify(value));
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
        if (last && serialize(last) === serialize(previous)) return items;
        const next = [...items, previous];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
      setFuture([]);
    },
    [limit, serialize]
  );

  const setPresent = useCallback(
    (updater: Updater<T>, mode: CommitMode = 'history') => {
      setPresentState((current) => {
        const next = typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;
        if (serialize(next) === serialize(current)) return current;
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
    if (before && serialize(before) !== serialize(current)) {
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
      setFuture((futureItems) => [presentRef.current, ...futureItems]);
      setPresentState(previous);
      return items.slice(0, -1);
    });
  }, []);

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
    () => ({
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      historyLength: past.length + 1,
      futureLength: future.length
    }),
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
