import { t } from '../../i18n';
import { colorBlockToRole } from '../../mock/colorBlocks';
import type { useColorBlockPresets } from '../../hooks/useColorBlockPresets';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import type { PartOption } from '../../types/role';
import { PART_TAB_I18N_KEYS } from '../../constants/tabs';
import { ChoiceGrid } from '../ChoiceGrid';
import { ColorBlockGrid } from '../ColorBlockGrid';
import { ExtraPanel } from '../extra/ExtraPanel';
import type { useEditorShellUiState } from './useEditorShellUiState';

type EditorApi = ReturnType<typeof useRoleEditor>;
type ShellState = ReturnType<typeof useEditorShellUiState>;
type ColorBlockPresetState = ReturnType<typeof useColorBlockPresets>;

interface EditorSourcePanelProps {
  editor: EditorApi;
  shell: ShellState;
  colorBlockPresets: ColorBlockPresetState;
  selectedOptionId?: string;
  setStatus(message: string): void;
}

export function EditorSourcePanel({
  editor,
  shell,
  colorBlockPresets,
  selectedOptionId,
  setStatus
}: EditorSourcePanelProps) {
  if (shell.topBarMode === 'extra') {
    return (
      <ExtraPanel
        decoOptions={editor.visibleOptionsByTab.deco}
        role={editor.role}
        insertDraftSettings={editor.insertDraftSettings}
        brushFillActive={shell.brushFillActive}
        brushFillBrushSize={shell.brushFillBrushSize}
        brushFillMask={shell.brushFillMask}
        onBrushFillActiveChange={shell.setBrushFillActive}
        onBrushFillBrushSizeChange={shell.setBrushFillBrushSize}
        onBrushFillClear={shell.clearBrushFillMask}
        onInsert={editor.insertDecorationBatch}
        onStatus={setStatus}
      />
    );
  }

  if (shell.topBarMode === 'colorBlock') {
    return (
      <ColorBlockGrid
        presets={colorBlockPresets.presets}
        loading={colorBlockPresets.loading}
        error={colorBlockPresets.error}
        onPick={(preset: Parameters<typeof colorBlockToRole>[0]) => {
          editor.mergeImportedRole(colorBlockToRole(preset, editor.role));
          setStatus(t('status.addedColorBlock', { label: preset.label }));
        }}
      />
    );
  }

  return (
    <ChoiceGrid
      tab={editor.selectedTab}
      options={editor.visibleOptionsByTab[editor.selectedTab]}
      selectedOptionId={selectedOptionId}
      onPick={(option: PartOption) => {
        editor.choosePart(editor.selectedTab, option);
        setStatus(
          editor.selectedTab === 'deco'
            ? t('status.addedDeco', { label: option.label })
            : t('status.changedPart', { tab: t(PART_TAB_I18N_KEYS[editor.selectedTab]), label: option.label })
        );
      }}
    />
  );
}
