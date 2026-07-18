import type { DecorationLayer, RoleDocument } from '../../types/role';

export interface AutoCreateWorkspacePreviewSource {
  decorations: DecorationLayer[];
  targetWidth: number;
  targetHeight: number;
  insertScale: number;
}

export interface AutoCreateWorkspacePreviewRequest {
  role: RoleDocument;
  result: AutoCreateWorkspacePreviewSource;
}

export interface AutoCreateWorkspacePreviewResult {
  dataUrl: string;
}

/** Internal Performance API entry names used to diagnose canonical preview cost. */
export const AUTO_CREATE_CANONICAL_PREVIEW_PERFORMANCE = {
  startPrefix: 'auto-create:canonical-preview:start:',
  endPrefix: 'auto-create:canonical-preview:end:',
  measure: 'auto-create:canonical-preview:render'
} as const;

export function shouldRenderAutoCreateWorkspacePreview(
  result: AutoCreateWorkspacePreviewSource | null,
  running: boolean
): result is AutoCreateWorkspacePreviewSource {
  return result !== null && !running;
}

export function workspacePreviewRole(
  role: RoleDocument,
  decorations: DecorationLayer[]
): RoleDocument {
  return {
    ...role,
    decorations: [...decorations],
    // Existing groups reference the editor's current decorations and must not
    // leak into this isolated preview document.
    groups: []
  };
}

export async function renderAutoCreateWorkspacePreview({
  role,
  result
}: AutoCreateWorkspacePreviewRequest): Promise<AutoCreateWorkspacePreviewResult> {
  const insertScale = Number.isFinite(result.insertScale) && result.insertScale > 0
    ? result.insertScale
    : 1;
  // Preserve the main-editor bundle boundary: the full Pixi/GAF renderer is
  // only needed after AutoCreate has produced an output.
  const { renderFullRoleToDataUrl } = await import('../../lib/stage/fullRoleRenderer');
  return renderFullRoleToDataUrl(workspacePreviewRole(role, result.decorations), {
    width: result.targetWidth,
    height: result.targetHeight,
    background: 'transparent',
    stageScale: 1 / insertScale,
    debug: {
      onlyDecorations: true,
      hideHeadLayer: true
    }
  });
}

/** Small monotonic guard shared by the React effect and unit tests. */
export class WorkspacePreviewRequestGate {
  private revision = 0;

  begin(): number {
    this.revision += 1;
    return this.revision;
  }

  invalidate(): void {
    this.revision += 1;
  }

  isCurrent(revision: number): boolean {
    return revision === this.revision;
  }
}
