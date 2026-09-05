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

export interface HistoryCodec<T, H> {
  create(previous: T, next: T): H | null;
  apply(current: T, entry: H, direction: 'undo' | 'redo'): T;
}

interface UseHistoryOptions<T, H = T> {
  limit?: number;
  serialize?: (value: T) => string;
  isEqual?: (a: T, b: T) => boolean;
  codec?: HistoryCodec<T, H>;
}

export function useHistory<T, H = T>(initialValue: T, options: UseHistoryOptions<T, H> = {}) {
  const limit = options.limit ?? 200;
  const serialize = options.serialize ?? defaultHistorySerialize;
  const isEqual = options.isEqual ?? ((a: T, b: T) => sameHistoryValue(a, b, serialize));
  const codec = options.codec;
  const [present, setPresentState] = useState<T>(initialValue);
  const [past, setPast] = useState<H[]>([]);
  const [future, setFuture] = useState<H[]>([]);
  const presentRef = useRef(present);
  const transientStartRef = useRef<T | null>(null);

  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  const commitPast = useCallback(
    (previous: T, next: T) => {
      setPast((items) => {
        if (codec) {
          const entry = codec.create(previous, next);
          return entry ? [...items, entry].slice(-limit) : items;
        }
        const last = items[items.length - 1];
        if (last && sameHistoryValue(last as unknown as T, previous, serialize)) return items;
        return appendHistoryPast(items as unknown as T[], previous, { limit, serialize }) as unknown as H[];
      });
      setFuture([]);
    },
    [codec, limit, serialize]
  );

  const setPresent = useCallback(
    (updater: Updater<T>, mode: HistoryCommitMode = 'history') => {
      setPresentState((current) => {
        const next = resolveHistoryUpdater(current, updater);
        if (isEqual(next, current)) return current;
        if (mode === 'history') commitPast(current, next);
        return next;
      });
    },
    [commitPast, isEqual]
  );

  const beginTransient = useCallback(() => {
    transientStartRef.current = presentRef.current;
  }, []);

  const commitTransient = useCallback(() => {
    const before = transientStartRef.current;
    transientStartRef.current = null;
    const current = presentRef.current;
    if (before && !isEqual(before, current)) {
      commitPast(before, current);
    }
  }, [commitPast, isEqual]);

  const cancelTransient = useCallback(() => {
    transientStartRef.current = null;
  }, []);

  const undo = useCallback(() => {
    setPast((items) => {
      if (!items.length) return items;
      const previous = items[items.length - 1];
      setFuture((futureItems) =>
        codec
          ? [previous, ...futureItems].slice(0, limit)
          : appendHistoryFuture(futureItems, presentRef.current as unknown as H, limit)
      );
      setPresentState(codec ? codec.apply(presentRef.current, previous, 'undo') : previous as unknown as T);
      return items.slice(0, -1);
    });
  }, [codec, limit]);

  const redo = useCallback(() => {
    setFuture((items) => {
      if (!items.length) return items;
      const next = items[0];
      setPast((pastItems) =>
        codec
          ? [...pastItems, next].slice(-limit)
          : [...pastItems, presentRef.current as unknown as H].slice(-limit)
      );
      setPresentState(codec ? codec.apply(presentRef.current, next, 'redo') : next as unknown as T);
      return items.slice(1);
    });
  }, [codec, limit]);

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
