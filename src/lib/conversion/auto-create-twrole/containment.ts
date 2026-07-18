import type { BBox, TransformedImage } from './internalTypes';
import type { BinaryMaskIndex } from './numericCore';

export type CandidateContainmentMode = 'invalid' | 'fast' | 'scan';

type ContainmentRaster = Pick<
  TransformedImage,
  'width' | 'height' | 'data' | 'alphaBounds' | 'alphaRowStart' | 'alphaRowEnd' | 'alphaSum'
>;

/**
 * Erodes the exact target-alpha mask by one output pixel. Canvas2D and Pixi
 * both use linear sampling, but their edge coverage can differ by a pixel.
 * Testing candidates against this interior mask keeps Pixi's sampling fringe
 * inside the original (non-eroded) target silhouette without clipping output.
 */
export function erodeContainmentMask(
  containmentMask: Uint8Array,
  width: number,
  height: number,
  radius = 1
): Uint8Array {
  const output = new Uint8Array(Math.max(0, width * height));
  if (width <= 0 || height <= 0 || containmentMask.length !== width * height) return output;
  const safeRadius = Math.max(0, Math.round(radius));
  if (safeRadius === 0) {
    output.set(containmentMask);
    return output;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let inside = true;
      for (let dy = -safeRadius; dy <= safeRadius && inside; dy += 1) {
        const checkY = y + dy;
        if (checkY < 0 || checkY >= height) {
          inside = false;
          break;
        }
        for (let dx = -safeRadius; dx <= safeRadius; dx += 1) {
          const checkX = x + dx;
          if (
            checkX < 0 ||
            checkX >= width ||
            containmentMask[checkY * width + checkX] === 0
          ) {
            inside = false;
            break;
          }
        }
      }
      if (inside) output[y * width + x] = 1;
    }
  }
  return output;
}

/**
 * Checks the transformed source pixels against the target's strict alpha
 * containment mask. Transparent raster padding is allowed to cross either the
 * mask or the canvas edge; any source pixel with alpha > 0 is not.
 */
export function candidateFitsContainment(
  rgba: ContainmentRaster,
  bbox: BBox,
  containmentMask: Uint8Array,
  targetWidth: number,
  targetHeight: number,
  containmentIndex?: BinaryMaskIndex
): boolean {
  const mode = candidateContainmentMode(
    rgba,
    bbox,
    containmentMask,
    targetWidth,
    targetHeight,
    containmentIndex
  );
  if (mode === 'invalid') return false;
  if (mode === 'fast') return true;

  const [left, top] = bbox;

  for (let localY = 0; localY < rgba.height; localY += 1) {
    const start = Math.max(0, rgba.alphaRowStart[localY]);
    const end = Math.min(rgba.width, rgba.alphaRowEnd[localY]);
    if (end <= start) continue;
    const y = top + localY;

    for (let localX = start; localX < end; localX += 1) {
      const alpha = rgba.data[(localY * rgba.width + localX) * 4 + 3];
      if (alpha <= 0) continue;
      const x = left + localX;
      if (x < 0 || y < 0 || x >= targetWidth || y >= targetHeight) return false;
      if (containmentMask[y * targetWidth + x] === 0) return false;
    }
  }

  return true;
}

/**
 * Classifies a containment check without scanning source pixels. The fast
 * result is only returned when a summed-area lookup proves that the complete
 * visible-alpha rectangle is inside the placement mask. A scan result still
 * needs exact per-alpha-pixel verification because the rectangle crosses a
 * transparent hole or a non-rectangular edge.
 */
export function candidateContainmentMode(
  rgba: ContainmentRaster,
  bbox: BBox,
  containmentMask: Uint8Array,
  targetWidth: number,
  targetHeight: number,
  containmentIndex?: BinaryMaskIndex
): CandidateContainmentMode {
  const [left, top, right, bottom] = bbox;
  const [alphaLeft, alphaTop, alphaRight, alphaBottom] = rgba.alphaBounds;
  if (
    targetWidth <= 0 ||
    targetHeight <= 0 ||
    containmentMask.length !== targetWidth * targetHeight ||
    !Number.isInteger(left) ||
    !Number.isInteger(top) ||
    !Number.isInteger(right) ||
    !Number.isInteger(bottom) ||
    right - left !== rgba.width ||
    bottom - top !== rgba.height ||
    rgba.width <= 0 ||
    rgba.height <= 0 ||
    rgba.data.length !== rgba.width * rgba.height * 4 ||
    rgba.alphaRowStart.length !== rgba.height ||
    rgba.alphaRowEnd.length !== rgba.height ||
    !(rgba.alphaSum > 0) ||
    !Number.isInteger(alphaLeft) ||
    !Number.isInteger(alphaTop) ||
    !Number.isInteger(alphaRight) ||
    !Number.isInteger(alphaBottom) ||
    alphaLeft < 0 ||
    alphaTop < 0 ||
    alphaRight > rgba.width ||
    alphaBottom > rgba.height ||
    alphaRight <= alphaLeft ||
    alphaBottom <= alphaTop
  ) {
    return 'invalid';
  }

  const visibleLeft = left + alphaLeft;
  const visibleTop = top + alphaTop;
  const visibleRight = left + alphaRight;
  const visibleBottom = top + alphaBottom;
  if (
    visibleLeft < 0 ||
    visibleTop < 0 ||
    visibleRight > targetWidth ||
    visibleBottom > targetHeight
  ) {
    // alphaBounds are exact, so crossing the canvas here proves that at least
    // one visible source pixel is outside it. Full-raster transparent padding
    // is deliberately ignored.
    return 'invalid';
  }

  if (containmentIndex) {
    const visibleBounds: BBox = [visibleLeft, visibleTop, visibleRight, visibleBottom];
    const area = (visibleRight - visibleLeft) * (visibleBottom - visibleTop);
    if (containmentIndex.count(visibleBounds) === area) return 'fast';
  }
  return 'scan';
}
