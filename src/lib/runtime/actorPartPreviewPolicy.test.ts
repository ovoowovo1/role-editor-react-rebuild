import { describe, expect, it } from 'vitest';
import { makePartOption } from '../../test/roleFixtures';
import { shouldUseActorPartRuntimePreview } from './actorPartPreviewPolicy';

function cape(frame: number, isEmpty = false) {
  return makePartOption(`cape-${frame}`, {
    category: 'cape',
    actorLibrary: 'lib_actor_cape',
    frame,
    isEmpty
  });
}

describe('actor part runtime preview policy', () => {
  it('uses runtime previews only for cape frames with nested timelines', () => {
    for (const frame of [2, 7, 13, 15, 16, 21, 24]) {
      expect(shouldUseActorPartRuntimePreview(cape(frame))).toBe(true);
    }
    expect(shouldUseActorPartRuntimePreview(cape(1))).toBe(false);
    expect(shouldUseActorPartRuntimePreview(cape(2, true))).toBe(false);
    expect(shouldUseActorPartRuntimePreview(makePartOption('head', {
      category: 'head',
      actorLibrary: 'lib_actor_head',
      frame: 2
    }))).toBe(false);
  });
});
