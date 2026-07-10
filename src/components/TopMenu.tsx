import { t } from '../i18n';
import { camps, genders } from '../mock/options';
import type { GenderCode } from '../types/role';
import { FilePickerButton } from './ui/FilePickerButton';

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

const ROLE_FILE_ACCEPT = '.twrole,.json,application/json';

export function TopMenu({
  camp,
  gender,
  canUndo,
  canRedo,
  status,
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
  return (
    <header className="menu-bar">
      <div className="menu-command-area">
        <div className="menu-actions" role="group" aria-label={t('menu.fileActions')}>
          <FilePickerButton
            accept={ROLE_FILE_ACCEPT}
            buttonTestId="import-button"
            className="primary-button"
            inputTestId="import-file-input"
            onSelect={onImport}
          >
            {t('menu.import')}
          </FilePickerButton>
          <button className="primary-button" type="button" data-testid="download-twrole-button" onClick={onDownloadTwrole}>
            {t('menu.download')}
          </button>
          <button className="primary-button subtle" type="button" data-testid="export-json-button" onClick={onExportJson}>
            {t('menu.exportJson')}
          </button>
          <button className="primary-button subtle" type="button" onClick={onOpenInsertSettings}>
            {t('menu.insertSettings')}
          </button>
          <FilePickerButton
            accept={ROLE_FILE_ACCEPT}
            buttonTestId="merge-button"
            className="primary-button subtle"
            inputTestId="merge-file-input"
            onSelect={onMerge}
          >
            {t('menu.mergeFile')}
          </FilePickerButton>
        </div>

        <div className="icon-actions" role="group" aria-label={t('menu.history')}>
          <button type="button" title={t('menu.undo')} aria-label={t('menu.undo')} data-testid="undo-button" disabled={!canUndo} onClick={onUndo}>
            ↶
          </button>
          <button type="button" title={t('menu.redo')} aria-label={t('menu.redo')} data-testid="redo-button" disabled={!canRedo} onClick={onRedo}>
            ↷
          </button>
          <button type="button" className="menu-shortcuts" title={t('menu.shortcutsTitle')} onClick={onOpenShortcuts}>
            {t('menu.shortcuts')}
          </button>
        </div>
      </div>

      <div className="menu-context-area">
        <div className="status-pill" role="status" aria-live="polite" title={status}>
          <span className="status-indicator" aria-hidden="true" />
          <span>{status}</span>
        </div>

        <div className="menu-selects">
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
      </div>
    </header>
  );
}
