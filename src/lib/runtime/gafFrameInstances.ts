import type {
  GafFrameInstanceSerialized, GafMatrixSerialized, GafPackedMatrix, GafPackedTimeline, GafRuntimeManifest, GafTimeline
} from '../../types/gafRuntime';

const NO_INSTANCES: readonly GafFrameInstanceSerialized[] = [];
const decodedFramesByManifest = new WeakMap<
  GafRuntimeManifest, WeakMap<GafPackedTimeline, Map<string, readonly GafFrameInstanceSerialized[]>>
>();

const BYTES_PER_PACKED_MATRIX = 6 * 4;
const binaryPoolsByManifest = new WeakMap<GafRuntimeManifest, DataView>();

function binaryMatrixPool(manifest: GafRuntimeManifest): DataView {
  const cached = binaryPoolsByManifest.get(manifest);
  if (cached) return cached;

  const raw = atob(manifest.matrixPoolFloat32LE!);
  if (raw.length % BYTES_PER_PACKED_MATRIX !== 0) {
    throw new Error('Invalid GAF Float32 matrix pool length.');
  }
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  const view = new DataView(bytes.buffer);
  binaryPoolsByManifest.set(manifest, view);
  return view;
}

function readMatrix(
  pool: readonly GafPackedMatrix[] | undefined,
  binary: DataView | undefined,
  index: number
): GafMatrixSerialized {
  if (binary) {
    const offset = index * BYTES_PER_PACKED_MATRIX;
    return {
      a: binary.getFloat32(offset, true),
      b: binary.getFloat32(offset + 4, true),
      c: binary.getFloat32(offset + 8, true),
      d: binary.getFloat32(offset + 12, true),
      tx: binary.getFloat32(offset + 16, true),
      ty: binary.getFloat32(offset + 20, true)
    };
  }
  const [a, b, c, d, tx, ty] = pool![index];
  return { a, b, c, d, tx, ty };
}

/** Decode on first display, not during startup; repeated previews reuse the frame. */
export function gafFrameInstances(
  manifest: GafRuntimeManifest,
  timeline: GafTimeline,
  frame: string
): readonly GafFrameInstanceSerialized[] {
  if ('frames' in timeline) return timeline.frames[frame] ?? NO_INSTANCES;
  if (!Object.prototype.hasOwnProperty.call(timeline.packedFrames, frame)) return NO_INSTANCES;
  const packed = timeline.packedFrames[frame];
  const matrixPool = manifest.matrixPool;
  if (!packed.length || (!matrixPool && !manifest.matrixPoolFloat32LE)) return NO_INSTANCES;

  let decodedTimelines = decodedFramesByManifest.get(manifest);
  if (!decodedTimelines) {
    decodedTimelines = new WeakMap();
    decodedFramesByManifest.set(manifest, decodedTimelines);
  }
  let decodedFrames = decodedTimelines.get(timeline);
  if (!decodedFrames) {
    decodedFrames = new Map();
    decodedTimelines.set(timeline, decodedFrames);
  }
  const cached = decodedFrames.get(frame);
  if (cached) return cached;
  const binary = matrixPool ? undefined : binaryMatrixPool(manifest);
  const instances = packed.map(([objectId, zIndex, alpha, matrixIndex, maskId, colorTransform]) => ({
    objectId, zIndex, alpha,
    maskId: maskId ?? null,
    colorTransform: colorTransform ?? null,
    matrix: readMatrix(matrixPool, binary, matrixIndex)
  }));
  decodedFrames.set(frame, instances);
  return instances;
}
