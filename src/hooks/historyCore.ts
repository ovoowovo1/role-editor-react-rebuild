type Updater<T> = T | ((current: T) => T);

export type HistoryCommitMode = 'history' | 'silent';

export interface HistoryState<T> {
  present: T;
  past: T[];
  future: T[];
  transientStart: T | null;
}

export interface HistoryCoreOptions<T> {
  limit: number;
  serialize: (value: T) => string;
}

export interface HistoryMeta {
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  futureLength: number;
}

export function defaultHistorySerialize<T>(value: T): string {
  return (value as any).updatedAt ?? JSON.stringify(value);
}

export function createHistoryState<T>(initialValue: T): HistoryState<T> {
  return {
    present: initialValue,
    past: [],
    future: [],
    transientStart: null
  };
}

export function resolveHistoryUpdater<T>(current: T, updater: Updater<T>): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;
}

export function sameHistoryValue<T>(a: T, b: T, serialize: (value: T) => string): boolean {
  return serialize(a) === serialize(b);
}

export function appendHistoryPast<T>(
  past: T[],
  previous: T,
  { limit, serialize }: HistoryCoreOptions<T>
): T[] {
  const last = past[past.length - 1];
  if (last && sameHistoryValue(last, previous, serialize)) return past;
  const next = [...past, previous];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export function appendHistoryFuture<T>(future: T[], present: T, limit: number): T[] {
  return [present, ...future].slice(0, limit);
}

export function setHistoryPresent<T>(
  state: HistoryState<T>,
  updater: Updater<T>,
  mode: HistoryCommitMode,
  options: HistoryCoreOptions<T>
): HistoryState<T> {
  const next = resolveHistoryUpdater(state.present, updater);
  if (sameHistoryValue(next, state.present, options.serialize)) return state;
  return {
    ...state,
    present: next,
    past: mode === 'history' ? appendHistoryPast(state.past, state.present, options) : state.past,
    future: mode === 'history' ? [] : state.future
  };
}

export function beginHistoryTransient<T>(state: HistoryState<T>): HistoryState<T> {
  return { ...state, transientStart: state.present };
}

export function commitHistoryTransient<T>(state: HistoryState<T>, options: HistoryCoreOptions<T>): HistoryState<T> {
  const before = state.transientStart;
  if (!before || sameHistoryValue(before, state.present, options.serialize)) {
    return { ...state, transientStart: null };
  }
  return {
    ...state,
    transientStart: null,
    past: appendHistoryPast(state.past, before, options),
    future: []
  };
}

export function cancelHistoryTransient<T>(state: HistoryState<T>): HistoryState<T> {
  return { ...state, transientStart: null };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (!state.past.length) return state;
  const previous = state.past[state.past.length - 1];
  return {
    ...state,
    present: previous,
    past: state.past.slice(0, -1),
    future: [state.present, ...state.future],
    transientStart: null
  };
}

export function redoHistory<T>(state: HistoryState<T>, limit: number): HistoryState<T> {
  if (!state.future.length) return state;
  const next = state.future[0];
  return {
    ...state,
    present: next,
    past: [...state.past, state.present].slice(-limit),
    future: state.future.slice(1),
    transientStart: null
  };
}

export function resetHistory<T>(state: HistoryState<T>, next: T, keepHistory = false): HistoryState<T> {
  return {
    present: next,
    past: keepHistory ? state.past : [],
    future: keepHistory ? state.future : [],
    transientStart: null
  };
}

export function historyMeta<T>(state: Pick<HistoryState<T>, 'past' | 'future'>): HistoryMeta {
  return {
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyLength: state.past.length + 1,
    futureLength: state.future.length
  };
}
