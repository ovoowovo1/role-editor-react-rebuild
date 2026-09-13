import { clamp, clampToDisc, createId } from '../math';
import {
  referenceImageLayerToken,
  type ReferenceImageLayer,
  type ReferenceImageTransformPatch
} from '../../types/referenceImage';

export const REFERENCE_IMAGE_MAX_SCALE = 8;
export const REFERENCE_IMAGE_MIN_SCALE = 0.05;

export function isReferenceImageFile(file: Pick<File, 'name' | 'type'> | null | undefined): boolean {
  if (!file) return false;
  const type = file.type.toLowerCase();
  if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg') return true;
  return /\.(png|jpe?g)$/i.test(file.name);
}

export function referenceImageInitialScale(width: number, height: number, positionRange: number): number {
  const maxSide = Math.max(1, width, height);
  const targetSide = Math.max(1, positionRange * 2);
  return Math.min(1, targetSide / maxSide);
}

export function createReferenceImageLayer(
  name: string,
  src: string,
  width: number,
  height: number,
  positionRange: number,
  id = createId('reference-image')
): ReferenceImageLayer {
  return {
    id,
    name,
    src,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    x: 0,
    y: 0,
    scale: referenceImageInitialScale(width, height, positionRange),
    opacity: 1,
    visible: true
  };
}

export function patchReferenceImageLayer(
  image: ReferenceImageLayer,
  patch: ReferenceImageTransformPatch,
  positionRange: number
): ReferenceImageLayer {
  let next = image;
  if (patch.x !== undefined || patch.y !== undefined) {
    const x = Number.isFinite(patch.x) ? patch.x! : image.x;
    const y = Number.isFinite(patch.y) ? patch.y! : image.y;
    const position = clampToDisc(x, y, positionRange);
    if (position.x !== image.x || position.y !== image.y) next = { ...next, x: position.x, y: position.y };
  }
  if (patch.scale !== undefined && Number.isFinite(patch.scale)) {
    const scale = clamp(patch.scale, REFERENCE_IMAGE_MIN_SCALE, REFERENCE_IMAGE_MAX_SCALE);
    if (scale !== next.scale) next = { ...next, scale };
  }
  if (patch.opacity !== undefined && Number.isFinite(patch.opacity)) {
    const opacity = clamp(patch.opacity, 0, 1);
    if (opacity !== next.opacity) next = { ...next, opacity };
  }
  if (patch.visible !== undefined && patch.visible !== next.visible) next = { ...next, visible: patch.visible };
  return next;
}

export interface ReferenceImageHistorySnapshot {
  images: ReferenceImageLayer[];
  selectedId: string | null;
  layerOrder?: string[];
}

function normalizedLayerOrder(snapshot: ReferenceImageHistorySnapshot): string[] {
  return snapshot.layerOrder
    ? [...snapshot.layerOrder]
    : snapshot.images.map((image) => referenceImageLayerToken(image.id));
}

export function reconcileReferenceImageLayerOrder(
  currentOrder: readonly string[],
  roleLayerOrder: readonly string[],
  imageIds: ReadonlySet<string>
): string[] {
  const imageTokens = new Set([...imageIds].map(referenceImageLayerToken));
  const validRoleTokens = new Set(roleLayerOrder);
  const existing = currentOrder.filter((token, index, entries) =>
    (imageTokens.has(token) || validRoleTokens.has(token)) && entries.indexOf(token) === index
  );
  if (!existing.length) {
    return [...roleLayerOrder, ...imageTokens];
  }
  const buckets = Array.from({ length: roleLayerOrder.length + 1 }, () => [] as string[]);
  existing.forEach((token, index) => {
    if (!imageTokens.has(token)) return;
    let previousRole: string | undefined;
    let nextRole: string | undefined;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (validRoleTokens.has(existing[cursor])) {
        previousRole = existing[cursor];
        break;
      }
    }
    for (let cursor = index + 1; cursor < existing.length; cursor += 1) {
      if (validRoleTokens.has(existing[cursor])) {
        nextRole = existing[cursor];
        break;
      }
    }
    const previousIndex = previousRole ? roleLayerOrder.indexOf(previousRole) : -1;
    const nextIndex = nextRole ? roleLayerOrder.indexOf(nextRole) : -1;
    const slot = previousIndex >= 0
      ? Math.min(roleLayerOrder.length, previousIndex + 1)
      : nextIndex >= 0
        ? nextIndex
        : roleLayerOrder.length;
    buckets[slot].push(token);
  });
  const nextOrder: string[] = [];
  for (let index = 0; index <= roleLayerOrder.length; index += 1) {
    nextOrder.push(...buckets[index]);
    if (index < roleLayerOrder.length) nextOrder.push(roleLayerOrder[index]);
  }
  const present = new Set(nextOrder);
  for (const token of imageTokens) {
    if (!present.has(token)) nextOrder.push(token);
  }
  return nextOrder;
}

export function reorderReferenceImageLayerOrder(
  currentOrder: readonly string[],
  id: string,
  targetToken: string,
  placement: 'before' | 'after' = 'before'
): string[] | null {
  const token = referenceImageLayerToken(id);
  const order = [...currentOrder];
  const fromIndex = order.indexOf(token);
  if (fromIndex < 0 || token === targetToken || !order.includes(targetToken)) return null;
  order.splice(fromIndex, 1);
  const targetIndex = order.indexOf(targetToken);
  if (targetIndex < 0) return null;
  order.splice(targetIndex + (placement === 'after' ? 1 : 0), 0, token);
  return order;
}

export function cloneReferenceImageSnapshot(snapshot: ReferenceImageHistorySnapshot): ReferenceImageHistorySnapshot {
  return {
    images: snapshot.images.map((image) => ({ ...image })),
    selectedId: snapshot.selectedId,
    layerOrder: normalizedLayerOrder(snapshot)
  };
}

export function sameReferenceImageSnapshot(a: ReferenceImageHistorySnapshot, b: ReferenceImageHistorySnapshot): boolean {
  const aOrder = normalizedLayerOrder(a);
  const bOrder = normalizedLayerOrder(b);
  if (a.selectedId !== b.selectedId || a.images.length !== b.images.length || aOrder.length !== bOrder.length) return false;
  if (aOrder.some((token, index) => token !== bOrder[index])) return false;
  return a.images.every((image, index) => {
    const other = b.images[index];
    return Boolean(other) && Object.keys(image).every((key) => image[key as keyof ReferenceImageLayer] === other[key as keyof ReferenceImageLayer]);
  });
}
