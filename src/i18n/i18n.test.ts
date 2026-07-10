import { describe, expect, it } from 'vitest';
import { en } from './en';
import { zhTW } from './zh-TW';

describe('translations', () => {
  it('keeps English and Traditional Chinese key sets in sync', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhTW).sort());
  });

  it('does not leak CJK copy into the English locale', () => {
    const mixedEntries = Object.entries(en).filter(([, value]) => /[\u3400-\u9fff]/u.test(value));
    expect(mixedEntries).toEqual([]);
  });
});
