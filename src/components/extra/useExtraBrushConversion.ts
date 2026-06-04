import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption } from '../../types/role';
import type { ImageToDecoConversionOptions } from '../../lib/conversion/imageToDeco';
import {
  convertBrushFillToDecos,
  type BrushFillConversionResult,
  type BrushFillMask,
  type BrushFillSource
} from '../../lib/conversion/brushFillToDeco';
import {
  brushResultStats,
  type BrushFillSourceMode
} from './extraPanelModels';

export function useExtraBrushConversion({
  decoOptions,
  brushFillMask,
  options,
  groupName,
  onInsert,
  onStatus,
  onError
}: {
  decoOptions: PartOption[];
  brushFillMask: BrushFillMask;
  options: ImageToDecoConversionOptions;
  groupName: string;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
  onError(message: string | null): void;
}) {
  const [brushResult, setBrushResult] = useState<BrushFillConversionResult | null>(null);
  const [brushSourceMode, setBrushSourceMode] = useState<BrushFillSourceMode>('color');
  const [brushColor, setBrushColor] = useState('#35d0ff');
  const [brushDecoId, setBrushDecoId] = useState('');
  const [brushFilling, setBrushFilling] = useState(false);

  useEffect(() => {
    if (brushDecoId && decoOptions.some((option) => option.id === brushDecoId)) return;
    setBrushDecoId(decoOptions[0]?.id ?? '');
  }, [brushDecoId, decoOptions]);

  const hasBrushRange = brushFillMask.points.length > 0;
  const canBrushFill = Boolean(hasBrushRange && !brushFilling && decoOptions.length && (brushSourceMode === 'color' || brushDecoId));
  const brushSummary = useMemo(
    () => brushResultStats(brushResult, brushFillMask.points.length, t),
    [brushFillMask.points.length, brushResult]
  );

  const clearBrushResult = () => {
    setBrushResult(null);
  };

  const fillBrushRange = async () => {
    setBrushFilling(true);
    onError(null);
    setBrushResult(null);

    try {
      const source: BrushFillSource = brushSourceMode === 'color'
        ? { type: 'color', color: brushColor }
        : { type: 'deco', assetId: brushDecoId };
      const converted = await convertBrushFillToDecos(brushFillMask, source, decoOptions, options);
      setBrushResult(converted);
      if (!converted.decorations.length) {
        onStatus(t('status.brushFillEmpty'));
        return;
      }
      const insertedCount = onInsert(converted.decorations, groupName.trim() || t('extra.brush.groupName'));
      onStatus(t('status.brushFillInserted', { count: insertedCount }));
    } catch (brushError) {
      const message = brushError instanceof Error ? brushError.message : String(brushError);
      onError(message);
      onStatus(t('status.brushFillFailed', { message }));
    } finally {
      setBrushFilling(false);
    }
  };

  const changeBrushSourceMode = (mode: BrushFillSourceMode) => {
    setBrushSourceMode(mode);
    setBrushResult(null);
  };

  const changeBrushColor = (color: string) => {
    setBrushColor(color);
    setBrushResult(null);
  };

  const changeBrushDecoId = (id: string) => {
    setBrushDecoId(id);
    setBrushResult(null);
  };

  return {
    brushSummary,
    brushSourceMode,
    brushColor,
    brushDecoId,
    brushFilling,
    brushResultWarnings: brushResult?.warnings,
    hasBrushRange,
    canBrushFill,
    fillBrushRange,
    clearBrushResult,
    changeBrushSourceMode,
    changeBrushColor,
    changeBrushDecoId
  };
}
