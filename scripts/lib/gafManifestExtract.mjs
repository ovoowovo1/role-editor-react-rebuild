/** @typedef {{ x:number,y:number,width:number,height:number,pivotX:number,pivotY:number,scale:number }} AtlasFrame */

const TYPE_TEXTURE = 'texture';

function isActorLinkage(linkage) {
  return /^lib_actor_/i.test(linkage) || /^lib_anim_/i.test(linkage) || /^actor\d/i.test(linkage);
}

function pickTextureFrame(insts, timeline, elements) {
  if (!insts?.length) return null;
  const sorted = [...insts].sort((a, b) => a.zIndex - b.zIndex);
  for (const inst of sorted) {
    const ao = timeline.animationObjects.get(inst.objectId);
    if (!ao || ao.mask || ao.type !== TYPE_TEXTURE) continue;
    const el = elements.get(String(ao.regionId));
    if (el) return elementToAtlasFrame(el);
  }
  return null;
}

export function extractDecorationSlice(parsed) {
  const elements = parsed.defaultElements;
  const timelines = parsed.timelines.filter((t) => t.linkage && !isActorLinkage(t.linkage));

  /** @type {string[]} */
  const decorationGafSymbols = [];
  /** @type {Record<string, AtlasFrame>} */
  const decorationAtlasFrameData = {};

  for (const tl of timelines) {
    let picked = pickTextureFrame(tl.frames.get(1), tl, elements);
    if (!picked) {
      const frameNums = [...tl.frames.keys()].sort((a, b) => a - b);
      for (const n of frameNums) {
        picked = pickTextureFrame(tl.frames.get(n), tl, elements);
        if (picked) break;
      }
    }
    if (!picked) {
      console.warn(`[generate:gaf] Skip deco timeline "${tl.linkage}" — no drawable texture frame`);
      continue;
    }
    decorationGafSymbols.push(tl.linkage);
    decorationAtlasFrameData[tl.linkage] = picked;
  }

  if (!decorationGafSymbols.length) {
    throw new Error('[generate:gaf] No usable decoration timelines found after filtering');
  }

  return { decorationGafSymbols, decorationAtlasFrameData };
}

function serializeElementForRuntime(el) {
  return {
    atlasID: el.atlasID,
    elementAtlasID: el.elementAtlasID,
    region: el.region,
    pivotX: el.pivotX,
    pivotY: el.pivotY,
    scaleX: el.scaleX,
    scaleY: el.scaleY,
    linkageName: el.linkageName ?? ''
  };
}

function serializeTimelineForRuntime(tl) {
  const animationObjects = {};
  for (const [objId, ao] of tl.animationObjects) {
    animationObjects[objId] = {
      regionId: ao.regionId,
      type: ao.type,
      mask: !!ao.mask
    };
  }

  /** @type {Record<string, { objectId:string, zIndex:number, alpha:number, maskId:null|string, matrix:any }[]>} */
  const framesObj = {};

  const total = tl.framesCount;

  for (let f = 1; f <= total; f += 1) {
    const raw = tl.frames.get(f);
    const source = Array.isArray(raw) ? raw : [];

    framesObj[String(f)] = source.map((inst) => ({
      objectId: inst.objectId,
      zIndex: inst.zIndex,
      alpha:
        typeof inst.alpha === 'number' && Number.isFinite(inst.alpha) ? clampDisplayAlpha(inst.alpha) : 1,
      maskId: inst.maskId ?? null,
      matrix:
        inst.matrix && typeof inst.matrix === 'object'
          ? inst.matrix
          : { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
    }));
  }

  return {
    id: String(tl.id),
    linkage: tl.linkage,
    framesCount: total,
    bounds: tl.bounds,
    pivot: tl.pivot,
    animationObjects,
    frames: framesObj
  };
}

function clampDisplayAlpha(a) {
  if (a > 1.000001) return Math.min(Math.max(a / 255, 0), 1);
  return Math.min(Math.max(a, 0), 1);
}

/**
 * Full twactor timelines + elements — nested actor clips reference arbitrary timeline IDs.
 * @param {Record<string, any[]> | undefined} [actorAtlasFrameData] when set, warn if timeline frame count != thumbnail slice length
 */
export function extractActorRuntime(parsed, actorAtlasFrameData) {
  const elementsObj = {};
  for (const [id, el] of parsed.defaultElements) {
    elementsObj[String(id)] = serializeElementForRuntime(el);
  }

  const timelines = parsed.timelines.map((tl) => serializeTimelineForRuntime(tl));
  const timelinesById = {};
  const timelinesByLinkage = {};

  for (const tl of timelines) {
    timelinesById[tl.id] = tl;
    if (tl.linkage) {
      timelinesByLinkage[tl.linkage] = tl.id;
    }
  }

  const actorLinkages = ['lib_actor_head', 'lib_actor_hand', 'lib_actor_foot', 'lib_actor_cape'];

  for (const link of actorLinkages) {
    const id = timelinesByLinkage[link];
    const tl = id ? timelinesById[id] : null;
    if (!tl) {
      console.warn(`[generate:gaf] Actor runtime missing timeline linkage "${link}"`);
      continue;
    }
    const sliceLen = actorAtlasFrameData?.[link]?.length;
    if (sliceLen != null && sliceLen > 0 && tl.framesCount !== sliceLen) {
      console.warn(
        `[generate:gaf] Actor runtime "${link}" framesCount=${tl.framesCount} != actorAtlasFrame slice length ${sliceLen}`
      );
    }
  }

  return {
    actorRuntime: {
      elements: elementsObj,
      timelinesById,
      timelinesByLinkage
    }
  };
}

export function extractActorSlice(parsed) {
  const elements = parsed.defaultElements;
  /** Thumbnail / choice-grid only: pick one texture drawable per actor frame */
  const timelines = parsed.timelines.filter((t) => t.linkage && isActorLinkage(t.linkage));

  /** @type {Record<string, AtlasFrame[]>} */
  const actorAtlasFrameData = {};

  for (const tl of timelines) {
    /** @type {AtlasFrame[]} */
    const frames = [];
    for (let f = 1; f <= tl.framesCount; f++) {
      const picked = pickTextureFrame(tl.frames.get(f), tl, elements);
      frames.push(
        picked ?? {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
          pivotX: 0,
          pivotY: 0,
          scale: 1
        }
      );
    }
    actorAtlasFrameData[tl.linkage] = frames;
  }

  const actorFallbackFrameCounts = {
    head: actorAtlasFrameData.lib_actor_head?.length ?? 0,
    hand: actorAtlasFrameData.lib_actor_hand?.length ?? 0,
    foot: actorAtlasFrameData.lib_actor_foot?.length ?? 0,
    cape: actorAtlasFrameData.lib_actor_cape?.length ?? 0
  };

  return { actorAtlasFrameData, actorFallbackFrameCounts };
}

function elementToAtlasFrame(el) {
  return {
    x: el.region.x,
    y: el.region.y,
    width: el.region.width,
    height: el.region.height,
    pivotX: el.pivotX,
    pivotY: el.pivotY,
    scale: 1
  };
}

/** PNG IHDR width/height */
export function readPngDimensions(buffer) {
  if (buffer.length < 24) throw new Error('PNG too small');
  const sig = buffer.subarray(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') throw new Error('Not a PNG file');
  const w = buffer.readUInt32BE(16);
  const h = buffer.readUInt32BE(20);
  return { width: w, height: h };
}

export function validateAtlasAgainstPng(label, framesFlat, dims) {
  for (const fr of framesFlat) {
    const maxX = fr.x + fr.width;
    const maxY = fr.y + fr.height;
    if (fr.x < 0 || fr.y < 0 || maxX > dims.width + 1 || maxY > dims.height + 1) {
      console.warn(
        `[generate:gaf] Atlas rect outside PNG bounds (${label}): ${JSON.stringify(fr)} vs PNG ${dims.width}x${dims.height}`
      );
    }
  }
}

export function flattenDecorationFrames(decorationAtlasFrameData) {
  return Object.values(decorationAtlasFrameData);
}

export function flattenActorFrames(actorAtlasFrameData) {
  return Object.values(actorAtlasFrameData).flat();
}
