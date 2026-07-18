import { describe, expect, it, vi } from 'vitest';
import { makeDecorationGroup, makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';

const mocks = vi.hoisted(() => ({
  renderFullRoleToDataUrl: vi.fn(async (_role: unknown, _options: Record<string, unknown>) => ({
    dataUrl: 'data:image/png;base64,workspace',
    width: 512,
    height: 384,
    alphaPixels: 1,
    nonTransparentBounds: null,
    warnings: [],
    missingTextureCount: 0
  }))
}));

vi.mock('../../lib/stage/fullRoleRenderer', () => ({
  renderFullRoleToDataUrl: mocks.renderFullRoleToDataUrl
}));

import {
  renderAutoCreateWorkspacePreview,
  shouldRenderAutoCreateWorkspacePreview,
  workspacePreviewRole,
  WorkspacePreviewRequestGate
} from './autoCreateWorkspacePreview';

describe('AutoCreate workspace preview', () => {
  it('renders only generated decorations at target resolution using inverse insert scale', async () => {
    const existing = makeDecorationLayer('existing');
    const generated = makeDecorationLayer('generated', { x: 18, y: -6 });
    const role = makeRoleDocument({
      decorations: [existing],
      groups: [makeDecorationGroup('existing-group', { itemIds: [existing.id] })]
    });

    await expect(renderAutoCreateWorkspacePreview({
      role,
      result: {
        decorations: [generated],
        targetWidth: 512,
        targetHeight: 384,
        insertScale: 0.5
      }
    })).resolves.toMatchObject({ dataUrl: 'data:image/png;base64,workspace' });

    expect(mocks.renderFullRoleToDataUrl).toHaveBeenCalledOnce();
    const [previewRole, options] = mocks.renderFullRoleToDataUrl.mock.calls[0];
    expect(previewRole).toMatchObject({ decorations: [generated], groups: [] });
    expect(options).toEqual({
      width: 512,
      height: 384,
      background: 'transparent',
      stageScale: 2,
      debug: {
        onlyDecorations: true,
        hideHeadLayer: true
      }
    });
    expect(role.decorations).toEqual([existing]);
    expect(role.groups).toHaveLength(1);
  });

  it('falls back to a neutral stage scale for malformed insert scale', async () => {
    await renderAutoCreateWorkspacePreview({
      role: makeRoleDocument(),
      result: {
        decorations: [],
        targetWidth: 64,
        targetHeight: 32,
        insertScale: 0
      }
    });

    const lastCall = mocks.renderFullRoleToDataUrl.mock.calls[mocks.renderFullRoleToDataUrl.mock.calls.length - 1];
    expect(lastCall?.[1]).toMatchObject({ stageScale: 1 });
  });

  it('isolates preview decorations and invalidates stale async requests', () => {
    const role = makeRoleDocument({
      decorations: [makeDecorationLayer('old')],
      groups: [makeDecorationGroup('old-group')]
    });
    const generated = makeDecorationLayer('new');
    const preview = workspacePreviewRole(role, [generated]);
    expect(preview.decorations).toEqual([generated]);
    expect(preview.groups).toEqual([]);
    expect(role.decorations[0].id).toBe('old');

    const gate = new WorkspacePreviewRequestGate();
    const first = gate.begin();
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
    gate.invalidate();
    expect(gate.isCurrent(second)).toBe(false);
  });

  it('renders canonical Pixi output only once after a run or resume becomes terminal', () => {
    const checkpointResult = {
      decorations: [makeDecorationLayer('checkpoint')],
      targetWidth: 64,
      targetHeight: 64,
      insertScale: 1
    };
    const finalResult = {
      ...checkpointResult,
      decorations: [makeDecorationLayer('final')]
    };
    const lifecycle = [
      { result: null, running: true },
      { result: checkpointResult, running: true },
      { result: checkpointResult, running: true },
      { result: finalResult, running: true },
      { result: finalResult, running: false }
    ];

    expect(lifecycle.filter(({ result, running }) => (
      shouldRenderAutoCreateWorkspacePreview(result, running)
    ))).toHaveLength(1);
    expect(shouldRenderAutoCreateWorkspacePreview(checkpointResult, true)).toBe(false);
    expect(shouldRenderAutoCreateWorkspacePreview(finalResult, false)).toBe(true);
  });
});
