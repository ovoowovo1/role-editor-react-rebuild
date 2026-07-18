import type { AutoCreateCanvas, AutoCreateCanvas2D, AutoCreateImage } from './internalTypes';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp255(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

export function createCanvas(width: number, height: number): AutoCreateCanvas {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  // Main thread keeps using a normal canvas so the existing internal preview
  // path can still call toDataURL(). Workers do not have document, so they use
  // OffscreenCanvas for the heavy AutoCreate math.
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    return canvas;
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(safeWidth, safeHeight);
  }

  throw new Error('Canvas is not available in this browser context.');
}

type FileReaderSyncConstructor = new () => { readAsDataURL(blob: Blob): string };

export function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Failed to read preview blob.'));
      reader.readAsDataURL(blob);
    });
  }

  const ReaderSync = (globalThis as unknown as { FileReaderSync?: FileReaderSyncConstructor }).FileReaderSync;
  if (ReaderSync) {
    try {
      return Promise.resolve(new ReaderSync().readAsDataURL(blob));
    } catch {
      // Fall through to the ArrayBuffer encoder below.
    }
  }

  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    const base64 = typeof btoa === 'function' ? btoa(binary) : '';
    return base64 ? `data:${blob.type || 'application/octet-stream'};base64,${base64}` : '';
  });
}

export async function canvasToDataUrl(canvas: AutoCreateCanvas): Promise<string> {
  if ('toDataURL' in canvas && typeof canvas.toDataURL === 'function') {
    return canvas.toDataURL('image/png');
  }

  const offscreen = canvas as OffscreenCanvas & {
    convertToBlob?: (options?: { type?: string; quality?: number }) => Promise<Blob>;
  };
  if (typeof offscreen.convertToBlob === 'function') {
    const blob = await offscreen.convertToBlob({ type: 'image/png' });
    return blobToDataUrl(blob);
  }

  return '';
}

export function get2d(canvas: AutoCreateCanvas, willReadFrequently = true): AutoCreateCanvas2D {
  const context = canvas.getContext('2d', { willReadFrequently } as CanvasRenderingContext2DSettings);
  if (!context) throw new Error('Canvas 2D context is not available.');
  return context as AutoCreateCanvas2D;
}

export function imagePixelWidth(image: AutoCreateImage): number {
  return Math.max(1, Math.round(('naturalWidth' in image ? image.naturalWidth : image.width) || image.width || 1));
}

export function imagePixelHeight(image: AutoCreateImage): number {
  return Math.max(1, Math.round(('naturalHeight' in image ? image.naturalHeight : image.height) || image.height || 1));
}

const imageCache = new Map<string, Promise<AutoCreateImage>>();

export async function loadImageBitmapFromUrl(src: string): Promise<ImageBitmap> {
  if (typeof fetch === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error('ImageBitmap loading is not available in this browser context.');
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to fetch image: ${src}`);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

export function loadImage(src: string): Promise<AutoCreateImage> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const request = typeof Image !== 'undefined' ? loadImageElement(src) : loadImageBitmapFromUrl(src);
  imageCache.set(src, request);
  return request;
}

export async function loadImageFromFile(file: File): Promise<AutoCreateImage> {
  if (typeof createImageBitmap !== 'undefined' && typeof document === 'undefined') {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
    imageCache.delete(url);
  }
}

export function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== 'undefined') {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function makeAbortError(): DOMException {
  return new DOMException('AutoCreateTwrole was aborted.', 'AbortError');
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw makeAbortError();
  }
}
