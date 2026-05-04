import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { camps, createDefaultRole, findOptionByCode, optionById, partOptions } from '../mock/options';
import type { BodyPartTab, DecorationGroup, DecorationLayer, EditorClipboardItem, GenderCode, PartOption, PartTab, RoleDocument, TransformValues } from '../types/role';
import { clamp, clampToDisc, createId, moveBlock, normalizeDegrees, round } from '../lib/math';
import { getPartFrame } from '../lib/twlibPartRuntime';
import {
  applyGroupParentToItem,
  deriveFirstItemPosition,
  snapshotGroupSelection,
  snapshotKeyFromIds,
  type DecoGroupParentTransform,
  type DecoGroupSnapshot
} from '../lib/decoGroupTransform';
import { useHistory } from './useHistory';

function cloneRole(role: RoleDocument): RoleDocument {
  return JSON.parse(JSON.stringify(role)) as RoleDocument;
}

function touch(role: RoleDocument): RoleDocument {
  return { ...role, updatedAt: new Date().toISOString() };
}

function orderedSelectedDecorations(role: RoleDocument, selectedIds: string[]): DecorationLayer[] {
  const selected = new Set(selectedIds);
  return role.decorations.filter((deco) => selected.has(deco.id));
}

function getFirstSelected(role: RoleDocument, selectedIds: string[]): DecorationLayer | undefined {
  const selected = new Set(selectedIds);
  return role.decorations.find((deco) => selected.has(deco.id));
}

const ORIGINAL_DECO_MIN_SCALE = 0.001;
const ORIGINAL_DECO_MAX_SCALE = 1;
const ORIGINAL_DECO_MIN_RATIO = 0.001;
const ORIGINAL_DECO_MAX_RATIO = 2;

const STAGE_MIN_SCALE = 1;
const STAGE_MAX_SCALE = 6;

function positionRangeFromRole(role: RoleDocument): number {
  const raw = role.positionRange;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 60;
}

function clampDecoRatio(value: number): number {
  return clamp(Math.abs(value), ORIGINAL_DECO_MIN_RATIO, ORIGINAL_DECO_MAX_RATIO);
}

/** Matches RoleDeco.HEAD_CODE / head deco scale range in the original editor. */
function isHeadDecoLayer(item: DecorationLayer): boolean {
  return item.code === 'head';
}

function decorationScaleBounds(item: DecorationLayer): { min: number; max: number } {
  if (isHeadDecoLayer(item)) return { min: 1, max: 2 };
  return { min: ORIGINAL_DECO_MIN_SCALE, max: ORIGINAL_DECO_MAX_SCALE };
}

function clampDecoScaleForLayer(value: number, item: DecorationLayer): number {
  const { min, max } = decorationScaleBounds(item);
  return clamp(Math.abs(value), min, max);
}

function getHeadLayerIndex(role: RoleDocument): number {
  return clamp(Math.round(role.headLayerIndex ?? role.decorations.length), 0, role.decorations.length);
}

function shiftHeadLayerForInsert(role: RoleDocument, insertIndex: number, count: number): void {
  const headIndex = getHeadLayerIndex(role);
  role.headLayerIndex = insertIndex <= headIndex ? headIndex + count : headIndex;
}

function shiftHeadLayerForDeletedIndexes(role: RoleDocument, oldHeadIndex: number, deletedIndexes: number[]): void {
  const removedAboveHead = deletedIndexes.filter((index) => index >= 0 && index < oldHeadIndex).length;
  role.headLayerIndex = clamp(oldHeadIndex - removedAboveHead, 0, role.decorations.length);
}

function syncGroups(role: RoleDocument): RoleDocument {
  const existingIds = new Set(role.decorations.map((item) => item.id));
  const claimedIds = new Set<string>();
  const groups = (role.groups ?? [])
    .map((group) => {
      const itemIds = group.itemIds.filter((id) => existingIds.has(id) && !claimedIds.has(id));
      itemIds.forEach((id) => claimedIds.add(id));
      return { ...group, itemIds } satisfies DecorationGroup;
    })
    .filter((group) => group.itemIds.length >= 2);
  return { ...role, headLayerIndex: getHeadLayerIndex(role), groups };
}

function makeGroupMap(groups: DecorationGroup[]): Map<string, DecorationGroup> {
  const map = new Map<string, DecorationGroup>();
  groups.forEach((group) => group.itemIds.forEach((id) => map.set(id, group)));
  return map;
}

function ungroupedSelectedIds(role: RoleDocument, selectedIds: string[]): string[] {
  const groupMap = makeGroupMap(role.groups ?? []);
  const selected = new Set(selectedIds);
  return role.decorations.filter((item) => selected.has(item.id) && !groupMap.has(item.id)).map((item) => item.id);
}

function insertAfterSelection(role: RoleDocument, selectedIds: string[]): number {
  const indexes = selectedIds
    .map((id) => role.decorations.findIndex((item) => item.id === id))
    .filter((index) => index >= 0);
  return indexes.length ? Math.max(...indexes) + 1 : 0;
}

type LayerDragTarget =
  | { kind: 'group'; id: string }
  | { kind: 'item'; id: string };

function parseLayerDragTarget(rawId: string): LayerDragTarget {
  if (rawId.startsWith('group:')) return { kind: 'group', id: rawId.slice('group:'.length) };
  if (rawId.startsWith('item:')) return { kind: 'item', id: rawId.slice('item:'.length) };
  return { kind: 'item', id: rawId };
}

function groupForItem(groups: DecorationGroup[], itemId: string): DecorationGroup | undefined {
  return groups.find((group) => group.itemIds.includes(itemId));
}

function orderedIds(role: RoleDocument, ids: string[]): string[] {
  const wanted = new Set(ids);
  return role.decorations.filter((item) => wanted.has(item.id)).map((item) => item.id);
}

function indexesForIds(role: RoleDocument, ids: string[]): number[] {
  const wanted = new Set(ids);
  return role.decorations
    .map((item, index) => (wanted.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
}

function moveLayerBlock(current: RoleDocument, movingIds: string[], overIds: string[]): void {
  const movingSet = new Set(movingIds);
  const moving = current.decorations.filter((item) => movingSet.has(item.id));
  if (!moving.length) return;

  const targetIndexes = indexesForIds(current, overIds).filter((index) => !movingSet.has(current.decorations[index]?.id));
  if (!targetIndexes.length) return;

  const sourceIndexes = indexesForIds(current, movingIds);
  const sourceStart = Math.min(...sourceIndexes);
  const targetStart = Math.min(...targetIndexes);
  const targetEnd = Math.max(...targetIndexes);

  const remaining = current.decorations.filter((item) => !movingSet.has(item.id));
  const remainingTargetIds = new Set(overIds.filter((id) => !movingSet.has(id)));
  const remainingTargetIndexes = remaining
    .map((item, index) => (remainingTargetIds.has(item.id) ? index : -1))
    .filter((index) => index >= 0);
  if (!remainingTargetIndexes.length) return;

  const targetIndex = sourceStart < targetStart
    ? Math.max(...remainingTargetIndexes) + 1
    : Math.min(...remainingTargetIndexes);
  current.decorations = moveBlock(current.decorations, moving, targetIndex);
}

function makeDecoration(option: PartOption, index: number): DecorationLayer {
  const spread = 14;
  return {
    id: createId('deco'),
    code: option.code,
    assetId: option.id,
    name: option.label,
    x: round(((index % 5) - 2) * spread, 2),
    y: round(-50 + Math.floor(index / 5) * 8, 2),
    // The original editor adds new Deco at scale 0.5 after creating it.
    scaleX: 0.5,
    scaleY: 0.5,
    rotation: 0,
    visible: true,
    opacity: 1
  };
}

export function useRoleEditor() {
  const history = useHistory<RoleDocument>(createDefaultRole(), { limit: 200 });
  const { present: role, setPresent: setRole } = history;
  const [selectedTab, setSelectedTab] = useState<PartTab>('deco');
  const [selectedDecorationIds, setSelectedDecorationIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<EditorClipboardItem[]>([]);
  const [stageScale, setStageScaleState] = useState(STAGE_MIN_SCALE);

  const setStageScale = useCallback((value: number) => {
    setStageScaleState(clamp(Math.round(value), STAGE_MIN_SCALE, STAGE_MAX_SCALE));
  }, []);
  const pasteCountRef = useRef(0);

  // Group-select parent container state. Mirrors the old DecoController: while
  // more than one Deco is selected, Scale/Ratio/Rotate manipulate this parent
  // and every child is derived via matrix composition from its snapshot.
  const [groupSnapshot, setGroupSnapshot] = useState<DecoGroupSnapshot | null>(null);
  const [groupTransform, setGroupTransform] = useState<DecoGroupParentTransform>({
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    dx: 0,
    dy: 0
  });
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    const existing = new Set(role.decorations.map((item) => item.id));
    setSelectedDecorationIds((ids) => ids.filter((id) => existing.has(id)));
  }, [role.decorations]);

  const selectedDecorations = useMemo(() => orderedSelectedDecorations(role, selectedDecorationIds), [role, selectedDecorationIds]);
  const groupMap = useMemo(() => makeGroupMap(role.groups ?? []), [role.groups]);
  const canGroupSelected = useMemo(
    () => ungroupedSelectedIds(role, selectedDecorationIds).length >= 2,
    [role, selectedDecorationIds]
  );

  // Rebuild the group snapshot whenever the selection identity changes. We
  // key off the ordered id join so mutations to deco transforms do not reset
  // the parent back to identity mid-edit. Using `useMemo` keeps the string
  // identity stable across renders until the selection actually changes.
  const selectionKey = useMemo(() => snapshotKeyFromIds(selectedDecorationIds), [selectedDecorationIds]);
  useEffect(() => {
    const currentRole = roleRef.current;
    const ordered = orderedSelectedDecorations(currentRole, selectedDecorationIds);
    const snapshot = snapshotGroupSelection(ordered);
    setGroupSnapshot(snapshot);
    setGroupTransform({ scaleX: 1, scaleY: 1, rotationDeg: 0, dx: 0, dy: 0 });
  }, [selectionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const editValues = useMemo<TransformValues>(() => {
    const first = getFirstSelected(role, selectedDecorationIds);
    if (!first) {
      return { rotate: 0, scale: 1, ratio: 1, posX: 0, posY: 0 };
    }
    if (selectedDecorationIds.length > 1 && groupSnapshot) {
      // Mirror DecoController.refreshEditValues: parent transform drives
      // Rotate/Scale/Ratio; Pos X/Y show the FIRST deco's current clip xy.
      const firstPos = deriveFirstItemPosition(groupTransform, groupSnapshot);
      return {
        rotate: round(groupTransform.rotationDeg, 3),
        scale: round(Math.abs(groupTransform.scaleX), 3),
        ratio: round(Math.abs(groupTransform.scaleY / (groupTransform.scaleX || 1)), 3),
        posX: round(firstPos?.x ?? first.x, 2),
        posY: round(firstPos?.y ?? first.y, 2)
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
    // Mirrors DecoController._getMin/_getMaxScale: the group parent's scaleX
    // max is the minimum of (deco.maxScale / abs(deco.scaleX)), so scaling up
    // never overshoots any individual deco's clamp. Use the SNAPSHOT scales,
    // not the current scales, because sliders read parent state and then
    // recompose onto the snapshot.
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

  const updateRole = useCallback(
    (updater: (current: RoleDocument) => RoleDocument, commit = true) => {
      setRole((current) => syncGroups(touch(updater(cloneRole(current)))), commit ? 'history' : 'silent');
    },
    [setRole]
  );

  const choosePart = useCallback(
    (tab: PartTab, option: PartOption) => {
      if (tab === 'deco') {
        updateRole((current) => {
          const deco = makeDecoration(option, current.decorations.length);
          shiftHeadLayerForInsert(current, 0, 1);
          current.decorations = [deco, ...current.decorations];
          window.setTimeout(() => setSelectedDecorationIds([deco.id]), 0);
          return current;
        });
        return;
      }
      updateRole((current) => {
        const bodyTab = tab as BodyPartTab;
        current.parts[bodyTab] = option.id;
        current.partFrames = { ...current.partFrames, [bodyTab]: getPartFrame(option) ?? current.partFrames?.[bodyTab] ?? 1 };
        current.partScales = { ...current.partScales, [bodyTab]: current.partScales?.[bodyTab] ?? 1 };
        return current;
      });
    },
    [updateRole]
  );

  const selectDecoration = useCallback((id: string, additive = false) => {
    setSelectedDecorationIds((ids) => {
      if (additive) {
        return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
      }
      return ids.length === 1 && ids[0] === id ? [] : [id];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedDecorationIds([]), []);

  const selectAllDecorations = useCallback(() => {
    setSelectedDecorationIds(role.decorations.map((item) => item.id));
  }, [role.decorations]);

  const updateDecoration = useCallback(
    (id: string, patch: Partial<DecorationLayer>, commit = true) => {
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, ...patch } : item));
        return current;
      }, commit);
    },
    [updateRole]
  );

  const updateSelectedTransform = useCallback(
    (patch: Partial<TransformValues>, commit = true) => {
      const isMultiSelect = selectedDecorationIds.length > 1 && !!groupSnapshot;
      let nextGroupTransform: DecoGroupParentTransform | null = null;

      updateRole((current) => {
        const first = getFirstSelected(current, selectedDecorationIds);
        if (!first) return current;
        const selected = new Set(selectedDecorationIds);
        const range = positionRangeFromRole(current);

        if (isMultiSelect && groupSnapshot) {
          // Match DecoController.onPositionInputChange's multi-select flow:
          // determine delta from the first deco's CURRENT xy (which is what
          // the slider displays for groups) and move the parent container.
          const currentFirstPos = deriveFirstItemPosition(groupTransform, groupSnapshot);
          const firstX = currentFirstPos?.x ?? first.x;
          const firstY = currentFirstPos?.y ?? first.y;
          const scaleMin = groupScaleBounds?.min ?? ORIGINAL_DECO_MIN_SCALE;
          const scaleMax = groupScaleBounds?.max ?? ORIGINAL_DECO_MAX_SCALE;

          const next: DecoGroupParentTransform = { ...groupTransform };
          if (typeof patch.rotate === 'number') {
            next.rotationDeg = normalizeDegrees(patch.rotate);
          }
          if (typeof patch.scale === 'number') {
            const signX = next.scaleX < 0 ? -1 : 1;
            const ratio = Math.abs(next.scaleY / (next.scaleX || 1));
            const abs = clamp(Math.abs(patch.scale), scaleMin, scaleMax);
            next.scaleX = signX * abs;
            next.scaleY = abs * ratio;
          }
          if (typeof patch.ratio === 'number') {
            const magnitude = clampDecoRatio(patch.ratio);
            next.scaleY = Math.abs(next.scaleX) * magnitude;
          }
          if (typeof patch.posX === 'number') {
            next.dx += patch.posX - firstX;
          }
          if (typeof patch.posY === 'number') {
            next.dy += patch.posY - firstY;
          }
          nextGroupTransform = next;

          current.decorations = current.decorations.map((item) => {
            if (!selected.has(item.id)) return item;
            const derived = applyGroupParentToItem(next, groupSnapshot, item.id);
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
        }

        const deltaX = typeof patch.posX === 'number' ? patch.posX - first.x : 0;
        const deltaY = typeof patch.posY === 'number' ? patch.posY - first.y : 0;
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          let next = { ...item };
          if (typeof patch.rotate === 'number') next.rotation = normalizeDegrees(patch.rotate);
          // Slider paths match original onInputBoxChange: scaleY stays positive (|scaleY/scaleX| preserved).
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

      if (nextGroupTransform) setGroupTransform(nextGroupTransform);
    },
    [groupSnapshot, groupTransform, selectedDecorationIds, updateRole]
  );

  const nudgeSelected = useCallback(
    (dx: number, dy: number, commit = true) => {
      if (groupSnapshot && selectedDecorationIds.length > 1) {
        // Old DecoController.move translates the group parent, which moves
        // every child uniformly. Funnel through the same snapshot-driven
        // matrix path used by the Pos X/Y slider so the parent state stays
        // consistent for subsequent Scale/Ratio/Rotate slider edits.
        const nextParent: DecoGroupParentTransform = {
          ...groupTransform,
          dx: groupTransform.dx + dx,
          dy: groupTransform.dy + dy
        };
        const selected = new Set(selectedDecorationIds);
        updateRole((current) => {
          const range = positionRangeFromRole(current);
          current.decorations = current.decorations.map((item) => {
            if (!selected.has(item.id)) return item;
            const derived = applyGroupParentToItem(nextParent, groupSnapshot, item.id);
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
        setGroupTransform(nextParent);
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
    [groupSnapshot, groupTransform, selectedDecorationIds, updateRole]
  );

  const rotateSelectedBy = useCallback(
    (degrees: number) => {
      // C / V keys: old RoleEditor calls decoController.setRotationDeg(getRotationDeg() + STEP).
      // That parent rotation is identity at selection time, so stepping the
      // group parent is the correct mirror; for single-select the parent is
      // just the lone clip so the same path works.
      const current = groupSnapshot && selectedDecorationIds.length > 1
        ? groupTransform.rotationDeg
        : getFirstSelected(role, selectedDecorationIds)?.rotation ?? 0;
      updateSelectedTransform({ rotate: normalizeDegrees(current + degrees) });
    },
    [groupSnapshot, groupTransform, role, selectedDecorationIds, updateSelectedTransform]
  );

  /** Z / X: preserve signed scaleY/scaleX ratio like original setScale(a*t, a*e). */
  const scaleSelectedBy = useCallback(
    (amount: number) => {
      if (groupSnapshot && selectedDecorationIds.length > 1) {
        const signX = groupTransform.scaleX >= 0 ? 1 : -1;
        const target = Math.abs(groupTransform.scaleX) + amount;
        updateSelectedTransform({ scale: target * signX });
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const signX = first.scaleX >= 0 ? 1 : -1;
      updateSelectedTransform({ scale: (Math.abs(first.scaleX) + amount) * signX });
    },
    [groupSnapshot, groupTransform, role, selectedDecorationIds, updateSelectedTransform]
  );

  /** Shift+Z / Shift+X: adjust signed e = scaleY/scaleX, clamp |e|, then scaleY = |scaleX| * e. */
  const ratioSelectedBy = useCallback(
    (amount: number) => {
      if (groupSnapshot && selectedDecorationIds.length > 1) {
        const ratio = groupTransform.scaleY / (groupTransform.scaleX || 1);
        updateSelectedTransform({ ratio: ratio + amount });
        return;
      }
      const first = getFirstSelected(role, selectedDecorationIds);
      if (!first) return;
      const ratio = first.scaleY / (first.scaleX || 1);
      updateSelectedTransform({ ratio: ratio + amount });
    },
    [groupSnapshot, groupTransform, role, selectedDecorationIds, updateSelectedTransform]
  );

  const flipSelected = useCallback(() => {
    if (groupSnapshot && selectedDecorationIds.length > 1) {
      // Old flipSelectedDeco flips the group container via
      // setScale(-container.scaleX, container.scaleY), which mirrors the
      // group horizontally around its centroid. Flip the parent scaleX sign
      // directly and recompute every child via matrix composition.
      const nextParent: DecoGroupParentTransform = {
        ...groupTransform,
        scaleX: -groupTransform.scaleX
      };
      const range = positionRangeFromRole(roleRef.current);
      const selected = new Set(selectedDecorationIds);
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          const derived = applyGroupParentToItem(nextParent, groupSnapshot, item.id);
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
      });
      setGroupTransform(nextParent);
      return;
    }
    updateRole((current) => {
      const selected = new Set(selectedDecorationIds);
      current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, scaleX: -item.scaleX } : item));
      return current;
    });
  }, [groupSnapshot, groupTransform, selectedDecorationIds, updateRole]);

  /** Vertical mirror: negate scaleY (single) or group parent scaleY (multi). */
  const flipSelectedVertical = useCallback(() => {
    if (groupSnapshot && selectedDecorationIds.length > 1) {
      const nextParent: DecoGroupParentTransform = {
        ...groupTransform,
        scaleY: -groupTransform.scaleY
      };
      const range = positionRangeFromRole(roleRef.current);
      const selected = new Set(selectedDecorationIds);
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => {
          if (!selected.has(item.id)) return item;
          const derived = applyGroupParentToItem(nextParent, groupSnapshot, item.id);
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
      });
      setGroupTransform(nextParent);
      return;
    }
    updateRole((current) => {
      const selected = new Set(selectedDecorationIds);
      current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, scaleY: -item.scaleY } : item));
      return current;
    });
  }, [groupSnapshot, groupTransform, selectedDecorationIds, updateRole]);

  const setSelectedVisible = useCallback(
    (visible: boolean) => {
      updateRole((current) => {
        const selected = new Set(selectedDecorationIds);
        current.decorations = current.decorations.map((item) => (selected.has(item.id) ? { ...item, visible } : item));
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  const toggleDecorationVisibility = useCallback(
    (id: string) => {
      updateRole((current) => {
        current.decorations = current.decorations.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
        return current;
      });
    },
    [updateRole]
  );

  const deleteDecoration = useCallback(
    (id: string) => {
      updateRole((current) => {
        const oldHeadIndex = getHeadLayerIndex(current);
        const deletedIndex = current.decorations.findIndex((item) => item.id === id);
        current.decorations = current.decorations.filter((item) => item.id !== id);
        shiftHeadLayerForDeletedIndexes(current, oldHeadIndex, [deletedIndex]);
        return current;
      });
      setSelectedDecorationIds((ids) => ids.filter((item) => item !== id));
    },
    [updateRole]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      const selected = new Set(selectedDecorationIds);
      const oldHeadIndex = getHeadLayerIndex(current);
      const deletedIndexes = current.decorations
        .map((item, index) => (selected.has(item.id) ? index : -1))
        .filter((index) => index >= 0);
      current.decorations = current.decorations.filter((item) => !selected.has(item.id));
      shiftHeadLayerForDeletedIndexes(current, oldHeadIndex, deletedIndexes);
      return current;
    });
    setSelectedDecorationIds([]);
  }, [selectedDecorationIds, updateRole]);

  const copySelected = useCallback(() => {
    const copied = selectedDecorations.map(({ id: _id, ...rest }) => rest);
    setClipboard(copied);
    pasteCountRef.current = 0;
  }, [selectedDecorations]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard.length) return;
    pasteCountRef.current += 1;
    const offset = pasteCountRef.current * 8;
    updateRole((current) => {
      const insertIndex = insertAfterSelection(current, selectedDecorationIds);
      const pasted = clipboard.map((item) => ({ ...item, id: createId('deco'), x: item.x + offset, y: item.y + offset }));
      shiftHeadLayerForInsert(current, insertIndex, pasted.length);
      current.decorations = [...current.decorations.slice(0, insertIndex), ...pasted, ...current.decorations.slice(insertIndex)];
      window.setTimeout(() => setSelectedDecorationIds(pasted.map((item) => item.id)), 0);
      return current;
    });
  }, [clipboard, selectedDecorationIds, updateRole]);

  const mirrorCopyHorizontalSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      const selected = current.decorations.filter((item) => selectedDecorationIds.includes(item.id));
      if (!selected.length) return current;
      const insertIndex = insertAfterSelection(current, selectedDecorationIds);
      const mirrored = selected.map((item) => ({
        ...item,
        id: createId('deco'),
        x: -item.x,
        scaleX: -item.scaleX
      }));
      shiftHeadLayerForInsert(current, insertIndex, mirrored.length);
      current.decorations = [...current.decorations.slice(0, insertIndex), ...mirrored, ...current.decorations.slice(insertIndex)];
      window.setTimeout(() => setSelectedDecorationIds(mirrored.map((item) => item.id)), 0);
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const mirrorCopyVerticalSelected = useCallback(() => {
    if (!selectedDecorationIds.length) return;
    updateRole((current) => {
      const selected = current.decorations.filter((item) => selectedDecorationIds.includes(item.id));
      if (!selected.length) return current;
      const insertIndex = insertAfterSelection(current, selectedDecorationIds);
      const mirrored = selected.map((item) => ({
        ...item,
        id: createId('deco'),
        y: -item.y,
        scaleY: -item.scaleY
      }));
      shiftHeadLayerForInsert(current, insertIndex, mirrored.length);
      current.decorations = [...current.decorations.slice(0, insertIndex), ...mirrored, ...current.decorations.slice(insertIndex)];
      window.setTimeout(() => setSelectedDecorationIds(mirrored.map((item) => item.id)), 0);
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const reorderDecorations = useCallback(
    (activeRowId: string, overRowId: string) => {
      if (activeRowId === overRowId) return;
      updateRole((current) => {
        const groups = current.groups ?? [];
        const active = parseLayerDragTarget(activeRowId);
        const over = parseLayerDragTarget(overRowId);

        const activeGroup = active.kind === 'group' ? groups.find((group) => group.id === active.id) : undefined;
        const overGroupFromHeader = over.kind === 'group' ? groups.find((group) => group.id === over.id) : undefined;
        const overGroupFromItem = over.kind === 'item' ? groupForItem(groups, over.id) : undefined;

        let movingIds: string[] = [];
        let overIds: string[] = [];

        if (active.kind === 'group') {
          if (!activeGroup) return current;
          movingIds = orderedIds(current, activeGroup.itemIds);

          if (overGroupFromHeader) {
            overIds = orderedIds(current, overGroupFromHeader.itemIds);
          } else if (over.kind === 'item') {
            const targetGroup = overGroupFromItem;
            overIds = targetGroup ? orderedIds(current, targetGroup.itemIds) : [over.id];
          }
        } else {
          const activeItemExists = current.decorations.some((item) => item.id === active.id);
          if (!activeItemExists) return current;

          const sourceGroup = groupForItem(groups, active.id);
          const draggingSingleGroupedItem = !!sourceGroup;
          const selectedSet = new Set(selectedDecorationIds);

          movingIds = !draggingSingleGroupedItem && selectedSet.has(active.id)
            ? current.decorations.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
            : [active.id];

          if (overGroupFromHeader) {
            overIds = orderedIds(current, overGroupFromHeader.itemIds);
          } else if (over.kind === 'item') {
            overIds = [over.id];
          }

          if (movingIds.length === 1) {
            const targetGroup = over.kind === 'item' ? overGroupFromItem : undefined;
            current.groups = groups.map((group) => {
              const withoutActive = group.itemIds.filter((id) => id !== active.id);
              if (targetGroup && group.id === targetGroup.id && !withoutActive.includes(active.id)) {
                return { ...group, itemIds: [...withoutActive, active.id] };
              }
              return { ...group, itemIds: withoutActive };
            });
          }
        }

        if (!movingIds.length || !overIds.length || movingIds.some((id) => overIds.includes(id))) return current;
        moveLayerBlock(current, movingIds, overIds);
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  const moveSelectedToBoundary = useCallback(
    (boundary: 'top' | 'bottom') => {
      if (!selectedDecorationIds.length) return;
      updateRole((current) => {
        const selectedSet = new Set(selectedDecorationIds);
        const moving = current.decorations.filter((item) => selectedSet.has(item.id));
        const remaining = current.decorations.filter((item) => !selectedSet.has(item.id));
        current.decorations = boundary === 'top' ? [...moving, ...remaining] : [...remaining, ...moving];
        return current;
      });
    },
    [selectedDecorationIds, updateRole]
  );

  const selectGroup = useCallback((groupId: string, additive = false) => {
    const group = role.groups?.find((item) => item.id === groupId);
    if (!group) return;
    setSelectedDecorationIds((ids) => {
      if (!additive) return group.itemIds;
      const selected = new Set(ids);
      const allSelected = group.itemIds.every((id) => selected.has(id));
      group.itemIds.forEach((id) => {
        if (allSelected) selected.delete(id);
        else selected.add(id);
      });
      return role.decorations.filter((item) => selected.has(item.id)).map((item) => item.id);
    });
  }, [role.decorations, role.groups]);

  const groupSelected = useCallback(() => {
    updateRole((current) => {
      const itemIds = ungroupedSelectedIds(current, selectedDecorationIds);
      if (itemIds.length < 2) return current;
      const nextIndex = (current.groups ?? []).length + 1;
      current.groups = [
        ...(current.groups ?? []),
        {
          id: createId('group'),
          name: `Group ${nextIndex}`,
          itemIds,
          visible: true,
          collapsed: false
        }
      ];
      return current;
    });
  }, [selectedDecorationIds, updateRole]);

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    updateRole((current) => {
      current.groups = (current.groups ?? []).map((group) =>
        group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
      );
      return current;
    });
  }, [updateRole]);

  const setGroupVisible = useCallback((groupId: string, visible: boolean) => {
    updateRole((current) => {
      const group = current.groups?.find((item) => item.id === groupId);
      if (!group) return current;
      const itemIds = new Set(group.itemIds);
      current.groups = (current.groups ?? []).map((item) => (item.id === groupId ? { ...item, visible } : item));
      current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible } : item));
      return current;
    });
  }, [updateRole]);

  const toggleGroupVisibility = useCallback((groupId: string) => {
    const group = role.groups?.find((item) => item.id === groupId);
    if (!group) return;
    setGroupVisible(groupId, group.visible === false);
  }, [role.groups, setGroupVisible]);

  const ungroup = useCallback((groupId: string) => {
    updateRole((current) => {
      const group = current.groups?.find((item) => item.id === groupId);
      const itemIds = new Set(group?.itemIds ?? []);
      current.groups = (current.groups ?? []).filter((item) => item.id !== groupId);
      current.decorations = current.decorations.map((item) => (itemIds.has(item.id) ? { ...item, visible: true } : item));
      return current;
    });
  }, [updateRole]);

  const changeCamp = useCallback(
    (camp: string) => {
      updateRole((current) => ({ ...current, camp }));
    },
    [updateRole]
  );

  const changeGender = useCallback(
    (gender: GenderCode) => {
      updateRole((current) => ({ ...current, gender }));
    },
    [updateRole]
  );

  const newDesign = useCallback(() => {
    history.reset(createDefaultRole(camps[0].code, 'male'));
    setSelectedDecorationIds([]);
    setSelectedTab('deco');
  }, [history]);

  const importRole = useCallback(
    (nextRole: RoleDocument) => {
      history.reset(nextRole);
      setSelectedDecorationIds([]);
      setSelectedTab('deco');
    },
    [history]
  );

  const updatePartById = useCallback(
    (tab: BodyPartTab, optionId: string) => {
      const option = optionById[optionId] ?? findOptionByCode(tab, optionId) ?? partOptions[tab][0];
      choosePart(tab, option);
    },
    [choosePart]
  );

  return {
    role,
    selectedTab,
    setSelectedTab,
    selectedDecorationIds,
    selectedDecorations,
    groups: role.groups ?? [],
    groupMap,
    canGroupSelected,
    editValues,
    selectionScaleMin,
    selectionScaleMax,
    clipboardCount: clipboard.length,
    stageScale,
    setStageScale,
    stageMinScale: STAGE_MIN_SCALE,
    stageMaxScale: STAGE_MAX_SCALE,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    beginTransient: history.beginTransient,
    commitTransient: history.commitTransient,
    cancelTransient: history.cancelTransient,
    undo: history.undo,
    redo: history.redo,
    choosePart,
    updatePartById,
    selectDecoration,
    clearSelection,
    selectAllDecorations,
    updateDecoration,
    updateSelectedTransform,
    nudgeSelected,
    rotateSelectedBy,
    scaleSelectedBy,
    ratioSelectedBy,
    flipSelected,
    flipSelectedVertical,
    setSelectedVisible,
    toggleDecorationVisibility,
    selectGroup,
    groupSelected,
    toggleGroupCollapsed,
    toggleGroupVisibility,
    ungroup,
    deleteDecoration,
    deleteSelected,
    copySelected,
    pasteClipboard,
    mirrorCopyHorizontalSelected,
    mirrorCopyVerticalSelected,
    reorderDecorations,
    moveSelectedToBoundary,
    changeCamp,
    changeGender,
    newDesign,
    importRole
  };
}
