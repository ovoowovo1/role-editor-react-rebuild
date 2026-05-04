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

export function extractActorSlice(parsed) {
  const elements = parsed.defaultElements;
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
