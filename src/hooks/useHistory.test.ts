import { describe, expect, it } from 'vitest';
import {
  beginHistoryTransient,
  cancelHistoryTransient,
  commitHistoryTransient,
  createHistoryState,
  historyMeta,
  redoHistory,
  resetHistory,
  setHistoryPresent,
  undoHistory
} from './historyCore';

interface Value {
  id: string;
}

const options = {
  limit: 2,
  serialize: (value: Value) => value.id
};

describe('useHistory core helpers', () => {
  it('tracks undo and redo stacks while respecting the history limit', () => {
    let state = createHistoryState<Value>({ id: 'a' });
    state = setHistoryPresent(state, { id: 'b' }, 'history', options);
    state = setHistoryPresent(state, { id: 'c' }, 'history', options);
    state = setHistoryPresent(state, { id: 'd' }, 'history', options);

    expect(state.past.map((item) => item.id)).toEqual(['b', 'c']);
    expect(historyMeta(state)).toEqual({ canUndo: true, canRedo: false, historyLength: 3, futureLength: 0 });

    state = undoHistory(state);
    expect(state.present.id).toBe('c');
    expect(state.future.map((item) => item.id)).toEqual(['d']);

    state = redoHistory(state, options.limit);
    expect(state.present.id).toBe('d');
    expect(state.future).toEqual([]);
  });

  it('commits transient changes as a single history entry', () => {
    let state = createHistoryState<Value>({ id: 'start' });
    state = beginHistoryTransient(state);
    state = setHistoryPresent(state, { id: 'drag-1' }, 'silent', options);
    state = setHistoryPresent(state, { id: 'drag-2' }, 'silent', options);
    state = commitHistoryTransient(state, options);

    expect(state.present.id).toBe('drag-2');
    expect(state.past.map((item) => item.id)).toEqual(['start']);
    expect(state.transientStart).toBeNull();

    state = beginHistoryTransient(state);
    state = commitHistoryTransient(state, options);
    expect(state.past.map((item) => item.id)).toEqual(['start']);
  });

  it('supports silent updates, cancellation, and reset with optional history retention', () => {
    let state = createHistoryState<Value>({ id: 'a' });
    state = setHistoryPresent(state, { id: 'b' }, 'silent', options);
    expect(state.past).toEqual([]);

    state = beginHistoryTransient(state);
    state = cancelHistoryTransient(state);
    expect(state.transientStart).toBeNull();

    state = setHistoryPresent(state, { id: 'c' }, 'history', options);
    state = resetHistory(state, { id: 'reset' }, true);
    expect(state.past.map((item) => item.id)).toEqual(['b']);

    state = resetHistory(state, { id: 'fresh' });
    expect(state).toMatchObject({ present: { id: 'fresh' }, past: [], future: [], transientStart: null });
  });
});
