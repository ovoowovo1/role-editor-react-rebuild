import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'renderer/serverCore.ts',
        'worker/src/http.ts',
        'src/components/auto-create/autoCreatePanelUtils.ts',
        'src/components/character-stage/stageInteractions.ts',
        'src/components/extra/extraPanelModels.ts',
        'src/components/layers/layerListDragHelpers.ts',
        'src/components/layers/layerListModels.ts',
        'src/lib/api/colorBlockApi.ts',
        'src/lib/conversion/brushFillToDeco.ts',
        'src/lib/conversion/imageToDeco.ts',
        'src/lib/editor/editorGroupMutations.ts',
        'src/lib/editor/editorHistoryCommands.ts',
        'src/lib/editor/editorInsertSettings.ts',
        'src/lib/editor/editorRoleCommands.ts',
        'src/lib/editor/editorRoleUtils.ts',
        'src/lib/editor/editorSelectionCommands.ts',
        'src/lib/editor/layerOrdering.ts',
        'src/lib/serialization/roleSerializationImport.ts',
        'src/lib/stage/characterStageHelpers.ts',
        'src/lib/stage/renderMetrics.ts',
        'src/mock/options.ts'
      ],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        statements: 70,
        branches: 70,
        lines: 70
      }
    }
  }
});
