import { HEAD_LAYER_ID } from '../../constants/layers';
import type { DecorationLayer, RoleDocument } from '../../types/role';
import { descendantLayerIdsForGroup } from './groupTree';
import { layerIdsForRole } from './layerOrdering';
import { roundPosition } from './editorTransformHistory';

export function selectedLayerIdsForGroup(role: RoleDocument, groupId: string): string[] {
  const group = role.groups?.find((item) => item.id === groupId);
  if (!group) return [];
  const groupIds = descendantLayerIdsForGroup(role.groups ?? [], group.id);
  return layerIdsForRole({ ...role, decorations: role.decorations.filter((deco) => groupIds.includes(deco.id)) });
}

function patchDecoration(current: RoleDocument, id: string, patch: Partial<DecorationLayer>): RoleDocument {
  return {
    ...current,
    decorations: current.decorations.map((item) => (item.id === id ? { ...item, ...patch } : item))
  };
}

export function patchDecorationForSelectionDrag(
  current: RoleDocument,
  id: string,
  patch: Partial<DecorationLayer>,
  selectedIds: string[]
): RoleDocument {
  const selectedDecoIds = selectedIds.filter((itemId) => itemId !== HEAD_LAYER_ID);
  const shouldMoveSelection =
    selectedDecoIds.length > 1 &&
    selectedDecoIds.includes(id) &&
    (typeof patch.x === 'number' || typeof patch.y === 'number');

  if (!shouldMoveSelection) return patchDecoration(current, id, patch);

  const dragged = current.decorations.find((deco) => deco.id === id);
  if (!dragged) return patchDecoration(current, id, patch);

  const dx = typeof patch.x === 'number' ? patch.x - dragged.x : 0;
  const dy = typeof patch.y === 'number' ? patch.y - dragged.y : 0;
  const hasDx = Math.abs(dx) > Number.EPSILON;
  const hasDy = Math.abs(dy) > Number.EPSILON;

  return {
    ...current,
    decorations: current.decorations.map((item) => {
      if (!selectedDecoIds.includes(item.id)) return item;
      if (item.id === id) return { ...item, ...patch };
      const nextPatch: Partial<DecorationLayer> = {};
      if (hasDx) nextPatch.x = roundPosition(item.x + dx);
      if (hasDy) nextPatch.y = roundPosition(item.y + dy);
      return { ...item, ...nextPatch };
    })
  };
}

