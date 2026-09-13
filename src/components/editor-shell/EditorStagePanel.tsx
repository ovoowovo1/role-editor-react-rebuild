import { Suspense, lazy } from 'react';
import { DEFAULT_POSITION_RANGE } from '../../constants/editor';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import { EditControls } from '../EditControls';
import type { useEditorShellUiState } from './useEditorShellUiState';
import type { useReferenceImageLayers } from '../../hooks/useReferenceImageLayers';

const CharacterStage = lazy(async () => import('../CharacterStage').then((module) => ({ default: module.CharacterStage })));

type EditorApi = ReturnType<typeof useRoleEditor>;
type ShellState = ReturnType<typeof useEditorShellUiState>;
type ReferenceState = ReturnType<typeof useReferenceImageLayers>;

interface EditorStagePanelProps {
  editor: EditorApi;
  shell: ShellState;
  reference: ReferenceState;
  onClearSelection(): void;
  onCommitReferenceImageDrag(id: string, dx: number, dy: number): void;
}

export function EditorStagePanel({ editor, shell, reference, onClearSelection, onCommitReferenceImageDrag }: EditorStagePanelProps) {
  return (
    <section className="edit-block">
      <Suspense fallback={<div className="stage-panel" />}>
        <CharacterStage
          role={editor.role}
          selectedIds={editor.selectedDecorationIds}
          selectedReferenceImageId={reference.selectedId}
          bodyAnimationLabel={shell.bodyAnimationLabel}
          bodyAnimationPlaying={shell.bodyAnimationPlaying}
          bodyAnimationRestartKey={shell.bodyAnimationRestartKey}
          stageScale={editor.stageScale}
          facingQuarterTurns={shell.facingQuarterTurns}
          onCommitDrag={editor.commitDrag}
          referenceImages={reference.images}
          layerOrder={reference.layerOrder}
          onCommitReferenceImageDrag={onCommitReferenceImageDrag}
          onClearSelection={onClearSelection}
          brushFillActive={shell.brushFillActive}
          brushFillBrushSize={shell.brushFillBrushSize}
          brushFillMask={shell.brushFillMask}
          headGlowAlwaysOn={shell.headGlowAlwaysOn}
          onBrushFillMaskChange={shell.setBrushFillMask}
        />
      </Suspense>
      <EditControls
        disabled={!editor.selectedDecorationIds.length}
        faceAlwaysEnabled
        bodyAnimationLabel={shell.bodyAnimationLabel}
        bodyAnimationPlaying={shell.bodyAnimationPlaying}
        playbackToolVisible={shell.playbackToolVisible}
        headGlowAlwaysOn={shell.headGlowAlwaysOn}
        facingQuarterTurns={shell.facingQuarterTurns}
        editValues={editor.editValues}
        referenceImage={reference.selectedImage}
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
        onCancelSelection={onClearSelection}
        onTransformChange={editor.updateSelectedTransform}
        onFlip={editor.flipSelected}
        onMirrorCopyHorizontal={editor.mirrorCopyHorizontalSelected}
        onMirrorCopyVertical={editor.mirrorCopyVerticalSelected}
        onCenterMirrorCopyHorizontal={editor.centerMirrorCopyHorizontalSelected}
        onCenterMirrorCopyVertical={editor.centerMirrorCopyVerticalSelected}
        onFaceRotate={shell.rotateFacing}
        onOpenWeaponAnimation={() => shell.setWeaponAnimationOpen(true)}
        onStartWeaponAnimation={() => shell.setBodyAnimationPlaying(true)}
        onStopWeaponAnimation={() => shell.setBodyAnimationPlaying(false)}
        onRestartWeaponAnimation={shell.restartBodyAnimation}
        onTogglePlaybackTool={shell.togglePlaybackToolVisible}
        onToggleHeadGlowAlwaysOn={shell.toggleHeadGlowAlwaysOn}
        onStageScaleChange={editor.setStageScale}
        onReferenceImageBeginTransform={reference.beginTransform}
        onReferenceImageCommitTransform={reference.commitTransform}
        onReferenceImageTransformChange={(patch, commit) => {
          if (!reference.selectedImage) return;
          reference.updateImage(reference.selectedImage.id, patch, commit);
        }}
      />
    </section>
  );
}
