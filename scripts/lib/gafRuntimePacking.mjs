// The runtime contains thousands of instances sharing the same transforms.
// Keep exact source numbers and painter order, but don't repeat JSON field names
// and matrix values for every instance. Metadata and the conversion worker's
// standalone decoration manifest keep their original schema.
function packRuntime(manifest) {
  const matrixPool = [];
  const matrixIndices = new Map();
  const timelinesById = Object.fromEntries(Object.entries(manifest.timelinesById).map(([id, timeline]) => {
    const { frames, ...metadata } = timeline;
    const packedFrames = Object.fromEntries(Object.entries(frames).map(([frame, instances]) => [
      frame,
      instances.map(({ objectId, zIndex, alpha, matrix, maskId, colorTransform }) => {
        const components = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty];
        const key = JSON.stringify(components);
        let matrixIndex = matrixIndices.get(key);
        if (matrixIndex === undefined) {
          matrixIndex = matrixPool.length;
          matrixIndices.set(key, matrixIndex);
          matrixPool.push(components);
        }
        const instance = [objectId, zIndex, alpha, matrixIndex];
        if (colorTransform != null) instance.push(maskId ?? null, colorTransform);
        else if (maskId != null) instance.push(maskId);
        return instance;
      })
    ]));
    return [id, { ...metadata, packedFrames }];
  }));
  return { ...manifest, timelinesById, matrixPool };
}

export function packGafRuntimeManifest(runtime) {
  const packed = { ...runtime };
  for (const key of ['decorationRuntime', 'assetsRuntime', 'actorRuntime']) {
    if (runtime[key]) packed[key] = packRuntime(runtime[key]);
  }
  return packed;
}

/** Retain only the resolution keys in the eagerly read actor/decoration data. */
export function splitPackedWeaponRuntime(packedRuntime) {
  const { assetsRuntime: weaponRuntime = null, ...startupRuntime } = packedRuntime;
  const weaponRuntimeTimelineKeys = new Set(Object.keys(weaponRuntime?.timelinesById ?? {}));
  for (const [key, value] of Object.entries(weaponRuntime?.timelinesByLinkage ?? {})) {
    if (value != null && value !== '') weaponRuntimeTimelineKeys.add(key);
  }
  return {
    startupRuntime: { ...startupRuntime, weaponRuntimeTimelineKeys: [...weaponRuntimeTimelineKeys] },
    weaponRuntime
  };
}

/**
 * Actor GAF matrices originate in Float32. Encode only when we can prove the
 * currently serialized values are representable exactly; otherwise keep JSON.
 */
export function encodeActorFloat32MatrixPool(packedRuntime) {
  const actorRuntime = packedRuntime.actorRuntime;
  const matrices = actorRuntime?.matrixPool;
  if (!matrices?.length) return packedRuntime;
  // for..of visits sparse holes as undefined, unlike Array.every.
  for (const matrix of matrices) {
    if (!Array.isArray(matrix) || matrix.length !== 6) return packedRuntime;
    for (const value of matrix) {
      if (!Number.isFinite(value) || Math.fround(value) !== value) return packedRuntime;
    }
  }

  const bytes = Buffer.alloc(matrices.length * 6 * 4);
  let offset = 0;
  for (const matrix of matrices) {
    for (const value of matrix) {
      // JSON used to serialize negative zero as ordinary zero.
      bytes.writeFloatLE(value === 0 ? 0 : value, offset);
      offset += 4;
    }
  }
  const { matrixPool: _matrixPool, ...actorWithoutMatrices } = actorRuntime;
  return {
    ...packedRuntime,
    actorRuntime: { ...actorWithoutMatrices, matrixPoolFloat32LE: bytes.toString('base64') }
  };
}
