import { useRef } from 'react';
import { camps, genders } from '../mock/options';
import type { GenderCode } from '../types/role';

interface TopMenuProps {
  camp: string;
  gender: GenderCode;
  canUndo: boolean;
  canRedo: boolean;
  status: string;
  onImport(file: File): void;
  onDownloadTwrole(): void;
  onExportJson(): void;
  onSaveMock(): void;
  onNewDesign(): void;
  onUndo(): void;
  onRedo(): void;
  onCampChange(camp: string): void;
  onGenderChange(gender: GenderCode): void;
  onOpenShortcuts(): void;
}

export function TopMenu({
  camp,
  gender,
  canUndo,
  canRedo,
  status,
  onImport,
  onDownloadTwrole,
  onExportJson,
  onSaveMock,
  onNewDesign,
  onUndo,
  onRedo,
  onCampChange,
  onGenderChange,
  onOpenShortcuts
}: TopMenuProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="menu-bar">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.twrole,application/json,application/octet-stream"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.currentTarget.value = '';
        }}
      />
      <div className="menu-actions">
        <button className="primary-button" type="button" onClick={() => inputRef.current?.click()}>
          Import
        </button>
        <button className="primary-button" type="button" onClick={onDownloadTwrole}>
          Download
        </button>
        <button className="primary-button subtle" type="button" onClick={onExportJson}>
          Export JSON
        </button>
        <button className="primary-button" type="button" onClick={onNewDesign}>
          New Design
        </button>
        <button className="primary-button save" type="button" onClick={onSaveMock}>
          Save
        </button>
      </div>

      <div className="icon-actions" aria-label="History controls">
        <button type="button" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}>
          ↶
        </button>
        <button type="button" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={onRedo}>
          ↷
        </button>
        <button type="button" className="menu-shortcuts" title="角色編輯器常用快捷鍵" onClick={onOpenShortcuts}>
          快捷鍵
        </button>
      </div>

      <div className="menu-spacer" />

      <label className="select-label">
        Camp
        <select value={camp} onChange={(event) => onCampChange(event.target.value)}>
          {camps.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="select-label">
        Gender
        <select value={gender} onChange={(event) => onGenderChange(event.target.value as GenderCode)}>
          {genders.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="status-pill" title={status || 'Ready'}>
        {status || 'Ready'}
      </div>
    </div>
  );
}
