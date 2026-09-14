import { useCallback, useEffect, useMemo } from 'react';
import { HEAD_LAYER_ID, HEAD_ROW_ID } from '../../constants/layers';
import { layerIdsForRole } from '../../lib/editor/layerOrdering';
import {
  createGroupTreeIndex,
  directParentGroup,
  groupForLayer,
  type GroupTreeIndex
} from '../../lib/editor/groupTree';
import type { LayerReorderOptions } from '../../lib/editor/editorLayerDrag';
import { referenceImageLayerToken } from '../../types/referenceImage';
import type { DecorationGroup } from '../../types/role';
import type { useRoleEditor } from '../../hooks/useRoleEditor';
import type { useReferenceImageLayers } from '../../hooks/useReferenceImageLayers';

type EditorApi = ReturnType<typeof useRoleEditor>;
type ReferenceImageApi = ReturnType<typeof useReferenceImageLayers>;
type CanonicalPlacement = 'before' | 'after';

export interface LayerStackReorderTarget {
  imageId: string;
  targetToken: string;
  placement: CanonicalPlacement;
}

export type LayerStackReorderAction =
  | { kind: 'role'; activeRowId: string; overRowId: string; options?: LayerReorderOptions }
  | ({ kind: 'reference-image' } & LayerStackReorderTarget);

export interface ResolveLayerStackReorderOptions {
  groups: DecorationGroup[];
  roleLayerOrder: readonly string[];
  tree?: GroupTreeIndex;
}

const REFERENCE_IMAGE_ROW_PREFIX = 'reference-image:';
const GROUP_ROW_PREFIX = 'group:';
const ITEM_ROW_PREFIX = 'item:';

export function referenceImageIdFromLayerRow(rowId: string): string | null {
  return rowId.startsWith(REFERENCE_IMAGE_ROW_PREFIX)
    ? rowId.slice(REFERENCE_IMAGE_ROW_PREFIX.length)
    : null;
}

function groupIdFromLayerRow(rowId: string): string | null {
  return rowId.startsWith(GROUP_ROW_PREFIX) ? rowId.slice(GROUP_ROW_PREFIX.length) : null;
}

function itemIdFromLayerRow(rowId: string): string | null {
  return rowId.startsWith(ITEM_ROW_PREFIX) ? rowId.slice(ITEM_ROW_PREFIX.length) : null;
}

function rootGroupFor(
  groups: DecorationGroup[],
  groupId: string
): DecorationGroup | undefined {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const visited = new Set<string>();
  let current = byId.get(groupId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = directParentGroup(groups, { type: 'group', id: current.id });
    if (!parent) return current;
    current = byId.get(parent.id);
  }
  return current;
}

export function resolveGroupBoundaryTarget(
  groupId: string,
  visualPlacement: 'before' | 'after',
  { groups, roleLayerOrder, tree = createGroupTreeIndex(groups) }: ResolveLayerStackReorderOptions
): { token: string; placement: CanonicalPlacement } | null {
  const root = rootGroupFor(groups, groupId);
  if (!root) return null;
  const members = new Set(tree.descendantLayerIds(root.id));
  const ordered = roleLayerOrder.filter((token) => members.has(token));
  if (!ordered.length) return null;

  // The layer list is top-to-bottom while roleLayerOrder is bottom-to-top.
  return visualPlacement === 'before'
    ? { token: ordered[ordered.length - 1], placement: 'after' }
    : { token: ordered[0], placement: 'before' };
}

/**
 * Resolves a reference-image drag target without mutating role or runtime data.
 * `placement` is received in visual-list direction and returned in canonical
 * bottom-to-top direction for reorderReferenceImageLayerOrder.
 */
export function resolveReferenceImageReorderTarget(
  activeRowId: string,
  overRowId: string,
  options: LayerReorderOptions | undefined,
  context: ResolveLayerStackReorderOptions
): LayerStackReorderTarget | null {
  const imageId = referenceImageIdFromLayerRow(activeRowId);
  if (!imageId) return null;

  const visualPlacement = options?.placement ?? 'before';
  let targetToken: string | null = null;
  let placement: CanonicalPlacement = visualPlacement === 'before' ? 'after' : 'before';
  const overImageId = referenceImageIdFromLayerRow(overRowId);
  if (overImageId) {
    targetToken = referenceImageLayerToken(overImageId);
  } else {
    const overGroupId = groupIdFromLayerRow(overRowId);
    if (overGroupId) {
      const boundary = resolveGroupBoundaryTarget(overGroupId, visualPlacement, context);
      targetToken = boundary?.token ?? null;
      placement = boundary?.placement ?? placement;
    } else if (overRowId === HEAD_ROW_ID) {
      targetToken = HEAD_LAYER_ID;
    } else {
      const overItemId = itemIdFromLayerRow(overRowId);
      if (!overItemId) return null;
      const group = groupForLayer(context.groups, overItemId);
      if (group) {
        const boundary = resolveGroupBoundaryTarget(group.id, visualPlacement, context);
        targetToken = boundary?.token ?? null;
        placement = boundary?.placement ?? placement;
      } else {
        targetToken = overItemId;
      }
    }
  }

  if (!targetToken || targetToken === referenceImageLayerToken(imageId)) return null;
  if (!context.roleLayerOrder.includes(targetToken) && !overImageId) return null;
  return { imageId, targetToken, placement };
}

/**
 * Resolves the route for a layer-list drag. Role rows remain delegated to the
 * existing role command, while reference-image rows are translated to a
 * canonical runtime stack operation. A role row cannot be dropped on an
 * image row because that would mix persistent and session-only ordering.
 */
export function resolveLayerStackReorderAction(
  activeRowId: string,
  overRowId: string,
  options: LayerReorderOptions | undefined,
  context: ResolveLayerStackReorderOptions
): LayerStackReorderAction | null {
  const activeImageId = referenceImageIdFromLayerRow(activeRowId);
  if (!activeImageId) {
    if (referenceImageIdFromLayerRow(overRowId)) return null;
    return { kind: 'role', activeRowId, overRowId, options };
  }

  const target = resolveReferenceImageReorderTarget(activeRowId, overRowId, options, context);
  return target ? { kind: 'reference-image', ...target } : null;
}

export interface UseLayerStackControllerOptions {
  editor: EditorApi;
  reference: ReferenceImageApi;
}

export function useLayerStackController({
  editor,
  reference
}: UseLayerStackControllerOptions) {
  const roleLayerOrder = useMemo(
    () => layerIdsForRole(editor.role).reverse(),
    [editor.role]
  );
  const groups = editor.groups;
  const groupTree = useMemo(() => createGroupTreeIndex(groups), [groups]);

  useEffect(() => {
    reference.syncRoleLayerOrder(roleLayerOrder);
  }, [reference.syncRoleLayerOrder, roleLayerOrder]);

  const reorderLayer = useCallback((
    activeRowId: string,
    overRowId: string,
    options?: LayerReorderOptions
  ) => {
    const action = resolveLayerStackReorderAction(
      activeRowId,
      overRowId,
      options,
      { groups, roleLayerOrder, tree: groupTree }
    );
    if (!action) return;
    if (action.kind === 'role') {
      // Role reordering intentionally ignores reference-image rows. This
      // keeps the existing role/group reorder command unaware of runtime data.
      editor.reorderDecorations(action.activeRowId, action.overRowId, action.options);
      return;
    }
    reference.reorderImage(action.imageId, action.targetToken, action.placement);
  }, [editor.reorderDecorations, groupTree, groups, reference.reorderImage, roleLayerOrder]);

  return { roleLayerOrder, reorderLayer };
}
