import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import type { ImageToDecoConversionOptions } from '../../lib/conversion/imageToDeco';
import type { InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import {
  type BrushFillMask
} from '../../lib/conversion/brushFillToDeco';
import {
  DEFAULT_EXTRA_GROUP_NAME,
  type ExtraToolMode
} from './extraPanelModels';
import { useExtraBrushConversion } from './useExtraBrushConversion';
import { useExtraImageConversion } from './useExtraImageConversion';

export interface ExtraPanelProps {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  brushFillActive: boolean;
  brushFillBrushSize: number;
  brushFillMask: BrushFillMask;
  onBrushFillActiveChange(active: boolean): void;
  onBrushFillBrushSizeChange(size: number): void;
  onBrushFillClear(): void;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

export function useExtraPanelController({
  decoOptions,
  brushFillActive,
  brushFillMask,
  onBrushFillActiveChange,
  onBrushFillClear,
  onInsert,
  onStatus
}: ExtraPanelProps) {
  const [toolMode, setToolMode] = useState<ExtraToolMode>('image');
  const [groupName, setGroupName] = useState(DEFAULT_EXTRA_GROUP_NAME);
  const [error, setError] = useState<string | null>(null);
  const [optionsChangeVersion, setOptionsChangeVersion] = useState(0);
  const imageConversion = useExtraImageConversion({
    decoOptions,
    groupName,
    setGroupName,
    onInsert,
    onStatus,
    onError: setError,
    onOptionsChanged: () => setOptionsChangeVersion((version) => version + 1)
  });
  const brushConversion = useExtraBrushConversion({
    decoOptions,
    brushFillMask,
    options: imageConversion.options,
    groupName,
    onInsert,
    onStatus,
    onError: setError
  });

  useEffect(() => {
    if (toolMode !== 'brush' && brushFillActive) {
      onBrushFillActiveChange(false);
    }
    if (toolMode === 'brush' && groupName === DEFAULT_EXTRA_GROUP_NAME) {
      setGroupName(t('extra.brush.groupName'));
    }
  }, [brushFillActive, groupName, onBrushFillActiveChange, toolMode]);

  useEffect(() => () => onBrushFillActiveChange(false), [onBrushFillActiveChange]);

  useEffect(() => {
    brushConversion.clearBrushResult();
  }, [optionsChangeVersion]);

  const clearBrushRange = () => {
    onBrushFillClear();
    brushConversion.clearBrushResult();
  };

  return {
    toolMode,
    quality: imageConversion.quality,
    options: imageConversion.options,
    file: imageConversion.file,
    visiblePreview: imageConversion.visiblePreview,
    groupName,
    summary: imageConversion.summary,
    brushSummary: brushConversion.brushSummary,
    brushSourceMode: brushConversion.brushSourceMode,
    brushColor: brushConversion.brushColor,
    brushDecoId: brushConversion.brushDecoId,
    progress: imageConversion.progress,
    converting: imageConversion.converting,
    brushFilling: brushConversion.brushFilling,
    error,
    inserted: imageConversion.inserted,
    resultWarnings: imageConversion.resultWarnings,
    brushResultWarnings: brushConversion.brushResultWarnings,
    canConvert: imageConversion.canConvert,
    canInsert: imageConversion.canInsert,
    hasBrushRange: brushConversion.hasBrushRange,
    canBrushFill: brushConversion.canBrushFill,
    setToolMode,
    setGroupName,
    setPreset: imageConversion.setPreset,
    patchOptions: imageConversion.patchOptions,
    acceptFile: imageConversion.acceptFile,
    convert: imageConversion.convert,
    insert: imageConversion.insert,
    fillBrushRange: brushConversion.fillBrushRange,
    clearBrushRange,
    changeBrushSourceMode: brushConversion.changeBrushSourceMode,
    changeBrushColor: brushConversion.changeBrushColor,
    changeBrushDecoId: brushConversion.changeBrushDecoId
  };
}
