import { describe, expect, it } from 'vitest';
import { resolveHistorySource } from './useEditorSessionController';

describe('editor session history routing', () => {
  it('prefers the most recent role history and falls back to image history', () => {
    expect(resolveHistorySource('role', true, true)).toBe('role');
    expect(resolveHistorySource('role', false, true)).toBe('image');
  });

  it('prefers the most recent image history and falls back to role history', () => {
    expect(resolveHistorySource('image', true, true)).toBe('image');
    expect(resolveHistorySource('image', true, false)).toBe('role');
  });

  it('does nothing when neither history has an available operation', () => {
    expect(resolveHistorySource('role', false, false)).toBeNull();
    expect(resolveHistorySource('image', false, false)).toBeNull();
  });
});
