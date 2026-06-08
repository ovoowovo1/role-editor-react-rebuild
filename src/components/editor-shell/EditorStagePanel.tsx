import { Suspense, lazy } from 'react';
import { DEFAULT_POSITION_RANGE } from '../../constants/editor';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import { EditControls } from '../EditControls';
import type { useEditorShellUiState } from './useEditorShellUiState';

const CharacterStage = lazy(async () => import('../CharacterStage').then((module) => ({ default: module.CharacterStage })));

type EditorApi = ReturnType<typeof useRoleEditor>;
type ShellState = ReturnType<typeof useEditorShellUiState>;

interface EditorStagePanelProps {
  editor: EditorApi;
  shell: ShellState;
}

export function EditorStagePanel({ editor, shell }: EditorStagePanelProps) {
  return (
    <section className="edit-block">
      <Suspense fallback={<div className="stage-panel" />}>
        <CharacterStage
          role={editor.role}
          selectedIds={editor.selectedDecorationIds}
          bodyAnimationLabel={shell.bodyAnimationLabel}
          bodyAnimationPlaying={shell.bodyAnimationPlaying}
          bodyAnimationRestartKey={shell.bodyAnimationRestartKey}
          stageScale={editor.stageScale}
          facingQuarterTurns={shell.facingQuarterTurns}
          onUpdateDecoration={editor.updateDecoration}
          onApplyDragDelta={(dx, dy) => editor.applyDragDeltaToSelected(dx, dy)}
          onCommitDragDelta={editor.commitDragDeltaToSelected}
          onBeginTransient={editor.beginTransient}
          onCommitTransient={editor.commitTransient}
          brushFillActive={shell.brushFillActive}
          brushFillBrushSize={shell.brushFillBrushSize}
          brushFillMask={shell.brushFillMask}
          onBrushFillMaskChange={shell.setBrushFillMask}
        />
      </Suspense>
      <EditControls
        disabled={!editor.selectedDecorationIds.length}
        faceAlwaysEnabled
        bodyAnimationLabel={shell.bodyAnimationLabel}
        bodyAnimationPlaying={shell.bodyAnimationPlaying}
        playbackToolVisible={shell.playbackToolVisible}
        editValues={editor.editValues}
        stageScale={editor.stageScale}
        positionRange={editor.role.positionRange ?? DEFAULT_POSITION_RANGE}
        stageMinScale={editor.stageMinScale}
        stageMaxScale={editor.stageMaxScale}
        selectionScaleMin={editor.selectionScaleMin}
        selectionScaleMax={editor.selectionScaleMax}
        selectionRatioMin={editor.selectionRatioMin}
        selectionRatioMax={editor.selectionRatioMax}
        onBeginTransient={editor.beginTransient}
        onCommitTransient={editor.commitTransient}
        onCancelSelection={editor.clearSelection}
        onTransformChange={editor.updateSelectedTransform}
        onFlip={editor.flipSelected}
        onMirrorCopyHorizontal={editor.mirrorCopyHorizontalSelected}
        onMirrorCopyVertical={editor.mirrorCopyVerticalSelected}
        onFaceRotate={shell.rotateFacing}
        onOpenWeaponAnimation={() => shell.setWeaponAnimationOpen(true)}
        onStartWeaponAnimation={() => shell.setBodyAnimationPlaying(true)}
        onStopWeaponAnimation={() => shell.setBodyAnimationPlaying(false)}
        onRestartWeaponAnimation={shell.restartBodyAnimation}
        onTogglePlaybackTool={shell.togglePlaybackToolVisible}
        onStageScaleChange={editor.setStageScale}
      />
    </section>
  );
}
