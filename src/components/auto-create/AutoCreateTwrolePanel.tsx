import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { t } from '../../i18n';
import type { DecorationLayer, PartOption, RoleDocument } from '../../types/role';
import {
  AUTO_CREATE_RANKER_ROLLOUT,
  DEFAULT_AUTO_CREATE_TWROLE_SETTINGS,
  isAutoCreateTwroleStoppedError,
  type AutoCreateTwroleCheckpoint,
  type AutoCreateTwroleProgress,
  type AutoCreateTwroleResult,
  type AutoCreateTwroleSettings
} from '../../lib/conversion/auto-create-twrole/contracts';
import { canRunAutoCreateTwroleWorker, runAutoCreateTwroleInWorker } from '../../lib/conversion/autoCreateTwroleWorkerClient';
import {
  clearAutoCreateLearningCamp,
  getAutoCreateTrainerStatus,
  setAutoCreateLearningEnabled,
  type AutoCreateTrainerStatusResult
} from '../../lib/conversion/auto-create-twrole/learning/trainerClient';
import {
  exportPortableLearningDataset,
  importPortableRankerModel
} from '../../lib/conversion/auto-create-twrole/learning';
import { settingsForScope, type InsertDraftSettings } from '../../lib/editor/editorInsertSettings';
import { insertDecorationBatchIntoRole } from '../../lib/editor/editorImportMerge';
import { createTwroleBlobWithThumb } from '../../lib/serialization/legacyTwroleExport';
import { ImageDropzone } from '../ui/ImageDropzone';
import { ProgressBar } from '../ui/ProgressBar';
import {
  AutoCreateMseChart,
  MAX_MSE_HISTORY_POINTS,
  mseHistoryPoint,
  preloadAutoCreateMseChartCanvas,
  shouldRecordMseProgress,
  type MseHistoryPoint
} from './AutoCreateMseChart';
import { AutoCreateSourceFilter } from './AutoCreateSourceFilter';
import {
  buildSourceTitleItems,
  downloadBlob,
  formatNumber,
  isAutoCreateEmptyTargetError,
  isAutoCreateNoPlacementAreaError,
  isAutoCreateRankerLabAvailable,
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

export interface AutoCreateTwrolePanelProps {
  decoOptions: PartOption[];
  role: RoleDocument;
  insertDraftSettings: InsertDraftSettings;
  onInsert(decorations: DecorationLayer[], groupName: string): number;
  onStatus(message: string): void;
}

type GuiNumericSettingKey = 'tiles' | 'tileBudget' | 'logEvery';

export function AutoCreateTwrolePanelContent({ decoOptions, role, insertDraftSettings, onInsert, onStatus }: AutoCreateTwrolePanelProps) {
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
  const [learningStatus, setLearningStatus] = useState<AutoCreateTrainerStatusResult | null>(null);
  const [learningBusy, setLearningBusy] = useState(false);
  const [portableBusy, setPortableBusy] = useState<'export' | 'import' | null>(null);
  const [portableProgress, setPortableProgress] = useState('');
  const [learningPollRevision, setLearningPollRevision] = useState(0);
  const workerAvailable = useMemo(() => canRunAutoCreateTwroleWorker(), []);
  const rankerLabAvailable = useMemo(
    () => typeof window !== 'undefined' && isAutoCreateRankerLabAvailable(window.location),
    []
  );
  const [sourceTitleSearch, setSourceTitleSearch] = useState('');
  const [excludedSourceTitles, setExcludedSourceTitles] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const portableAbortRef = useRef<AbortController | null>(null);
  const portableModelInputRef = useRef<HTMLInputElement | null>(null);
  const roleRef = useRef(role);
  const onStatusRef = useRef(onStatus);
  const workspacePreviewGateRef = useRef<WorkspacePreviewRequestGate | null>(null);
  const previousLearningCampRef = useRef(role.camp);
  roleRef.current = role;
  onStatusRef.current = onStatus;
  workspacePreviewGateRef.current ??= new WorkspacePreviewRequestGate();

  const refreshLearningStatus = useCallback(async () => {
    if (!workerAvailable) return null;
    try {
      const next = await getAutoCreateTrainerStatus(role.camp);
      setLearningStatus(next);
      return next;
    } catch {
      // Learning is optional. A status/read failure must not disable generation.
      setLearningStatus(null);
      return null;
    }
  }, [role.camp, workerAvailable]);

  useEffect(() => {
    void refreshLearningStatus();
  }, [refreshLearningStatus]);

  useEffect(() => {
    if (!workerAvailable || learningPollRevision === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const poll = async () => {
      const next = await refreshLearningStatus();
      if (cancelled) return;
      attempts += 1;
      const pending = next?.status.enabled
        && (next.status.phase === 'collecting' || next.status.phase === 'training');
      if (pending && attempts < 60) {
        timer = setTimeout(() => { void poll(); }, 2_000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [learningPollRevision, refreshLearningStatus, workerAvailable]);

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

  const acceptFile = (incoming: File | null | undefined) => {
    if (!incoming) return;
    if (!isImageFile(incoming)) {
      setError(t('autoCreate.error.fileType'));
      return;
    }

    if (targetPreviewUrl) URL.revokeObjectURL(targetPreviewUrl);
    setTargetPreviewUrl(URL.createObjectURL(incoming));
    setFile(incoming);
    setResult(null);
    setCheckpoint(null);
    setStopping(false);
    setInserted(false);
    setError(null);
    setProgress(null);
    setMseHistory([]);
  };

  const patchNumber = (key: GuiNumericSettingKey, rawValue: string) => {
    setSettings((current) => {
      const nextValue = toSafeInteger(rawValue, current[key]);
      if (key === 'tiles') {
        return { ...current, tiles: Math.max(1, nextValue) };
      }
      if (key === 'tileBudget') {
        return { ...current, tileBudget: Math.max(0, nextValue) };
      }
      const nextLogEvery = Math.max(1, nextValue);
      return withAutoCreateLogEvery(current, nextLogEvery);
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

  const resetGeneratedOutput = () => {
    setResult(null);
    setCheckpoint(null);
    setStopping(false);
    setInserted(false);
    setProgress(null);
    setMseHistory([]);
  };

  const rankerLabReady = Boolean(
    learningStatus?.status.enabled
    && learningStatus.status.activeModelRevision
    && learningStatus.activeTrainedModes.length > 0
  );
  const rankerLabEnabled = Boolean(
    rankerLabAvailable
    && rankerLabReady
    && settings.rankerRolloutApproved
  );

  useEffect(() => {
    if (previousLearningCampRef.current === role.camp) return;
    previousLearningCampRef.current = role.camp;
    setSettings((current) => ({
      ...current,
      rankerRolloutApproved: AUTO_CREATE_RANKER_ROLLOUT.approved
    }));
    resetGeneratedOutput();
  }, [role.camp]);

  const toggleRankerLab = (enabled: boolean) => {
    setSettings((current) => ({
      ...current,
      rankerRolloutApproved: AUTO_CREATE_RANKER_ROLLOUT.approved
        || (enabled && rankerLabAvailable && rankerLabReady)
    }));
    resetGeneratedOutput();
  };

  const toggleLearning = async (enabled: boolean) => {
    setLearningBusy(true);
    setSettings((current) => ({ ...current, rankerEnabled: enabled }));
    resetGeneratedOutput();
    try {
      await setAutoCreateLearningEnabled(role.camp, enabled);
      await refreshLearningStatus();
    } catch (learningError) {
      const message = learningError instanceof Error ? learningError.message : String(learningError);
      setError(message);
    } finally {
      setLearningBusy(false);
    }
  };

  const clearLearning = async () => {
    setLearningBusy(true);
    setError(null);
    resetGeneratedOutput();
    try {
      const cleared = await clearAutoCreateLearningCamp(role.camp, true);
      await refreshLearningStatus();
      if (cleared.modelCleanupErrors.length > 0) {
        setError(t('autoCreate.learning.clearWarning', {
          message: cleared.modelCleanupErrors.join('; ')
        }));
      }
    } catch (learningError) {
      const message = learningError instanceof Error ? learningError.message : String(learningError);
      setError(message);
    } finally {
      setLearningBusy(false);
    }
  };

  const exportLearningDataset = async () => {
    const picker = (window as typeof window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    if (!picker) {
      setError(t('autoCreate.learning.portableUnsupported'));
      return;
    }
    setError(null);
    setPortableBusy('export');
    setPortableProgress('');
    const controller = new AbortController();
    portableAbortRef.current = controller;
    try {
      const directory = await picker();
      const manifest = await exportPortableLearningDataset({
        camp: role.camp,
        directory,
        signal: controller.signal,
        onProgress: (next) => {
          setPortableProgress(t('autoCreate.learning.exportProgress', {
            scanned: next.scanned,
            exported: next.exported,
            shards: next.shards
          }));
        }
      });
      setPortableProgress(t('autoCreate.learning.exportDone', {
        count: manifest.exportedTrainableCount,
        shards: manifest.shards.length
      }));
    } catch (portableError) {
      if ((portableError as DOMException)?.name !== 'AbortError') {
        setError(portableError instanceof Error ? portableError.message : String(portableError));
      }
    } finally {
      portableAbortRef.current = null;
      setPortableBusy(null);
    }
  };

  const importPortableModelFile = async (selected: File | null) => {
    if (!selected) return;
    setError(null);
    setPortableBusy('import');
    setPortableProgress('');
    try {
      const manifest = await importPortableRankerModel(
        JSON.parse(await selected.text()) as unknown,
        role.camp
      );
      await refreshLearningStatus();
      resetGeneratedOutput();
      setPortableProgress(t('autoCreate.learning.importDone', {
        revision: manifest.revision
      }));
    } catch (portableError) {
      setError(portableError instanceof Error ? portableError.message : String(portableError));
    } finally {
      setPortableBusy(null);
      if (portableModelInputRef.current) portableModelInputRef.current.value = '';
    }
  };

  const toggleSourceTitle = (title: string, useTitle: boolean) => {
    setExcludedSourceTitles((current) => {
      const next = new Set(current);
      if (useTitle) {
        next.delete(title);
      } else {
        next.add(title);
      }
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
    if (!resumeSnapshot) setResult(null);
    if (!resumeSnapshot) setMseHistory([]);
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
      const runSettings: AutoCreateTwroleSettings = {
        ...settings,
        rankerRolloutApproved: AUTO_CREATE_RANKER_ROLLOUT.approved || rankerLabEnabled
      };
      const next = await runAutoCreateTwroleInWorker({
        targetFile: file,
        decoOptions: filteredDecoOptions,
        settings: runSettings,
        learningScope: role.camp,
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
      setLearningPollRevision((current) => current + 1);
      onStatus(t('status.autoCreateConverted', { count: next.decorations.length }));
    } catch (err) {
      if (isAutoCreateTwroleStoppedError(err)) {
        setResult(err.result);
        setCheckpoint(err.checkpoint);
        recordProgress(err.checkpoint.progress);
        setInserted(false);
        setError(null);
        setLearningPollRevision((current) => current + 1);
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

  const numberInput = (labelKey: string, key: GuiNumericSettingKey, min: number) => (
    <label className="auto-create-field">
      <span>{t(labelKey)}</span>
      <input
        type="number"
        min={min}
        step={1}
        value={settings[key]}
        disabled={running}
        onChange={(event: ChangeEvent<HTMLInputElement>) => patchNumber(key, event.currentTarget.value)}
      />
    </label>
  );

  return (
    <>
        <ImageDropzone
          className="auto-create-dropzone"
          previewUrl={targetPreviewUrl}
          emptyLabel={t('autoCreate.drop')}
          actionLabel={file ? t('autoCreate.replace') : t('autoCreate.chooseImage')}
          disabled={running}
          onSelect={acceptFile}
        />

        <div className="extra-section">
          <div className="extra-section-title">{t('autoCreate.section.settings')}</div>
          <div className="extra-controls auto-create-controls python-gui-controls">
            {numberInput('autoCreate.iterations', 'tiles', 1)}
            {numberInput('autoCreate.budget', 'tileBudget', 0)}
            {numberInput('autoCreate.logEvery', 'logEvery', 1)}
          </div>
          <label className="auto-create-checkbox">
            <input
              type="checkbox"
              checked={savePreviewDuringProcess}
              disabled={running}
              onChange={(event: ChangeEvent<HTMLInputElement>) => patchSavePreview(event.currentTarget.checked)}
            />
            <span>{t('autoCreate.savePreview')}</span>
          </label>
        </div>

        <div className="extra-section">
          <div className="extra-section-title">{t('autoCreate.section.learning')}</div>
          <label className="auto-create-checkbox">
            <input
              type="checkbox"
              checked={learningStatus?.status.enabled ?? settings.rankerEnabled}
              disabled={running || learningBusy}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                void toggleLearning(event.currentTarget.checked);
              }}
            />
            <span>{t('autoCreate.learning.enabled')}</span>
          </label>
          {rankerLabAvailable && !AUTO_CREATE_RANKER_ROLLOUT.approved ? (
            <>
              <label className="auto-create-checkbox">
                <input
                  type="checkbox"
                  data-testid="auto-create-ranker-lab-toggle"
                  checked={rankerLabEnabled}
                  disabled={running || learningBusy || !rankerLabReady}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    toggleRankerLab(event.currentTarget.checked);
                  }}
                />
                <span>{t('autoCreate.learning.rankerLab')}</span>
              </label>
              {rankerLabEnabled ? (
                <div
                  className="extra-message warning"
                  data-testid="auto-create-ranker-lab-warning"
                >
                  {t('autoCreate.learning.rankerLabWarning', {
                    revision: learningStatus?.status.activeModelRevision ?? '-',
                    modes: learningStatus?.activeTrainedModes.join(', ') || '-'
                  })}
                </div>
              ) : null}
              <div className="auto-create-actions">
                <button
                  type="button"
                  className="primary-button subtle"
                  data-testid="auto-create-export-training"
                  disabled={running || learningBusy || portableBusy !== null}
                  onClick={() => { void exportLearningDataset(); }}
                >
                  {t('autoCreate.learning.exportPortable')}
                </button>
                <button
                  type="button"
                  className="primary-button subtle"
                  data-testid="auto-create-import-model"
                  disabled={running || learningBusy || portableBusy !== null}
                  onClick={() => portableModelInputRef.current?.click()}
                >
                  {t('autoCreate.learning.importPortable')}
                </button>
                {portableBusy === 'export' ? (
                  <button
                    type="button"
                    className="primary-button subtle"
                    onClick={() => portableAbortRef.current?.abort()}
                  >
                    {t('autoCreate.learning.cancelExport')}
                  </button>
                ) : null}
              </div>
              <input
                ref={portableModelInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                data-testid="auto-create-import-model-input"
                onChange={(event) => {
                  void importPortableModelFile(event.currentTarget.files?.[0] ?? null);
                }}
              />
              {portableProgress ? <div className="extra-message">{portableProgress}</div> : null}
            </>
          ) : null}
          <div className="extra-message">
            {t('autoCreate.learning.summary', {
              phase: result?.ranker?.status ?? learningStatus?.status.phase ?? 'collecting',
              add: learningStatus?.activeTrainedModes.includes('add') ? 'ready' : 'collecting',
              replace: learningStatus?.activeTrainedModes.includes('replace') ? 'ready' : 'collecting',
              revision: result?.ranker?.modelRevision
                ?? learningStatus?.status.activeModelRevision
                ?? '-'
            })}
          </div>
          {result?.ranker?.fallbackReason ? (
            <div className="extra-message warning">
              {t('autoCreate.learning.fallback', { reason: result.ranker.fallbackReason })}
            </div>
          ) : null}
          <button
            type="button"
            className="primary-button subtle"
            disabled={running || learningBusy}
            onClick={() => { void clearLearning(); }}
          >
            {learningBusy ? t('autoCreate.learning.working') : t('autoCreate.learning.clear')}
          </button>
        </div>

        {!workerAvailable ? (
          <div className="extra-message warning auto-create-browser-note">
            {t('autoCreate.error.workerUnavailable')}
          </div>
        ) : null}

        <AutoCreateSourceFilter
          sourceTitleItems={sourceTitleItems}
          visibleSourceTitleItems={visibleSourceTitleItems}
          excludedTitleSet={excludedTitleSet}
          filteredOptionCount={filteredDecoOptions.length}
          totalOptionCount={decoOptions.length}
          usedTitleCount={usedTitleCount}
          search={sourceTitleSearch}
          running={running}
          onSearchChange={setSourceTitleSearch}
          onUseAll={useAllSourceTitles}
          onUseVisible={useVisibleSourceTitles}
          onExcludeVisible={excludeVisibleSourceTitles}
          onToggleTitle={toggleSourceTitle}
        />

        <div className="extra-actions auto-create-actions">
          <button
            type="button"
            className="primary-button save"
            data-testid="auto-create-generate-button"
            disabled={!file || running || filteredDecoOptions.length === 0 || !workerAvailable}
            onClick={convert}
          >
            {running
              ? stopping
                ? t('autoCreate.stopping')
                : t('autoCreate.converting')
              : checkpoint
                ? t('autoCreate.resume')
                : t('autoCreate.convert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!running || stopping} onClick={stop}>
            {t('autoCreate.stop')}
          </button>
          <button type="button" className="primary-button" disabled={!result || inserted || running} onClick={insert}>
            {inserted ? t('autoCreate.inserted') : t('autoCreate.insert')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!result} onClick={downloadExportJson}>
            {t('autoCreate.downloadJson')}
          </button>
          <button type="button" className="primary-button subtle" disabled={!result} onClick={downloadTwrole}>
            {t('autoCreate.downloadTwrole')}
          </button>
        </div>

        <div className="extra-progress auto-create-progress">
          <div>
            <span>{stageLabel}</span>
            <strong>{progress ? `${formatNumber(progress.step)} / ${formatNumber(progress.total)}` : '0 / 0'}</strong>
          </div>
          <ProgressBar value={progressPercent} label={stageLabel} />
          {progress ? (
            <div className="auto-create-progress-grid">
              <span>MSE {formatNumber(progress.mse, 6)}</span>
              <span>{t('autoCreate.stat.layers')} {formatNumber(progress.active)}</span>
              <span>{t('autoCreate.accepted')} {formatNumber(progress.accepted)}</span>
              <span>{t('autoCreate.rejected')} {formatNumber(progress.rejected)}</span>
              <span>{t('autoCreate.pruned')} {formatNumber(progress.pruned)}</span>
              <span>{t('autoCreate.replaced')} {formatNumber(progress.replaced)}</span>
            </div>
          ) : null}
          <AutoCreateMseChart points={mseHistory} />
        </div>

        <div className="extra-stats auto-create-stats">
          <div>
            <span>{t('autoCreate.stat.layers')}</span>
            <strong>{formatNumber(result?.decorations.length ?? progress?.active ?? 0)}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.mse')}</span>
            <strong>{result ? formatNumber(result.mse, 6) : progress ? formatNumber(progress.mse, 6) : '-'}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.sources')}</span>
            <strong>{formatNumber(result?.sourceCount ?? filteredDecoOptions.length)}</strong>
          </div>
          <div>
            <span>{t('autoCreate.stat.size')}</span>
            <strong>{result ? `${result.targetWidth}×${result.targetHeight}` : '-'}</strong>
          </div>
        </div>

        {result ? (
          <div className="auto-create-preview">
            <div className="extra-section-title">{t('autoCreate.output')}</div>
            {workspacePreviewWarning ? (
              <div className="extra-message warning">{workspacePreviewWarning}</div>
            ) : (
              <img src={workspacePreviewUrl ?? result.previewDataUrl} alt="" />
            )}
          </div>
        ) : null}

        {result?.warnings.length ? (
          <div className="extra-message warning">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {error ? <div className="extra-message error">{error}</div> : null}
    </>
  );
}
