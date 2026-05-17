import { describe, expect, it } from 'vitest';
import type { BrushFillConversionResult } from '../lib/brushFillToDeco';
import type { ImageToDecoConversionResult } from '../lib/imageToDeco';
import {
  brushResultStats,
  fileBaseName,
  formatNumber,
  imageGroupName,
  imageResultStats,
  progressLabel,
  progressPercent
} from './extraPanelModels';

const translate = (key: string) => key;

describe('extra panel models', () => {
  it('derives file names and image group names', () => {
    expect(fileBaseName({ name: 'avatar.preview.png' })).toBe('avatar.preview');
    expect(fileBaseName({ name: 'avatar' })).toBe('avatar');
    expect(fileBaseName(null)).toBe('Image Build');
    expect(imageGroupName({ name: 'avatar.webp' })).toBe('Image: avatar');
  });

  it('clamps progress percent and maps progress labels', () => {
    expect(progressPercent(null)).toBe(0);
    expect(progressPercent({ stage: 'palette', done: 5, total: 10 })).toBe(50);
    expect(progressPercent({ stage: 'image', done: 99, total: 10 })).toBe(100);
    expect(progressPercent({ stage: 'pixels', done: -2, total: 10 })).toBe(0);
    expect(progressPercent({ stage: 'pixels', done: 1, total: 0 })).toBe(0);
    expect(progressLabel(null, translate)).toBe('extra.progressIdle');
    expect(progressLabel({ stage: 'pixels', done: 1, total: 2 }, translate)).toBe('extra.progress.pixels');
  });

  it('formats result summary stats', () => {
    const imageResult: ImageToDecoConversionResult = {
      decorations: [],
      sourceWidth: 200,
      sourceHeight: 100,
      outputWidth: 120,
      outputHeight: 60,
      opaquePixels: 1234.4,
      generatedPixels: 9876.5,
      skippedPixels: 0,
      paletteSize: 42,
      truncated: false,
      previewDataUrl: 'data:image/png;base64,',
      warnings: []
    };
    const brushResult: BrushFillConversionResult = {
      decorations: [],
      generatedPixels: 21,
      sampledPixels: 3333.3,
      paletteSize: 4,
      truncated: false,
      warnings: []
    };

    expect(formatNumber(12345.6)).toBe('12,346');
    expect(imageResultStats(null, translate)).toBeNull();
    expect(imageResultStats(imageResult, translate)).toEqual([
      { label: 'extra.stat.layers', value: '9,877' },
      { label: 'extra.stat.size', value: '120x60' },
      { label: 'extra.stat.palette', value: '42' },
      { label: 'extra.stat.visible', value: '1,234' }
    ]);
    expect(brushResultStats(brushResult, 7, translate)).toEqual([
      { label: 'extra.stat.layers', value: '21' },
      { label: 'extra.brush.samples', value: '3,333' },
      { label: 'extra.stat.palette', value: '4' },
      { label: 'extra.brush.points', value: '7' }
    ]);
  });
});
