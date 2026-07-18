import { describe, expect, it } from 'vitest';
import type { PartOption } from '../../types/role';
import { DEFAULT_AUTO_CREATE_TWROLE_SETTINGS } from '../../lib/conversion/auto-create-twrole/contracts';
import {
  AUTO_CREATE_PROCESS_PREVIEW_EXPORT_EVERY,
  buildSourceTitleItems,
  formatNumber,
  isAutoCreateEmptyTargetError,
  isAutoCreateNoPlacementAreaError,
  isImageFile,
  optionTitle,
  sortTitles,
  toSafeInteger,
  withAutoCreateLogEvery,
  withAutoCreateProcessPreview
} from './autoCreatePanelUtils';

function option(id: string, label: string, code = id): PartOption {
  return {
    id,
    code,
    category: 'deco',
    label,
    icon: '',
    accent: '',
    secondary: '',
    mockKind: 'deco'
  };
}

describe('AutoCreate panel utilities', () => {
  it('groups source titles and sorts them naturally', () => {
    const result = buildSourceTitleItems([
      option('a', 'Asset 10'),
      option('b', 'Asset 2'),
      option('c', 'Asset 2'),
      option('d', 'Asset 1')
    ]);

    expect(result).toEqual([
      { title: 'Asset 1', count: 1 },
      { title: 'Asset 2', count: 2 },
      { title: 'Asset 10', count: 1 }
    ]);
  });

  it('uses trimmed labels before code and id fallbacks', () => {
    expect(optionTitle(option('id', '  Display name  ', 'CODE'))).toBe('Display name');
    expect(optionTitle(option('id', '   ', 'CODE'))).toBe('CODE');
    expect(optionTitle(option('id', '', ''))).toBe('id');
  });

  it('recognizes image MIME types and supported filename extensions', () => {
    expect(isImageFile({ type: 'image/avif', name: 'asset.bin' })).toBe(true);
    expect(isImageFile({ type: '', name: 'asset.WEBP' })).toBe(true);
    expect(isImageFile({ type: 'application/json', name: 'asset.json' })).toBe(false);
  });

  it('recognizes the empty-target worker error by its structured name', () => {
    expect(isAutoCreateEmptyTargetError({ name: 'AutoCreateEmptyTargetError' })).toBe(true);
    expect(isAutoCreateEmptyTargetError(new Error('empty'))).toBe(false);
    expect(isAutoCreateEmptyTargetError(null)).toBe(false);
  });

  it('recognizes the no-placement-area worker error by its structured name', () => {
    expect(isAutoCreateNoPlacementAreaError({ name: 'AutoCreateNoPlacementAreaError' })).toBe(true);
    expect(isAutoCreateNoPlacementAreaError({ name: 'AutoCreateEmptyTargetError' })).toBe(false);
    expect(isAutoCreateNoPlacementAreaError(null)).toBe(false);
  });

  it('normalizes numeric input and display values', () => {
    expect(toSafeInteger('42', 7)).toBe(42);
    expect(toSafeInteger('not-a-number', 7)).toBe(7);
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('-');
  });

  it('keeps progress frequency independent from process preview exports', () => {
    const settings = {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      logEvery: 25,
      exportEvery: AUTO_CREATE_PROCESS_PREVIEW_EXPORT_EVERY
    };

    expect(withAutoCreateLogEvery(settings, 7)).toMatchObject({
      logEvery: 7,
      exportEvery: AUTO_CREATE_PROCESS_PREVIEW_EXPORT_EVERY
    });
  });

  it('uses a fixed process preview interval when the checkbox is enabled', () => {
    const settings = {
      ...DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
      logEvery: 17,
      exportEvery: 0
    };

    expect(withAutoCreateProcessPreview(settings, true)).toMatchObject({
      logEvery: 17,
      exportEvery: 1000
    });
    expect(withAutoCreateProcessPreview(settings, false)).toMatchObject({
      logEvery: 17,
      exportEvery: 0
    });
  });

  it('sorts numeric suffixes in human-readable order', () => {
    expect(['Layer 10', 'layer 2', 'Layer 1'].sort(sortTitles)).toEqual([
      'Layer 1',
      'layer 2',
      'Layer 10'
    ]);
  });
});
