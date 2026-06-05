import { useCallback, useEffect, useRef, useState } from 'react';
import { EDITOR_BASE_HISTORY_LIMIT, EDITOR_STAGE_MAX_SCALE, EDITOR_STAGE_MIN_SCALE } from '../constants/editor';
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

export function useEditorState() {
  const history = useHistory<RoleDocument>(createDefaultRole(), { limit: EDITOR_BASE_HISTORY_LIMIT });
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
    setStageScaleState(clamp(Math.round(value), EDITOR_STAGE_MIN_SCALE, EDITOR_STAGE_MAX_SCALE));
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
