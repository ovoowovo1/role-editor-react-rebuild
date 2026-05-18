import type { DecorationLayer, RoleDocument, TransformValues } from '../../types/role';
import {
  ORIGINAL_DECO_MAX_RATIO,
  ORIGINAL_DECO_MAX_SCALE,
  ORIGINAL_DECO_MIN_RATIO,
  ORIGINAL_DECO_MIN_SCALE
} from '../../constants/editor';
import { clamp, clampToDisc, normalizeDegrees, round } from '../math';
import {
  applyGroupParentToItem,
  deriveFirstItemPosition,
  DECO_GROUP_IDENTITY,
  type DecoGroupParentTransform,
  type DecoGroupSnapshot
} from './decoGroupTransform';
import {
  clampDecoRatio,
  clampDecoScaleForLayer,
  decorationScaleBounds,
  getFirstSelected,
  positionRangeFromRole
} from './editorRoleUtils';

export interface ValueBounds {
  min: number;
  max: number;
}

export function makeDefaultGroupTransform(): DecoGroupParentTransform {
  return { ...DECO_GROUP_IDENTITY };
}

export function clampGroupParentPosition(
  parent: DecoGroupParentTransform,
  snapshot: DecoGroupSnapshot,
  range: number
): DecoGroupParentTransform {
  const disc = clampToDisc(snapshot.centroidX + parent.dx, snapshot.centroidY + parent.dy, range);
  return {
    ...parent,
    dx: disc.x - snapshot.centroidX,
    dy: disc.y - snapshot.centroidY
  };
}

export function groupScaleBoundsForSnapshot(snapshot: DecoGroupSnapshot | null): ValueBounds | null {
  if (!snapshot) return null;
  let min = Number.MIN_SAFE_INTEGER;
  let max = Number.MAX_SAFE_INTEGER;
  for (const item of Object.values(snapshot.items)) {
    const absX = Math.abs(item.scaleX);
    if (absX < 1e-4) continue;
    min = Math.max(min, ORIGINAL_DECO_MIN_SCALE / absX);
    max = Math.min(max, ORIGINAL_DECO_MAX_SCALE / absX);
  }
  if (!Number.isFinite(min) || min < ORIGINAL_DECO_MIN_SCALE) min = ORIGINAL_DECO_MIN_SCALE;
  if (!Number.isFinite(max) || max < min) max = Math.max(min, ORIGINAL_DECO_MAX_SCALE);
  return { min, max };
}

export function groupRatioBoundsForSnapshot(snapshot: DecoGroupSnapshot | null): ValueBounds | null {
  if (!snapshot) return null;
  let min = Number.MIN_SAFE_INTEGER;
  let max = Number.MAX_SAFE_INTEGER;
  for (const item of Object.values(snapshot.items)) {
    const ratio = Math.abs(item.scaleY / (item.scaleX || 1));
    if (ratio < 1e-4) continue;
    min = Math.max(min, ORIGINAL_DECO_MIN_RATIO / ratio);
    max = Math.min(max, ORIGINAL_DECO_MAX_RATIO / ratio);
  }
  if (!Number.isFinite(min) || min < ORIGINAL_DECO_MIN_RATIO) min = ORIGINAL_DECO_MIN_RATIO;
  if (!Number.isFinite(max) || max < min) max = Math.max(min, ORIGINAL_DECO_MAX_RATIO);
  return { min, max };
}

export function selectionScaleBounds(
  selectedDecorations: DecorationLayer[],
  groupBounds: ValueBounds | null
): ValueBounds {
  if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]);
  return groupBounds ?? { min: ORIGINAL_DECO_MIN_SCALE, max: ORIGINAL_DECO_MAX_SCALE };
}

export function selectionRatioBounds(
  selectedDecorations: DecorationLayer[],
  groupBounds: ValueBounds | null
): ValueBounds {
  if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]);
  return groupBounds ?? { min: ORIGINAL_DECO_MIN_RATIO, max: ORIGINAL_DECO_MAX_RATIO };
}

export function editValuesForGroupTransform(
  role: RoleDocument,
  selectedDecorationIds: string[],
  groupSnapshot: DecoGroupSnapshot | null,
  groupTransform: DecoGroupParentTransform
): TransformValues {
  const first = getFirstSelected(role, selectedDecorationIds);
  if (!first) return { rotate: 0, scale: 1, ratio: 1, posX: 0, posY: 0 };

  if (selectedDecorationIds.length > 1 && groupSnapshot) {
    return {
      rotate: round(groupTransform.rotationDeg, 3),
      scale: round(Math.abs(groupTransform.scaleX), 3),
      ratio: round(Math.abs(groupTransform.scaleY / (groupTransform.scaleX || 1)), 3),
      posX: round(first.x, 2),
      posY: round(first.y, 2)
    };
  }

  return {
    rotate: round(first.rotation, 3),
    scale: round(Math.abs(first.scaleX), 3),
    ratio: round(Math.abs(first.scaleY / (first.scaleX || 1)), 3),
    posX: round(first.x, 2),
    posY: round(first.y, 2)
  };
}

export function syncGroupTransformToActualFirstPosition(
  transform: DecoGroupParentTransform,
  snapshot: DecoGroupSnapshot,
  first: DecorationLayer
): DecoGroupParentTransform {
  const currentFirstPos = deriveFirstItemPosition(transform, snapshot);
  if (!currentFirstPos) return transform;
  const dx = first.x - currentFirstPos.x;
  const dy = first.y - currentFirstPos.y;
  if (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON) return transform;
  return {
    ...transform,
    dx: transform.dx + dx,
    dy: transform.dy + dy
  };
}

export function nextGroupTransformForPatch({
  currentTransform,
  snapshot,
  first,
  patch,
  scaleBounds,
  positionRange
}: {
  currentTransform: DecoGroupParentTransform;
  snapshot: DecoGroupSnapshot;
  first: DecorationLayer;
  patch: Partial<TransformValues>;
  scaleBounds: ValueBounds;
  positionRange: number;
}): DecoGroupParentTransform {
  let nextGroupTransform: DecoGroupParentTransform = { ...currentTransform };

  if (typeof patch.rotate === 'number') {
    nextGroupTransform.rotationDeg = normalizeDegrees(patch.rotate);
  }
  if (typeof patch.scale === 'number') {
    const signX = nextGroupTransform.scaleX < 0 ? -1 : 1;
    const ratio = Math.abs(nextGroupTransform.scaleY / (nextGroupTransform.scaleX || 1));
    const abs = clamp(Math.abs(patch.scale), scaleBounds.min, scaleBounds.max);
    nextGroupTransform.scaleX = signX * abs;
    nextGroupTransform.scaleY = abs * ratio;
  }
  if (typeof patch.ratio === 'number') {
    const magnitude = clampDecoRatio(patch.ratio);
    nextGroupTransform.scaleY = Math.abs(nextGroupTransform.scaleX) * magnitude;
  }
  if (typeof patch.posX === 'number') {
    nextGroupTransform.dx += patch.posX - first.x;
  }
  if (typeof patch.posY === 'number') {
    nextGroupTransform.dy += patch.posY - first.y;
  }

  const shouldClampPosition = typeof patch.posX === 'number' || typeof patch.posY === 'number';
  nextGroupTransform = shouldClampPosition
    ? clampGroupParentPosition(nextGroupTransform, snapshot, positionRange)
    : nextGroupTransform;

  const shouldPreserveFirstPosition =
    (typeof patch.rotate === 'number' || typeof patch.scale === 'number' || typeof patch.ratio === 'number') &&
    typeof patch.posX !== 'number' &&
    typeof patch.posY !== 'number';
  if (!shouldPreserveFirstPosition) return nextGroupTransform;

  const nextFirstPos = deriveFirstItemPosition(nextGroupTransform, snapshot);
  if (!nextFirstPos) return nextGroupTransform;
  return {
    ...nextGroupTransform,
    dx: nextGroupTransform.dx + first.x - nextFirstPos.x,
    dy: nextGroupTransform.dy + first.y - nextFirstPos.y
  };
}

export function nextGroupTransformForNudge(
  currentTransform: DecoGroupParentTransform,
  snapshot: DecoGroupSnapshot,
  dx: number,
  dy: number,
  positionRange: number
): DecoGroupParentTransform {
  return clampGroupParentPosition(
    {
      ...currentTransform,
      dx: currentTransform.dx + dx,
      dy: currentTransform.dy + dy
    },
    snapshot,
    positionRange
  );
}

export function nextGroupTransformForFlip(
  currentTransform: DecoGroupParentTransform,
  axis: 'horizontal' | 'vertical'
): DecoGroupParentTransform {
  return axis === 'horizontal'
    ? { ...currentTransform, scaleX: -currentTransform.scaleX }
    : { ...currentTransform, scaleY: -currentTransform.scaleY };
}

export function applyGroupTransformToSelectedRole(
  role: RoleDocument,
  selectedDecorationIds: string[],
  snapshot: DecoGroupSnapshot,
  parent: DecoGroupParentTransform
): RoleDocument {
  const selected = new Set(selectedDecorationIds);
  return {
    ...role,
    decorations: role.decorations.map((item) => {
      if (!selected.has(item.id)) return item;
      const derived = applyGroupParentToItem(parent, snapshot, item.id);
      if (!derived) return item;
      return {
        ...item,
        x: derived.x,
        y: derived.y,
        scaleX: derived.scaleX,
        scaleY: derived.scaleY,
        rotation: normalizeDegrees(derived.rotation)
      };
    })
  };
}

export function applySingleTransformPatchToSelectedRole(
  role: RoleDocument,
  selectedDecorationIds: string[],
  patch: Partial<TransformValues>
): RoleDocument {
  const first = getFirstSelected(role, selectedDecorationIds);
  if (!first) return role;

  const selected = new Set(selectedDecorationIds);
  const range = positionRangeFromRole(role);
  const deltaX = typeof patch.posX === 'number' ? patch.posX - first.x : 0;
  const deltaY = typeof patch.posY === 'number' ? patch.posY - first.y : 0;
  const shouldClampPosition = typeof patch.posX === 'number' || typeof patch.posY === 'number';

  return {
    ...role,
    decorations: role.decorations.map((item) => {
      if (!selected.has(item.id)) return item;
      const next = { ...item };
      if (typeof patch.rotate === 'number') next.rotation = normalizeDegrees(patch.rotate);
      if (typeof patch.scale === 'number') {
        const ratio = Math.abs(item.scaleY / (item.scaleX || 1));
        const signX = item.scaleX < 0 ? -1 : 1;
        const newScale = clampDecoScaleForLayer(patch.scale, item);
        next.scaleX = signX * newScale;
        next.scaleY = newScale * ratio;
      }
      if (typeof patch.ratio === 'number') {
        next.scaleY = Math.abs(item.scaleX) * clampDecoRatio(patch.ratio);
      }
      if (shouldClampPosition) {
        const disc = clampToDisc(item.x + deltaX, item.y + deltaY, range);
        next.x = disc.x;
        next.y = disc.y;
      }
      return next;
    })
  };
}

export function nudgeSelectedRole(
  role: RoleDocument,
  selectedDecorationIds: string[],
  dx: number,
  dy: number
): RoleDocument {
  const selected = new Set(selectedDecorationIds);
  const range = positionRangeFromRole(role);
  return {
    ...role,
    decorations: role.decorations.map((item) => {
      if (!selected.has(item.id)) return item;
      const disc = clampToDisc(item.x + dx, item.y + dy, range);
      return { ...item, x: disc.x, y: disc.y };
    })
  };
}

export function flipSelectedRole(
  role: RoleDocument,
  selectedDecorationIds: string[],
  axis: 'horizontal' | 'vertical'
): RoleDocument {
  const selected = new Set(selectedDecorationIds);
  return {
    ...role,
    decorations: role.decorations.map((item) => {
      if (!selected.has(item.id)) return item;
      return axis === 'horizontal' ? { ...item, scaleX: -item.scaleX } : { ...item, scaleY: -item.scaleY };
    })
  };
}
