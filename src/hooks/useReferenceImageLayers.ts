import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_POSITION_RANGE } from '../constants/editor';
import { t } from '../i18n';
import {
  cloneReferenceImageSnapshot,
  createReferenceImageLayer,
  isReferenceImageFile,
  patchReferenceImageLayer,
  reconcileReferenceImageLayerOrder,
  reorderReferenceImageLayerOrder,
  sameReferenceImageSnapshot,
  type ReferenceImageHistorySnapshot
} from '../lib/editor/referenceImageModel';
import {
  referenceImageLayerToken,
  type ReferenceImageLayer,
  type ReferenceImageTransformPatch
} from '../types/referenceImage';

interface UseReferenceImageLayersOptions {
  positionRange?: number;
  onMutation?(): void;
}

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error('Failed to load reference image.'));
    image.src = src;
  });
}

export function useReferenceImageLayers({
  positionRange = DEFAULT_POSITION_RANGE,
  onMutation
}: UseReferenceImageLayersOptions = {}) {
  const [images, setImages] = useState<ReferenceImageLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<ReferenceImageHistorySnapshot[]>([]);
  const [future, setFuture] = useState<ReferenceImageHistorySnapshot[]>([]);
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const currentRef = useRef<ReferenceImageHistorySnapshot>({ images: [], selectedId: null, layerOrder: [] });
  const transientRef = useRef<ReferenceImageHistorySnapshot | null>(null);
  const snapshotsRef = useRef<ReferenceImageHistorySnapshot[]>([]);

  useEffect(() => {
    currentRef.current = { images, selectedId, layerOrder };
    snapshotsRef.current = [...past, ...future];
  }, [future, images, layerOrder, past, selectedId]);

  useEffect(() => () => {
    const urls = new Set<string>();
    for (const image of currentRef.current.images) urls.add(image.src);
    for (const snapshot of snapshotsRef.current) {
      for (const image of snapshot.images) urls.add(image.src);
    }
    for (const url of urls) URL.revokeObjectURL(url);
  }, []);

  const commitSnapshot = useCallback((next: ReferenceImageHistorySnapshot, record = true) => {
    const previous = currentRef.current;
    if (sameReferenceImageSnapshot(previous, next)) return false;
    if (record) {
      setPast((entries) => [...entries, cloneReferenceImageSnapshot(previous)]);
      setFuture([]);
      onMutation?.();
    }
    currentRef.current = cloneReferenceImageSnapshot(next);
    setImages(next.images);
    setSelectedId(next.selectedId);
    setLayerOrder([...(next.layerOrder ?? [])]);
    return true;
  }, [onMutation]);

  const selectImage = useCallback((id: string | null) => {
    setSelectedId((current) => current === id ? current : id);
  }, []);

  const addImageFile = useCallback(async (file: File): Promise<string> => {
    if (!isReferenceImageFile(file)) throw new Error(t('extra.error.referenceImageType'));
    const src = URL.createObjectURL(file);
    try {
      const { width, height } = await loadImageSize(src);
      const layer = createReferenceImageLayer(file.name, src, width, height, positionRange);
      const next = {
        images: [...currentRef.current.images, layer],
        selectedId: layer.id,
        layerOrder: [...(currentRef.current.layerOrder ?? []), referenceImageLayerToken(layer.id)]
      };
      commitSnapshot(next);
      return layer.id;
    } catch (error) {
      URL.revokeObjectURL(src);
      throw error;
    }
  }, [commitSnapshot, positionRange]);

  const updateImage = useCallback((id: string, patch: ReferenceImageTransformPatch, commit = true) => {
    const nextImages = currentRef.current.images.map((image) => image.id === id
      ? patchReferenceImageLayer(image, patch, positionRange)
      : image);
    const next = {
      images: nextImages,
      selectedId: currentRef.current.selectedId,
      layerOrder: currentRef.current.layerOrder
    };
    if (!commit) {
      if (!transientRef.current) transientRef.current = cloneReferenceImageSnapshot(currentRef.current);
      commitSnapshot(next, false);
      return;
    }
    commitSnapshot(next);
  }, [commitSnapshot, positionRange]);

  const beginTransform = useCallback(() => {
    transientRef.current = cloneReferenceImageSnapshot(currentRef.current);
  }, []);

  const commitTransform = useCallback(() => {
    const before = transientRef.current;
    transientRef.current = null;
    if (!before) return;
    const current = currentRef.current;
    if (sameReferenceImageSnapshot(before, current)) return;
    setPast((entries) => [...entries, cloneReferenceImageSnapshot(before)]);
    setFuture([]);
    onMutation?.();
  }, [onMutation]);

  const removeImage = useCallback((id: string) => {
    const nextImages = currentRef.current.images.filter((image) => image.id !== id);
    if (nextImages.length === currentRef.current.images.length) return;
    const nextSelectedId = currentRef.current.selectedId === id ? null : currentRef.current.selectedId;
    const token = referenceImageLayerToken(id);
    commitSnapshot({
      images: nextImages,
      selectedId: nextSelectedId,
      layerOrder: (currentRef.current.layerOrder ?? []).filter((entry) => entry !== token)
    });
  }, [commitSnapshot]);

  const toggleImageVisibility = useCallback((id: string) => {
    const image = currentRef.current.images.find((item) => item.id === id);
    if (!image) return;
    commitSnapshot({
      images: currentRef.current.images.map((item) => item.id === id ? { ...item, visible: !item.visible } : item),
      selectedId: currentRef.current.selectedId,
      layerOrder: currentRef.current.layerOrder
    });
  }, [commitSnapshot]);

  const undo = useCallback(() => {
    const previous = past[past.length - 1];
    if (!previous) return false;
    const current = currentRef.current;
    setPast((entries) => entries.slice(0, -1));
    setFuture((entries) => [cloneReferenceImageSnapshot(current), ...entries]);
    currentRef.current = cloneReferenceImageSnapshot(previous);
    setImages(previous.images);
    setSelectedId(previous.selectedId);
    setLayerOrder([...(previous.layerOrder ?? [])]);
    onMutation?.();
    return true;
  }, [onMutation, past]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return false;
    const current = currentRef.current;
    setFuture((entries) => entries.slice(1));
    setPast((entries) => [...entries, cloneReferenceImageSnapshot(current)]);
    currentRef.current = cloneReferenceImageSnapshot(next);
    setImages(next.images);
    setSelectedId(next.selectedId);
    setLayerOrder([...(next.layerOrder ?? [])]);
    onMutation?.();
    return true;
  }, [future, onMutation]);

  const clear = useCallback(() => {
    const urls = new Set<string>();
    for (const image of currentRef.current.images) urls.add(image.src);
    for (const snapshot of snapshotsRef.current) for (const image of snapshot.images) urls.add(image.src);
    for (const url of urls) URL.revokeObjectURL(url);
    transientRef.current = null;
    setImages([]);
    setSelectedId(null);
    setLayerOrder([]);
    setPast([]);
    setFuture([]);
    currentRef.current = { images: [], selectedId: null, layerOrder: [] };
  }, []);

  const clearRedo = useCallback(() => setFuture([]), []);

  const syncRoleLayerOrder = useCallback((roleLayerOrder: readonly string[]) => {
    const current = currentRef.current;
    const nextOrder = reconcileReferenceImageLayerOrder(
      current.layerOrder ?? [],
      roleLayerOrder,
      new Set(current.images.map((image) => image.id))
    );
    if (sameReferenceImageSnapshot(current, { ...current, layerOrder: nextOrder })) return;
    commitSnapshot({ ...current, layerOrder: nextOrder }, false);
  }, [commitSnapshot]);

  const reorderImage = useCallback((id: string, targetToken: string, placement: 'before' | 'after' = 'before') => {
    const order = reorderReferenceImageLayerOrder(currentRef.current.layerOrder ?? [], id, targetToken, placement);
    if (!order) return false;
    return commitSnapshot({ ...currentRef.current, layerOrder: order });
  }, [commitSnapshot]);

  const selectedImage = images.find((image) => image.id === selectedId) ?? null;

  return {
    images,
    layerOrder,
    selectedId,
    selectedImage,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    selectImage,
    addImageFile,
    updateImage,
    beginTransform,
    commitTransform,
    removeImage,
    toggleImageVisibility,
    undo,
    redo,
    clear,
    clearRedo,
    syncRoleLayerOrder,
    reorderImage
  };
}
