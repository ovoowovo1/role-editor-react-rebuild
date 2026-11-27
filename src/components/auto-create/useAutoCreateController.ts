import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import {
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  isAutoCreateTwroleStoppedError,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../../lib/conversion/auto-create-twrole/contracts';
import { canRunAutoCreateTwroleWorker, runAutoCreateTwroleInWorker } from '../../lib/conversion/autoCreateTwroleWorkerClient';
import { settingsForScope, type InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import { insertDecorationBatchIntoRole } from '../../lib/editor/editorImportMerge';
import { createTwroleBlobWithThumb } from '../../lib/serialization/legacyTwroleExport';
import {
  MAX_MSE_HISTORY_POINTS,
  mseHistoryPoint,
  preloadAutoCreateMseChartCanvas,
  shouldRecordMseProgress,
  type MseHistoryPoint
} from './AutoCreateMseChart';
import {
  buildSourceTitleItems,
  downloadBlob,
  isAutoCreateEmptyTargetError,
  isAutoCreateNoPlacementAreaError,
  isImageFile,
  optionTitle,
  sortTitles,
  toSafeInteger,
  withAutoCreateLogEvery,
  withAutoCreateProcessPreview
} from './autoCreatePanelUtils';
import {
  AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE,
  renderAutoCreateWorkspacePreview,
  shouldRenderAutoCreateWorkspacePreview,
  WorkspacePreviewRequestGate
} from './autoCreateWorkspacePreview';

export type AutoCreateNumericSettingKey = 'tiles' | 'tileBudget' | 'logEvery';

interface UseAutoCreateControllerOptions {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

export function useAutoCreateController({
  decoOptions,
  role,
  insertDraftSettings,
  onInsert,
  onStatus
}: UseAutoCreateControllerOptions) {
  const [settings, setSettings] = useState<AutoCreateTwroleSettings>(DEFAULT_AUTO_CREATE_TWROLE_SETTINGS);
  const [file, setFile] = useState<File | null>(null);
  const [targetPreviewUrl, setTargetPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AutoCreateTwroleResult | null>(null);
  const [progress, setProgress] = useState<AutoCreateTwroleProgress | null>(null);
  const [mseHistory, setMseHistory] = useState<MseHistoryPoint[]>([]);
  const [checkpoint, setCheckpoint] = useState<AutoCreateTwroleCheckpoint | null>(null);
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspacePreviewUrl, setWorkspacePreviewUrl] = useState<string | null>(null);
  const [workspacePreviewWarning, setWorkspacePreviewWarning] = useState<string | null>(null);
  const workerAvailable = useMemo(() => canRunAutoCreateTwroleWorker(), []);
  const [sourceTitleSearch, setSourceTitleSearch] = useState('');
  const [excludedSourceTitles, setExcludedSourceTitles] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const roleRef = useRef(role);
  const onStatusRef = useRef(onStatus);
  const workspacePreviewGateRef = useRef<WorkspacePreviewRequestGate | null>(null);
  roleRef.current = role;
  onStatusRef.current = onStatus;
  workspacePreviewGateRef.current ??= new WorkspacePreviewRequestGate();

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    };
  }, [targetPreviewUrl]);

  useEffect(() => {
    const gate = workspacePreviewGateRef.current!;
    const requestRevision = gate.begin();
    setWorkspacePreviewUrl(null);
    setWorkspacePreviewWarning(null);
    if (!shouldRenderAutoCreateWorkspacePreview(result, running)) {
      return () => {
        if (gate.isCurrent(requestRevision)) gate.invalidate();
      };
    }

    const startMark = `${AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE.startPrefix}${requestRevision}`;
    const endMark = `${AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE.endPrefix}${requestRevision}`;
    const previewPerformance = globalThis.performance;
    const canMeasurePreview = typeof previewPerformance?.mark === 'function'
      && typeof previewPerformance?.measure === 'function';
    if (canMeasurePreview) previewPerformance.mark(startMark);

    void renderAutoCreateWorkspacePreview({ role: roleRef.current, result })
      .then((preview) => {
        if (!gate.isCurrent(requestRevision)) return;
        setWorkspacePreviewUrl(preview.dataUrl);
      })
      .catch((previewError: unknown) => {
        if (!gate.isCurrent(requestRevision)) return;
        const detail = previewError instanceof Error ? previewError.message : String(previewError);
        const message = t('autoCreate.warning.previewRenderFailed', { message: detail });
        // Worker pixels are only a loading placeholder. Once the canonical
        // Pixi render has failed, do not keep showing a preview that may differ
        // from what insertion would display in the workspace.
        setWorkspacePreviewWarning(message);
        onStatusRef.current(message);
      })
      .finally(() => {
        if (!canMeasurePreview) return;
        try {
          previewPerformance.mark(endMark);
          previewPerformance.measure(AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE.measure, startMark, endMark);
        } catch {
          // Diagnostics must never change preview behavior if entries were
          // externally cleared while the asynchronous render was in flight.
        }
      });

    return () => {
      if (gate.isCurrent(requestRevision)) gate.invalidate();
    };
  }, [result, running]);

  const sourceTitleItems = useMemo(() => buildSourceTitleItems(decoOptions), [decoOptions]);
  const availableTitleSet = useMemo(() => new Set(sourceTitleItems.map((item) => item.title)), [sourceTitleItems]);

  useEffect(() => {
    setExcludedSourceTitles((current) => {
      const next = current.filter((title) => availableTitleSet.has(title));
      return next.length === current.length ? current : next;
    });
  }, [availableTitleSet]);

  const excludedTitleSet = useMemo(() => new Set(excludedSourceTitles), [excludedSourceTitles]);

  const filteredDecoOptions = useMemo(() => {
    if (excludedTitleSet.size === 0) return decoOptions;
    return decoOptions.filter((option) => !excludedTitleSet.has(optionTitle(option)));
  }, [decoOptions, excludedTitleSet]);

  const visibleSourceTitleItems = useMemo(() => {
    const query = sourceTitleSearch.trim().toLocaleLowerCase();
    if (!query) return sourceTitleItems;
    return sourceTitleItems.filter((item) => item.title.toLocaleLowerCase().includes(query));
  }, [sourceTitleItems, sourceTitleSearch]);

  const usedTitleCount = Math.max(0, sourceTitleItems.length - excludedTitleSet.size);

  const progressPercent = useMemo(() => {
    if (!progress || progress.total <= 0) return 0;
    return Math.max(0, Math.min(100, (progress.step / progress.total) * 100));
  }, [progress]);

  const stageLabel = progress ? t(`autoCreate.progress.${progress.stage}`) : t('autoCreate.progressIdle');
  const savePreviewDuringProcess = settings.exportEvery > 0;

  const recordProgress = useCallback((nextProgress: AutoCreateTwroleProgress) => {
    setProgress(nextProgress);
    if (!shouldRecordMseProgress(nextProgress)) return;
    preloadAutoCreateMseChartCanvas();
    setMseHistory((current) => {
      const nextPoint = mseHistoryPoint(nextProgress);
      if (current.some((point) => point.key === nextPoint.key)) return current;
      const next = [...current, nextPoint];
      return next.length > MAX_MSE_HISTORY_POINTS ? next.slice(-MAX_MSE_HISTORY_POINTS) : next;
    });
  }, []);

  const resetGeneratedOutput = () => {
    setResult(null);
    setCheckpoint(null);
    setStopping(false);
    setInserted(false);
    setProgress(null);
    setMseHistory([]);
  };

  const acceptFile = (incoming: File | null | undefined) => {
    if (!incoming) return;
    if (!isImageFile(incoming)) {
      setError(t('autoCreate.error.fileType'));
      return;
    }

    if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    setTargetPreviewUrl(URL.createObjectURL(incoming));
    setFile(incoming);
    setError(null);
    resetGeneratedOutput();
  };

  const patchNumber = (key: AutoCreateNumericSettingKey, rawValue: string) => {
    setSettings((current) => {
      const nextValue = toSafeInteger(rawValue, current[key]);
      if (key === 'tiles') return { ...current, tiles: Math.max(1, nextValue) };
      if (key === 'tileBudget') return { ...current, tileBudget: Math.max(0, nextValue) };
      return withAutoCreateLogEvery(current, Math.max(1, nextValue));
    });
    setResult(null);
    setCheckpoint(null);
    setInserted(false);
    setProgress(null);
    setMseHistory([]);
  };

  const patchSavePreview = (checked: boolean) => {
    setSettings((current) => withAutoCreateProcessPreview(current, checked));
  };

  const toggleSourceTitle = (title: string, useTitle: boolean) => {
    setExcludedSourceTitles((current) => {
      const next = new Set(current);
      if (useTitle) next.delete(title);
      else next.add(title);
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const useAllSourceTitles = () => {
    setExcludedSourceTitles([]);
    resetGeneratedOutput();
  };

  const useVisibleSourceTitles = () => {
    const visible = new Set(visibleSourceTitleItems.map((item) => item.title));
    setExcludedSourceTitles((current) => current.filter((title) => !visible.has(title)));
    resetGeneratedOutput();
  };

  const excludeVisibleSourceTitles = () => {
    if (visibleSourceTitleItems.length === 0) return;
    setExcludedSourceTitles((current) => {
      const next = new Set(current);
      for (const item of visibleSourceTitleItems) next.add(item.title);
      return Array.from(next).sort(sortTitles);
    });
    resetGeneratedOutput();
  };

  const convert = async () => {
    if (!file || running || filteredDecoOptions.length === 0) return;
    if (!workerAvailable) {
      const message = t('autoCreate.error.workerUnavailable');
      setError(message);
      onStatus(t('status.autoCreateFailed', { message }));
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const resumeSnapshot = checkpoint?.snapshot ?? null;

    setRunning(true);
    setStopping(false);
    setError(null);
    if (!resumeSnapshot) {
      setResult(null);
      setMseHistory([]);
    }
    setInserted(false);
    setProgress(
      resumeSnapshot && checkpoint
        ? checkpoint.progress
        : {
            stage: 'sources',
            step: 0,
            total: Math.max(1, filteredDecoOptions.length),
            mse: 0,
            active: 0,
            accepted: 0,
            rejected: 0,
            pruned: 0,
            replaced: 0
          }
    );

    try {
      const next = await runAutoCreateTwroleInWorker({
        targetFile: file,
        decoOptions: filteredDecoOptions,
        settings,
        resumeSnapshot,
        signal: controller.signal,
        onProgress: recordProgress,
        onCheckpoint: (nextCheckpoint) => {
          setCheckpoint(nextCheckpoint);
          setResult(nextCheckpoint.result);
          recordProgress(nextCheckpoint.progress);
          setInserted(false);
        }
      });
      setResult(next);
      setCheckpoint(null);
      onStatus(t('status.autoCreateConverted', { count: next.decorations.length }));
    } catch (err) {
      if (isAutoCreateTwroleStoppedError(err)) {
        setResult(err.result);
        setCheckpoint(err.checkpoint);
        recordProgress(err.checkpoint.progress);
        setInserted(false);
        setError(null);
        onStatus(t('status.autoCreateStopped'));
      } else if ((err as DOMException)?.name === 'AbortError') {
        setError(t('autoCreate.error.aborted'));
        onStatus(t('status.autoCreateStopped'));
      } else {
        const message = isAutoCreateEmptyTargetError(err)
          ? t('autoCreate.error.emptyTarget')
          : isAutoCreateNoPlacementAreaError(err)
            ? t('autoCreate.error.noPlacementArea')
            : err instanceof Error
              ? err.message
              : String(err);
        setError(message);
        onStatus(t('status.autoCreateFailed', { message }));
      }
    } finally {
      setRunning(false);
      setStopping(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    if (!abortRef.current || stopping) return;
    setStopping(true);
    abortRef.current.abort();
  };

  const insert = () => {
    if (!result || inserted) return;
    const count = onInsert(result.decorations, t('autoCreate.groupName.default'));
    if (count <= 0) return;
    setInserted(true);
    onStatus(t('status.autoCreateInserted', { count }));
  };

  const downloadExportJson = () => {
    if (!result) return;
    downloadBlob(
      new Blob([JSON.stringify(result.exportJson, null, 2)], { type: 'application/json' }),
      'export2.json'
    );
  };

  const downloadTwrole = async () => {
    if (!result) return;
    const scopedSettings = settingsForScope(insertDraftSettings, insertDraftSettings.scopes.mergeBatch);
    const merged = insertDecorationBatchIntoRole(role, result.decorations, t('autoCreate.groupName.default'), scopedSettings);
    if (!merged) return;
    const baseName = file?.name.replace(/\.[^.]+$/, '') || 'auto-create';
    try {
      downloadBlob(await createTwroleBlobWithThumb(merged.role), baseName + '.twrole');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onStatus(t('status.autoCreateFailed', { message }));
    }
  };

  return {
    settings,
    file,
    targetPreviewUrl,
    result,
    progress,
    mseHistory,
    checkpoint,
    running,
    stopping,
    inserted,
    error,
    workspacePreviewUrl,
    workspacePreviewWarning,
    workerAvailable,
    sourceTitleSearch,
    setSourceTitleSearch,
    sourceTitleItems,
    visibleSourceTitleItems,
    excludedTitleSet,
    filteredDecoOptions,
    usedTitleCount,
    progressPercent,
    stageLabel,
    savePreviewDuringProcess,
    acceptFile,
    patchNumber,
    patchSavePreview,
    toggleSourceTitle,
    useAllSourceTitles,
    useVisibleSourceTitles,
    excludeVisibleSourceTitles,
    convert,
    stop,
    insert,
    downloadExportJson,
    downloadTwrole
  };
}
