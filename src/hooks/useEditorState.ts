import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EDITOR_BASE_HISTORY_LIMIT,
  EDITOR_STAGE_MAX_SCALE,
  EDITOR_STAGE_MIN_SCALE,
  EDITOR_STAGE_SCALE_STEP
} from '../constants/editor';
import { createDefaultRole } from '../mock/options';
import type { PartTab, RoleDocument } from '../types/role';
import { clamp } from '../lib/math';
import { cloneRole, syncGroups, touch } from '../lib/editor/editorRoleUtils';
import {
  DEFAULT_INSERT_SETTINGS,
  sanitizeInsertDraftSettings,
  type InsertDraftSettings
} from '../lib/editor/editorInsertSettings';
import { useHistory } from './useHistory';
import {
  applyRoleHistoryPatch,
  createHistoryIdPool,
  makeBaseRoleHistoryEntry,
  type HistoryIdPool,
  type RoleHistoryBaseEntry
} from '../lib/editor/editorTransformHistory';

function sameRoleReference(a: RoleDocument, b: RoleDocument): boolean {
  return a === b;
}

export function useEditorState() {
  const roleHistoryIdPoolRef = useRef<HistoryIdPool>(createHistoryIdPool());
  const roleHistoryCodec = useMemo(
    () => ({
      create(previous: RoleDocument, next: RoleDocument): RoleHistoryBaseEntry | null {
        return makeBaseRoleHistoryEntry(previous, next, roleHistoryIdPoolRef.current);
      },
      apply(current: RoleDocument, entry: RoleHistoryBaseEntry, direction: 'undo' | 'redo'): RoleDocument {
        return applyRoleHistoryPatch(current, entry.patch, direction === 'undo' ? 'before' : 'after');
      }
    }),
    []
  );
  const history = useHistory<RoleDocument, RoleHistoryBaseEntry>(createDefaultRole(), {
    limit: EDITOR_BASE_HISTORY_LIMIT,
    // The patch codec performs the substantive change check. Avoid
    // serializing all decorations for every transient transform frame.
    isEqual: sameRoleReference,
    codec: roleHistoryCodec
  });
  const { present: role, setPresent: setRole } = history;
  const roleRef = useRef(role);
  const [selectedTab, setSelectedTab] = useState<PartTab>('deco');
  const [stageScale, setStageScaleState] = useState(EDITOR_STAGE_MIN_SCALE);
  const [insertDraftSettings, setInsertDraftSettingsState] = useState<InsertDraftSettings>(DEFAULT_INSERT_SETTINGS);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const updateRole = useCallback(
    (updater: (current: RoleDocument) => RoleDocument, commit = true) => {
      setRole((current) => syncGroups(touch(updater(cloneRole(current)))), commit ? 'history' : 'silent');
    },
    [setRole]
  );

  const setStageScale = useCallback((value: number) => {
    const steppedValue = Math.round(value / EDITOR_STAGE_SCALE_STEP) * EDITOR_STAGE_SCALE_STEP;
    setStageScaleState(clamp(steppedValue, EDITOR_STAGE_MIN_SCALE, EDITOR_STAGE_MAX_SCALE));
  }, []);

  const setInsertDraftSettings = useCallback((settings: InsertDraftSettings) => {
    setInsertDraftSettingsState(sanitizeInsertDraftSettings(settings));
  }, []);

  return {
    history,
    role,
    setRole,
    roleRef,
    selectedTab,
    setSelectedTab,
    stageScale,
    setStageScale,
    insertDraftSettings,
    setInsertDraftSettings,
    updateRole
  };
}
