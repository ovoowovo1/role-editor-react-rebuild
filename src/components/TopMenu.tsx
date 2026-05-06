import { useRef } from 'react';
import { t } from '../i18n';
import { camps, genders } from '../mock/options';
import type { GenderCode } from '../types/role';

interface TopMenuProps {
  camp: string;
  gender: GenderCode;
  canUndo: boolean;
  canRedo: boolean;
  status: string;
  onImport(file: File): void;
  onMerge(file: File): void;
  onDownloadTwrole(): void;
  onExportJson(): void;
  onUndo(): void;
  onRedo(): void;
  onCampChange(camp: string): void;
  onGenderChange(gender: GenderCode): void;
  onOpenShortcuts(): void;
  onOpenInsertSettings(): void;
}

export function TopMenu({
  camp,
  gender,
  canUndo,
  canRedo,
  onImport,
  onMerge,
  onDownloadTwrole,
  onExportJson,
  onUndo,
  onRedo,
  onCampChange,
  onGenderChange,
  onOpenShortcuts,
  onOpenInsertSettings
}: TopMenuProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergeInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="menu-bar">
      <input
        ref={inputRef}
        type="file"
        accept=".twrole,.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={mergeInputRef}
        type="file"
        accept=".twrole,.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onMerge(file);
          event.currentTarget.value = '';
        }}
      />
      <div className="menu-actions">
        <button className="primary-button" type="button" onClick={() => inputRef.current?.click()}>
          {t('menu.import')}
        </button>
        <button className="primary-button" type="button" onClick={onDownloadTwrole}>
          {t('menu.download')}
        </button>
        <button className="primary-button subtle" type="button" onClick={onExportJson}>
          {t('menu.exportJson')}
        </button>
        <button className="primary-button subtle" type="button" onClick={onOpenInsertSettings}>
          {t('menu.insertSettings')}
        </button>
        <button className="primary-button subtle" type="button" onClick={() => mergeInputRef.current?.click()}>
          {t('menu.mergeFile')}
        </button>
      </div>

      <div className="icon-actions" aria-label={t('menu.history')}>
        <button type="button" title={t('menu.undo')} disabled={!canUndo} onClick={onUndo}>
          ↶
        </button>
        <button type="button" title={t('menu.redo')} disabled={!canRedo} onClick={onRedo}>
          ↷
        </button>
        <button type="button" className="menu-shortcuts" title={t('menu.shortcutsTitle')} onClick={onOpenShortcuts}>
          {t('menu.shortcuts')}
        </button>
      </div>

      <div className="menu-spacer" />

      <label className="select-label">
        {t('menu.camp')}
        <select value={camp} onChange={(event) => onCampChange(event.target.value)}>
          {camps.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="select-label">
        {t('menu.gender')}
        <select value={gender} onChange={(event) => onGenderChange(event.target.value as GenderCode)}>
          {genders.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>


    </div>
  );
}
