import { describe, expect, it } from 'vitest';
import {
  COLOR_BLOCK_ALL_CAMPS,
  COLOR_BLOCK_API_BASE,
  COLOR_BLOCK_SPECIFIC_CAMPS
} from './colorBlocks';

describe('color block constants', () => {
  it('keeps frontend and worker camp rules in one shared source', () => {
    expect(COLOR_BLOCK_API_BASE).toBe('/api');
    expect(COLOR_BLOCK_SPECIFIC_CAMPS.has('skydow')).toBe(true);
    expect(COLOR_BLOCK_SPECIFIC_CAMPS.has('royal')).toBe(true);
    expect(COLOR_BLOCK_SPECIFIC_CAMPS.has('third')).toBe(true);
    expect(COLOR_BLOCK_ALL_CAMPS.has('civil')).toBe(true);
    expect(COLOR_BLOCK_ALL_CAMPS.has('camp4')).toBe(true);
    expect(COLOR_BLOCK_ALL_CAMPS.has('無關陣營')).toBe(true);
  });
});
