import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_POSITION_RANGE } from '../constants/editor';
import { t } from '../i18n';
import { createReferenceImageUrlOwner } from '../lib/editor/referenceImageUrlResources';
import {
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

const EMPTY_LAYER_ORDER: string[] = [];

function loadImageSize(src: string, signal: AbortSignal): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      image.removeAttribute('src');
      reject(signal.reason);
    };
    image.onload = () => {
      cleanup();
      resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Failed to load reference image.'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
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
  const [urlOwner] = useState(createReferenceImageUrlOwner);
  const committedFutureRef = useRef(future);
  const [clearGeneration, setClearGeneration] = useState(0);
  const [submittedUrls, setSubmittedUrls] = useState<string[]>([]);
  const committedClearGenerationRef = useRef(clearGeneration);

  useEffect(() => {
    currentRef.current = { images, selectedId, layerOrder };
    const wasCleared = committedClearGenerationRef.current !== clearGeneration;
    const previousFuture = committedFutureRef.current;
    // Dropped future entries are the only normal way an immutable URL can
    // become unreachable; edits and undo/redo move current entries into history.
    const discardedRedo = previousFuture !== future && previousFuture.length > 0 && future.length === 0;
    committedClearGenerationRef.current = clearGeneration;
    committedFutureRef.current = future;
    if (!wasCleared && !discardedRedo && !submittedUrls.length) return;

    const reachable = new Set(images.map((image) => image.src));
    for (const history of [past, future]) {
      for (const snapshot of history) {
        for (const image of snapshot.images) reachable.add(image.src);
      }
    }
    for (const image of transientRef.current?.images ?? []) reachable.add(image.src);
    const committedSubmissions = new Set(submittedUrls);
    urlOwner.collect(reachable, wasCleared ? clearGeneration : undefined, committedSubmissions);
    if (committedSubmissions.size) {
      setSubmittedUrls((urls) => {
        const remaining = urls.filter((src) => !committedSubmissions.has(src));
        return remaining.length === urls.length ? urls : remaining;
      });
    }
  }, [clearGeneration, future, images, layerOrder, past, selectedId, submittedUrls, urlOwner]);

  useEffect(() => {
    urlOwner.activate();
    return () => urlOwner.deactivate();
  }, [urlOwner]);

  const commitSnapshot = useCallback((next: ReferenceImageHistorySnapshot, record = true) => {
    const previous = currentRef.current;
    if (sameReferenceImageSnapshot(previous, next)) return false;
    // Updates construct new arrays/objects only when changed. Retaining these
    // immutable snapshots also preserves the large canonical layer-order array.
    if (record) {
      setPast((entries) => [...entries, previous]);
      setFuture([]);
      onMutation?.();
    }
    currentRef.current = next;
    setImages(next.images);
    setSelectedId(next.selectedId);
    setLayerOrder(next.layerOrder ?? EMPTY_LAYER_ORDER);
    return true;
  }, [onMutation]);

  const selectImage = useCallback((id: string | null) => {
    setSelectedId((current) => current === id ? current : id);
  }, []);

  const addImageFile = useCallback(async (file: File): Promise<string | null> => {
    if (!isReferenceImageFile(file)) throw new Error(t('extra.error.referenceImageType'));
    const src = URL.createObjectURL(file);
    const signal = urlOwner.begin(src);
    try {
      const { width, height } = await loadImageSize(src, signal);
      if (signal.aborted) throw signal.reason;
      const layer = createReferenceImageLayer(file.name, src, width, height, positionRange);
      const next = {
        images: [...currentRef.current.images, layer],
        selectedId: layer.id,
        layerOrder: [...(currentRef.current.layerOrder ?? []), referenceImageLayerToken(layer.id)]
      };
      urlOwner.submit(src);
      commitSnapshot(next);
      // Confirm this particular submission with the committed state batch. If
      // another batched edit displaced it, the effect may now release it.
      setSubmittedUrls((urls) => [...urls, src]);
      return layer.id;
    } catch (error) {
      const cancelled = signal.aborted;
      urlOwner.fail(src);
      if (cancelled) return null;
      throw error;
    }
  }, [commitSnapshot, positionRange, urlOwner]);

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
      if (!transientRef.current) transientRef.current = currentRef.current;
      commitSnapshot(next, false);
      return;
    }
    commitSnapshot(next);
  }, [commitSnapshot, positionRange]);

  const beginTransform = useCallback(() => {
    transientRef.current = currentRef.current;
  }, []);

  const commitTransform = useCallback(() => {
    const before = transientRef.current;
    transientRef.current = null;
    if (!before) return;
    const current = currentRef.current;
    if (sameReferenceImageSnapshot(before, current)) return;
    setPast((entries) => [...entries, before]);
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
    setFuture((entries) => [current, ...entries]);
    currentRef.current = previous;
    setImages(previous.images);
    setSelectedId(previous.selectedId);
    setLayerOrder(previous.layerOrder ?? EMPTY_LAYER_ORDER);
    onMutation?.();
    return true;
  }, [onMutation, past]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return false;
    const current = currentRef.current;
    setFuture((entries) => entries.slice(1));
    setPast((entries) => [...entries, current]);
    currentRef.current = next;
    setImages(next.images);
    setSelectedId(next.selectedId);
    setLayerOrder(next.layerOrder ?? EMPTY_LAYER_ORDER);
    onMutation?.();
    return true;
  }, [future, onMutation]);

  const clear = useCallback(() => {
    const nextGeneration = urlOwner.prepareClear();
    transientRef.current = null;
    currentRef.current = { images: [], selectedId: null, layerOrder: EMPTY_LAYER_ORDER };
    setImages([]);
    setSelectedId(null);
    setLayerOrder(EMPTY_LAYER_ORDER);
    setPast([]);
    setFuture([]);
    setClearGeneration(nextGeneration);
  }, [urlOwner]);

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
