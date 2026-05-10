import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { DecorationLayer, RoleDocument, TransformValues } from '../types/role';
import { clamp, clampToDisc, normalizeDegrees, round } from '../lib/math';
import {
  applyGroupParentToItem,
  deriveFirstItemPosition,
  snapshotGroupSelection,
  snapshotKeyFromIds,
  type DecoGroupParentTransform,
  type DecoGroupSnapshot
} from '../lib/decoGroupTransform';
import {
  ORIGINAL_DECO_MAX_SCALE,
  ORIGINAL_DECO_MIN_SCALE,
  ORIGINAL_DECO_MAX_RATIO,
  ORIGINAL_DECO_MIN_RATIO,
  clampDecoRatio,
  clampDecoScaleForLayer,
  decorationScaleBounds,
  getFirstSelected,
  orderedSelectedDecorations,
  positionRangeFromRole
} from '../lib/editorRoleUtils';

type UpdateRole = (updater: (current: RoleDocument) => RoleDocument, commit?: boolean) => void;

const LARGE_SELECTION_SNAPSHOT_CAP = 80;

const makeDefaultGroupTransform = (): DecoGroupParentTransform => ({
  scaleX: 1,
  scaleY: 1,
  rotationDeg: 0,
  dx: 0,
  dy: 0
});

export function useEditorGroupTransform({
  role,
  roleRef,
  selectedDecorationIds,
  selectedDecorations,
  updateRole
}: {
  role: RoleDocument;
  roleRef: MutableRefObject<RoleDocument>;
  selectedDecorationIds: string[];
  selectedDecorations: DecorationLayer[];
  updateRole: UpdateRole;
}) {
  const [groupSnapshot, setGroupSnapshot] = useState<DecoGroupSnapshot | null>(null);
  const [groupTransform, setGroupTransform] = useState<DecoGroupParentTransform>(() => makeDefaultGroupTransform());
  const groupTransformRef = useRef<DecoGroupParentTransform>(groupTransform);

  const setCurrentGroupTransform = useCallback((next: DecoGroupParentTransform) => {
    groupTransformRef.current = next;
    setGroupTransform(next);
  }, []);

  const resetGroupTransform = useCallback(() => {
    setCurrentGroupTransform(makeDefaultGroupTransform());
  }, [setCurrentGroupTransform]);

  const selectionKey = useMemo(() => {
    if (selectedDecorationIds.length > LARGE_SELECTION_SNAPSHOT_CAP) return '';
    return snapshotKeyFromIds(selectedDecorationIds);
  }, [selectedDecorationIds]);
  useEffect(() => {
    if (selectedDecorationIds.length < 2) {
      setGroupSnapshot(null);
      resetGroupTransform();
      return;
    }
    if (selectedDecorationIds.length > LARGE_SELECTION_SNAPSHOT_CAP) {
      setGroupSnapshot(null);
      resetGroupTransform();
      return;
    }
    const currentRole = roleRef.current;
    const ordered = orderedSelectedDecorations(currentRole, selectedDecorationIds);
    const snapshot = snapshotGroupSelection(ordered);
    setGroupSnapshot(snapshot);
    resetGroupTransform();
  }, [selectionKey, resetGroupTransform]); // eslint-disable-line react-hooks/exhaustive-deps

  const editValues = useMemo<TransformValues>(() => {
    const first = getFirstSelected(role, selectedDecorationIds);
    if (!first) {
      return { rotate: 0, scale: 1, ratio: 1, posX: 0, posY: 0 };
    }
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
  }, [role, selectedDecorationIds, groupSnapshot, groupTransform]);

  const groupScaleBounds = useMemo(() => {
    if (!groupSnapshot) return null;
    let min = Number.MIN_SAFE_INTEGER;
    let max = Number.MAX_SAFE_INTEGER;
    for (const item of Object.values(groupSnapshot.items)) {
      const absX = Math.abs(item.scaleX);
      if (absX < 1e-4) continue;
      min = Math.max(min, ORIGINAL_DECO_MIN_SCALE / absX);
      max = Math.min(max, ORIGINAL_DECO_MAX_SCALE / absX);
    }
    if (!Number.isFinite(min) || min < ORIGINAL_DECO_MIN_SCALE) min = ORIGINAL_DECO_MIN_SCALE;
    if (!Number.isFinite(max) || max < min) max = Math.max(min, ORIGINAL_DECO_MAX_SCALE);
    return { min, max };
  }, [groupSnapshot]);


  const selectionScaleMin = useMemo(() => {
    if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]).min;
    return groupScaleBounds?.min ?? ORIGINAL_DECO_MIN_SCALE;
  }, [groupScaleBounds, selectedDecorations]);

  const selectionScaleMax = useMemo(() => {
    if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]).max;
    return groupScaleBounds?.max ?? ORIGINAL_DECO_MAX_SCALE;
  }, [groupScaleBounds, selectedDecorations]);

  const groupRatioBounds = useMemo(() => {
    if (!groupSnapshot) return null;
    let min = Number.MIN_SAFE_INTEGER;
    let max = Number.MAX_SAFE_INTEGER;
    for (const item of Object.values(groupSnapshot.items)) {
      const ratio = Math.abs(item.scaleY / (item.scaleX || 1));
      if (ratio < 1e-4) continue;
      min = Math.max(min, ORIGINAL_DECO_MIN_RATIO / ratio);
      max = Math.min(max, ORIGINAL_DECO_MAX_RATIO / ratio);
    }
    if (!Number.isFinite(min) || min < ORIGINAL_DECO_MIN_RATIO) min = ORIGINAL_DECO_MIN_RATIO;
    if (!Number.isFinite(max) || max < min) max = Math.max(min, ORIGINAL_DECO_MAX_RATIO);
    return { min, max };
  }, [groupSnapshot]);

  const selectionRatioMin = useMemo(() => {
    if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]).min;
    return groupRatioBounds?.min ?? ORIGINAL_DECO_MIN_RATIO;
  }, [groupRatioBounds, selectedDecorations]);

  const selectionRatioMax = useMemo(() => {
    if (selectedDecorations.length === 1) return decorationScaleBounds(selectedDecorations[0]).max;
    return groupRatioBounds?.max ?? ORIGINAL_DECO_MAX_RATIO;
  }, [groupRatioBounds, selectedDecorations]);
  

  const ensureGroupSnapshot = useCallback((): DecoGroupSnapshot | null => {
    if (groupSnapshot) return groupSnapshot;
    if (selectedDecorationIds.length < 2) return null;
    const currentRole = roleRef.current;
    const ordered = orderedSelectedDecorations(currentRole, selectedDecorationIds);
    const snapshot = snapshotGroupSelection(ordered);
    if (snapshot) {
      setGroupSnapshot(snapshot);
    }
    return snapshot;
  }, [groupSnapshot, selectedDecorationIds, roleRef]);

  const syncTransformToActualFirstPosition = useCallback((transform: DecoGroupParentTransform, snapshot: DecoGroupSnapshot, first: DecorationLayer): DecoGroupParentTransform => {
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
  }, []);

  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      const isMultiSelect = selectedDecorationIds.length > 1 && !!snapshot;

      if (isMultiSelect && snapshot) {
        const currentRole = roleRef.current;
        const first = getFirstSelected(currentRole, selectedDecorationIds);
        if (!first) return;

        const currentGroupTransform = syncTransformToActualFirstPosition(groupTransformRef.current, snapshot, first);
        const firstX = first.x;
        const firstY = first.y;
        const scaleMin = groupScaleBounds?.min ?? ORIGINAL_DECO_MIN_SCALE;
        const scaleMax = groupScaleBounds?.max ?? ORIGINAL_DECO_MAX_SCALE;

        const nextGroupTransform: DecoGroupParentTransform = { ...currentGroupTransform };
        if (typeof patch.rotate === 'number') {
          nextGroupTransform.rotationDeg = normalizeDegrees(patch.rotate);
        }
        if (typeof patch.scale === 'number') {
          const signX = nextGroupTransform.scaleX < 0 ? -1 : 1;
          const ratio = Math.abs(nextGroupTransform.scaleY / (nextGroupTransform.scaleX || 1));
          const abs = clamp(Math.abs(patch.scale), scaleMin, scaleMax);
          nextGroupTransform.scaleX = signX * abs;
          nextGroupTransform.scaleY = abs * ratio;
        }
        if (typeof patch.ratio === 'number') {
          const magnitude = clampDecoRatio(patch.ratio);
          nextGroupTransform.scaleY = Math.abs(nextGroupTransform.scaleX) * magnitude;
        }
        if (typeof patch.posX === 'number') {
          nextGroupTransform.dx += patch.posX - firstX;
        }
        if (typeof patch.posY === 'number') {
          nextGroupTransform.dy += patch.posY - firstY;
        }

        const shouldPreserveFirstPosition =
          (typeof patch.rotate === 'number' || typeof patch.scale === 'number' || typeof patch.ratio === 'number') &&
          typeof patch.posX !== 'number' &&
          typeof patch.posY !== 'number';
        if (shouldPreserveFirstPosition) {
          const nextFirstPos = deriveFirstItemPosition(nextGroupTransform, snapshot);
          if (nextFirstPos) {
            nextGroupTransform.dx += firstX - nextFirstPos.x;
            nextGroupTransform.dy += firstY - nextFirstPos.y;
          }
        }

        setCurrentGroupTransform(nextGroupTransform);

        updateRole((current) => {
          const selected = new Set(selectedDecorationIds);
          const range = positionRangeFromRole(current);
          current.decorations = current.decorations.map((item) => {
            if (!selected.has(item.id)) return item;
            const derived = applyGroupParentToItem(nextGroupTransform, snapshot, item.id);
            if (!derived) return item;
            return {
              ...item,
              x: clamp(derived.x, -range, range),
              y: clamp(derived.y, -range, range),
              scaleX: derived.scaleX,
              scaleY: derived.scaleY,
              rotation: normalizeDegrees(derived.rotation)
            };
          });
          return current;
        }, commit);
        return;
      }

      updateRole((current) => {
        const first = getFirstSelected(current, selectedDecorationIds);
        if (!first) return current;
        const selected = new Set(selectedDecorationIds);
        const range = positionRangeFromRole(current);
        const deltaX = typeof patch.posX === 'number' ? patch.posX - first.x : 0;
        const deltaY = typeof patch.posY === 'number' ? patch.posY - first.y : 0;
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          let next = { ...item };
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
          if (typeof patch.posX === 'number') next.x = clamp(item.x + deltaX, -range, range);
          if (typeof patch.posY === 'number') next.y = clamp(item.y + deltaY, -range, range);
          return next;
        });
        return current;
      }, commit);
    },
    [ensureGroupSnapshot, groupScaleBounds, roleRef, selectedDecorationIds, setCurrentGroupTransform, syncTransformToActualFirstPosition, updateRole]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const first = getFirstSelected(roleRef.current, selectedDecorationIds);
        const currentGroupTransform = first
          ? syncTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
          : groupTransformRef.current;
        const nextParent: DecoGroupParentTransform = {
          ...currentGroupTransform,
          dx: currentGroupTransform.dx + dx,
          dy: currentGroupTransform.dy + dy
        };
        const selected = new Set(selectedDecorationIds);
        updateRole((current) => {
          const range = positionRangeFromRole(current);
          current.decorations = current.decorations.map((item) => {
            if (!selected.has(item.id)) return item;
            const derived = applyGroupParentToItem(nextParent, snapshot, item.id);
            if (!derived) return item;
            const disc = clampToDisc(derived.x, derived.y, range);
            return {
              ...item,
              x: disc.x,
              y: disc.y,
              scaleX: derived.scaleX,
              scaleY: derived.scaleY,
              rotation: normalizeDegrees(derived.rotation)
            };
          });
          return current;
        }, commit);
        setCurrentGroupTransform(nextParent);
        return;
      }
      updateRole((current) => {
        const selected = new Set(selectedDecorationIds);
        const range = positionRangeFromRole(current);
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          const disc = clampToDisc(item.x + dx, item.y + dy, range);
          return { ...item, x: disc.x, y: disc.y };
        });
        return current;
      }, commit);
    },
    [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, syncTransformToActualFirstPosition, updateRole]
  );

  const rotateSelectedBy = useCallback(
    (degrees: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      const current = snapshot && selectedDecorationIds.length > 1
        ? groupTransformRef.current.rotationDeg
        : getFirstSelected(role, selectedDecorationIds)?.rotation ?? 0;
      updateSelectedTransform({ rotate: normalizeDegrees(current + degrees) }, commit);
    },
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
  );

  const scaleSelectedBy = useCallback(
    (amount: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const currentGroupTransform = groupTransformRef.current;
        const signX = currentGroupTransform.scaleX >= 0 ? 1 : -1;
        const target = Math.abs(currentGroupTransform.scaleX) + amount;
        updateSelectedTransform({ scale: target * signX }, commit);
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const signX = first.scaleX >= 0 ? 1 : -1;
      updateSelectedTransform({ scale: (Math.abs(first.scaleX) + amount) * signX }, commit);
    },
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
  );

  const ratioSelectedBy = useCallback(
    (amount: number, commit = true) => {
      const snapshot = ensureGroupSnapshot();
      if (snapshot && selectedDecorationIds.length > 1) {
        const currentGroupTransform = groupTransformRef.current;
        const ratio = currentGroupTransform.scaleY / (currentGroupTransform.scaleX || 1);
        updateSelectedTransform({ ratio: ratio + amount }, commit);
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const ratio = first.scaleY / (first.scaleX || 1);
      updateSelectedTransform({ ratio: ratio + amount }, commit);
    },
    [ensureGroupSnapshot, role, selectedDecorationIds, updateSelectedTransform]
  );

  const flipSelected = useCallback((commit = true) => {
    const snapshot = ensureGroupSnapshot();
    if (snapshot && selectedDecorationIds.length > 1) {
      const first = getFirstSelected(roleRef.current, selectedDecorationIds);
      const currentGroupTransform = first
        ? syncTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
        : groupTransformRef.current;
      const nextParent: DecoGroupParentTransform = {
        ...currentGroupTransform,
        scaleX: -currentGroupTransform.scaleX
      };
      const range = positionRangeFromRole(roleRef.current);
      const selected = new Set(selectedDecorationIds);
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          const derived = applyGroupParentToItem(nextParent, snapshot, item.id);
          if (!derived) return item;
          return {
            ...item,
            x: clamp(derived.x, -range, range),
            y: clamp(derived.y, -range, range),
            scaleX: derived.scaleX,
            scaleY: derived.scaleY,
            rotation: normalizeDegrees(derived.rotation)
          };
        });
        return current;
      }, commit);
      setCurrentGroupTransform(nextParent);
      return;
    }
    updateRole((current) => {
      const selected = new Set(selectedDecorationIds);
      current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, scaleX: -item.scaleX } : item));
      return current;
    }, commit);
  }, [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, syncTransformToActualFirstPosition, updateRole]);

  const flipSelectedVertical = useCallback((commit = true) => {
    const snapshot = ensureGroupSnapshot();
    if (snapshot && selectedDecorationIds.length > 1) {
      const first = getFirstSelected(roleRef.current, selectedDecorationIds);
      const currentGroupTransform = first
        ? syncTransformToActualFirstPosition(groupTransformRef.current, snapshot, first)
        : groupTransformRef.current;
      const nextParent: DecoGroupParentTransform = {
        ...currentGroupTransform,
        scaleY: -currentGroupTransform.scaleY
      };
      const range = positionRangeFromRole(roleRef.current);
      const selected = new Set(selectedDecorationIds);
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          const derived = applyGroupParentToItem(nextParent, snapshot, item.id);
          if (!derived) return item;
          return {
            ...item,
            x: clamp(derived.x, -range, range),
            y: clamp(derived.y, -range, range),
            scaleX: derived.scaleX,
            scaleY: derived.scaleY,
            rotation: normalizeDegrees(derived.rotation)
          };
        });
        return current;
      }, commit);
      setCurrentGroupTransform(nextParent);
      return;
    }
    updateRole((current) => {
      const selected = new Set(selectedDecorationIds);
      current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, scaleY: -item.scaleY } : item));
      return current;
    }, commit);
  }, [ensureGroupSnapshot, roleRef, selectedDecorationIds, setCurrentGroupTransform, syncTransformToActualFirstPosition, updateRole]);

  return {
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    selectionRatioMin,
    selectionRatioMax,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical
  };
}
