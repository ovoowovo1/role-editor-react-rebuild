import { lazy, memo, Suspense } from 'react';
import { t } from '../../i18n';
import { colorBlockToRole } from '../../mock/colorBlocks';
import { useColorBlockPresets } from '../../hooks/useColorBlockPresets';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import type { PartOption } from '../../types/role';
import { PART_TAB_I18N_KEYS } from '../../constants/tabs';
import { ChoiceGrid } from '../ChoiceGrid';
import { ColorBlockGrid } from '../ColorBlockGrid';
import type { useEditorShellUiState } from './useEditorShellUiState';

const ExtraPanel = lazy(() =>
  import('../extra/ExtraPanel').then(({ ExtraPanel }) => ({ default: ExtraPanel }))
);

type EditorApi = ReturnType<typeof useRoleEditor>;
type ShellState = ReturnType<typeof useEditorShellUiState>;

interface EditorSourcePanelProps {
  editor: EditorApi;
  shell: ShellState;
  selectedOptionId?: string;
  setStatus(message: string): void;
  onAddReferenceImage(file: File): Promise<void>;
}

export const EditorSourcePanel = memo(function EditorSourcePanel({
  editor,
  shell,
  selectedOptionId,
  setStatus,
  onAddReferenceImage
}: EditorSourcePanelProps) {
  if (shell.topBarMode === 'extra') {
    return (
      <Suspense fallback={(
        <section className="choice-list extra-panel" aria-label={t('extra.title')}>
          <p className="extra-section" role="status">{t('extra.loading')}</p>
        </section>
      )}>
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
          onAddReferenceImage={onAddReferenceImage}
        />
      </Suspense>
    );
  }

  if (shell.topBarMode === 'colorBlock') {
    return <EditorColorBlockPanel role={editor.role} onMerge={editor.mergeImportedRole} setStatus={setStatus} />;
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
});

function EditorColorBlockPanel({ role, onMerge, setStatus }: {
  role: EditorApi['role'];
  onMerge: EditorApi['mergeImportedRole'];
  setStatus(message: string): void;
}) {
  const { presets, loading, error } = useColorBlockPresets(role.camp, setStatus);
  return (
    <ColorBlockGrid
      presets={presets}
      loading={loading}
      error={error}
      onPick={(preset) => {
        onMerge(colorBlockToRole(preset, role));
        setStatus(t('status.addedColorBlock', { label: preset.label }));
      }}
    />
  );
}
