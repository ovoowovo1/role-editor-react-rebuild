import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POSITION_RANGE,
  EDITOR_STAGE_MAX_SCALE,
  EDITOR_STAGE_MIN_SCALE,
  MAX_POSITION_RANGE,
  ORIGINAL_DECO_MAX_RATIO,
  ORIGINAL_DECO_MAX_SCALE,
  ORIGINAL_DECO_MIN_RATIO,
  ORIGINAL_DECO_MIN_SCALE
} from './editor';

describe('editor constants', () => {
  it('keeps editor bounds in one place', () => {
    expect(EDITOR_STAGE_MIN_SCALE).toBe(1);
    expect(EDITOR_STAGE_MAX_SCALE).toBe(30);
    expect(DEFAULT_POSITION_RANGE).toBe(60);
    expect(MAX_POSITION_RANGE).toBe(10000);
    expect(ORIGINAL_DECO_MIN_SCALE).toBe(0.001);
    expect(ORIGINAL_DECO_MAX_SCALE).toBe(5);
    expect(ORIGINAL_DECO_MIN_RATIO).toBe(0.001);
    expect(ORIGINAL_DECO_MAX_RATIO).toBe(5);
  });
});
