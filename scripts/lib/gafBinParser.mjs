/**
 * Port of PixiGAFPlayer BinGAFAssetConfigConverter (minimal subset for atlas + timeline extraction).
 * @see https://github.com/mathieuanthoine/PixiGAFPlayer
 */

import { GafBytesReader } from './gafBytesReader.mjs';

export const TAG_END = 0;
export const TAG_DEFINE_ATLAS = 1;
export const TAG_DEFINE_ANIMATION_MASKS = 2;
export const TAG_DEFINE_ANIMATION_OBJECTS = 3;
export const TAG_DEFINE_ANIMATION_FRAMES = 4;
export const TAG_DEFINE_NAMED_PARTS = 5;
export const TAG_DEFINE_SEQUENCES = 6;
export const TAG_DEFINE_TEXT_FIELDS = 7;
export const TAG_DEFINE_ATLAS2 = 8;
export const TAG_DEFINE_STAGE = 9;
export const TAG_DEFINE_ANIMATION_OBJECTS2 = 10;
export const TAG_DEFINE_ANIMATION_MASKS2 = 11;
export const TAG_DEFINE_ANIMATION_FRAMES2 = 12;
export const TAG_DEFINE_TIMELINE = 13;
export const TAG_DEFINE_SOUNDS = 14;
export const TAG_DEFINE_ATLAS3 = 15;

const FILTER_DROP_SHADOW = 0;
const FILTER_BLUR = 1;
const FILTER_GLOW = 2;
const FILTER_COLOR_MATRIX = 6;

const SIGNATURE_GAC = 0x00474143;
const MAX_VERSION = 5;

const TYPE_TEXTURE = 'texture';
const TYPE_TIMELINE = 'timeline';

const EPS = 1e-5;

export function approxEq(a, b) {
  return Math.abs(a - b) < EPS;
}

function skipDropShadowFilter(r) {
  r.readUint32(); // argb
  r.skip(4 * 5);
  r.skip(2);
}

function skipBlurFilter(r) {
  r.skip(8);
}

function skipGlowFilter(r) {
  r.readUint32();
  r.skip(8);
  r.skip(4);
  r.skip(2);
}

function skipColorMatrixFilter(r) {
  r.skip(4 * 20);
}

function skipFilterPayload(r, filterType) {
  switch (filterType) {
    case FILTER_DROP_SHADOW:
      skipDropShadowFilter(r);
      break;
    case FILTER_BLUR:
      skipBlurFilter(r);
      break;
    case FILTER_GLOW:
      skipGlowFilter(r);
      break;
    case FILTER_COLOR_MATRIX:
      skipColorMatrixFilter(r);
      break;
    default:
      throw new Error(`Unsupported GAF filter type ${filterType}`);
  }
}

function getAnimationObjectTypeString(type) {
  switch (type) {
    case 0:
      return TYPE_TEXTURE;
    case 1:
      return 'textField';
    case 2:
      return TYPE_TIMELINE;
    default:
      return TYPE_TEXTURE;
  }
}

function readStageConfig(r) {
  r.readSByte();
  r.readFloat();
  r.readUint16();
  r.readUint16();
}

function createTimeline(versionMajor, versionMinor, id, assetId, framesCount, bounds, pivot, linkage) {
  return {
    versionMajor,
    versionMinor,
    id,
    assetID: assetId,
    framesCount,
    bounds,
    pivot,
    linkage,
    animationObjects: new Map(),
    /** frameNumber -> instances[] */
    frames: new Map()
  };
}

function readMatrix6(r) {
  return {
    a: r.readFloat(),
    b: r.readFloat(),
    c: r.readFloat(),
    d: r.readFloat(),
    tx: r.readFloat(),
    ty: r.readFloat()
  };
}

function cloneInstances(inst) {
  return inst.map((x) => ({
    objectId: x.objectId,
    zIndex: x.zIndex,
    alpha: x.alpha,
    maskId: x.maskId,
    matrix: x.matrix
      ? { a: x.matrix.a, b: x.matrix.b, c: x.matrix.c, d: x.matrix.d, tx: x.matrix.tx, ty: x.matrix.ty }
      : { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 }
  }));
}

function cloneFrame(prevFrame, frameNumber) {
  return {
    frameNumber,
    instances: cloneInstances(prevFrame.instances)
  };
}

function sortInstances(frame) {
  frame.instances.sort((a, b) => {
    if (a.zIndex < b.zIndex) return -1;
    if (a.zIndex > b.zIndex) return 1;
    return 0;
  });
}

function getTextureAtlasScale(config, scale) {
  let tas = config.textureAtlasScales.find((t) => approxEq(t.scale, scale));
  if (!tas) {
    tas = { scale, csfs: [] };
    config.textureAtlasScales.push(tas);
  }
  return tas;
}

function getTextureAtlasCSF(config, scale, csf) {
  const tas = getTextureAtlasScale(config, scale);
  let row = tas.csfs.find((c) => approxEq(c.csf, csf));
  if (!row) {
    row = { csf, sources: [], elements: new Map() };
    tas.csfs.push(row);
  }
  return row;
}

function updateTextureAtlasSources(csRow, atlasID, source) {
  let src = csRow.sources.find((s) => s.id === atlasID);
  if (!src) {
    src = { id: atlasID, source };
    csRow.sources.push(src);
  }
}

function readTextureAtlasTag(tagID, r, config) {
  const scale = r.readFloat();
  if (!config.scaleValues.some((s) => approxEq(s, scale))) config.scaleValues.push(scale);

  const tas = getTextureAtlasScale(config, scale);

  const atlasLength = r.readSByte();

  /** shared elements bag across csf rows for this atlas tag (matches PixiGAF merge behavior) */
  let sharedElements = null;
  if (tas.csfs.length > 0 && tas.csfs[0].elements) {
    sharedElements = tas.csfs[0].elements;
  }
  if (!sharedElements) {
    sharedElements = new Map();
  }

  for (let i = 0; i < atlasLength; i++) {
    const atlasID = String(r.readUint32());
    const sourceLength = r.readSByte();
    for (let j = 0; j < sourceLength; j++) {
      const source = r.readUTF();
      const csf = r.readFloat();
      if (!config.csfValues.some((c) => approxEq(c, csf))) config.csfValues.push(csf);
      const csRow = getTextureAtlasCSF(config, scale, csf);
      updateTextureAtlasSources(csRow, atlasID, source);
      csRow.elements = sharedElements;
    }
  }

  const elementsLength = r.readUint32();

  for (let i = 0; i < elementsLength; i++) {
    const pivotX = r.readFloat();
    const pivotY = r.readFloat();
    const topLeftX = r.readFloat();
    const topLeftY = r.readFloat();

    let elementScaleX = 1;
    let elementScaleY = 1;
    if (tagID === TAG_DEFINE_ATLAS || tagID === TAG_DEFINE_ATLAS2) {
      const s = r.readFloat();
      elementScaleX = elementScaleY = s;
    }

    const elementWidth = r.readFloat();
    const elementHeight = r.readFloat();
    const atlasID = String(r.readUint32());
    const elementAtlasID = String(r.readUint32());

    if (tagID === TAG_DEFINE_ATLAS2 || tagID === TAG_DEFINE_ATLAS3) {
      const hasScale9Grid = r.readBoolean();
      if (hasScale9Grid) r.skip(4 * 4);
    }

    let linkageName = '';
    if (tagID === TAG_DEFINE_ATLAS3) {
      elementScaleX = r.readFloat();
      elementScaleY = r.readFloat();
      const rotation = r.readBoolean();
      linkageName = r.readUTF();
      void rotation;
    }

    if (!sharedElements.has(elementAtlasID)) {
      sharedElements.set(elementAtlasID, {
        atlasID,
        elementAtlasID,
        region: {
          x: Math.trunc(topLeftX),
          y: Math.trunc(topLeftY),
          width: elementWidth,
          height: elementHeight
        },
        pivotX,
        pivotY,
        scaleX: elementScaleX,
        scaleY: elementScaleY,
        linkageName
      });
    }
  }
}

function readAnimationMasks(tagID, r, timeline) {
  const length = r.readUint32();
  for (let i = 0; i < length; i++) {
    const objectID = String(r.readUint32());
    const regionID = String(r.readUint32());
    const type =
      tagID === TAG_DEFINE_ANIMATION_MASKS ? TYPE_TEXTURE : getAnimationObjectTypeString(r.readUint16());
    timeline.animationObjects.set(objectID, { regionId: regionID, type, mask: true });
  }
}

function readAnimationObjects(tagID, r, timeline) {
  const length = r.readUint32();
  for (let i = 0; i < length; i++) {
    const objectID = String(r.readUint32());
    const regionID = String(r.readUint32());
    const type =
      tagID === TAG_DEFINE_ANIMATION_OBJECTS ? TYPE_TEXTURE : getAnimationObjectTypeString(r.readUint16());
    timeline.animationObjects.set(objectID, { regionId: regionID, type, mask: false });
  }
}

function skipAnimationSequences(r) {
  const length = r.readUint32();
  for (let i = 0; i < length; i++) {
    r.readUTF();
    r.skip(4);
  }
}

function skipNamedParts(r) {
  const length = r.readUint32();
  for (let i = 0; i < length; i++) {
    r.readUint32();
    r.readUTF();
  }
}

function readAnimationFrames(tagID, r, timeline) {
  const framesCount = r.readUint32();
  let prevFrame = null;

  function fillGap(prev, targetFrameNum) {
    let missed = prev.frameNumber + 1;
    while (missed < targetFrameNum) {
      timeline.frames.set(missed, cloneInstances(prev.instances));
      missed++;
    }
  }

  for (let idx = 0; idx < framesCount; idx++) {
    const frameNumber = r.readUint32();
    let hasChangesInDisplayList;
    let hasActions;
    if (tagID === TAG_DEFINE_ANIMATION_FRAMES) {
      hasChangesInDisplayList = true;
      hasActions = false;
    } else {
      hasChangesInDisplayList = r.readBoolean();
      hasActions = r.readBoolean();
    }

    /** @type {{frameNumber:number, instances:any[]}} */
    let currentFrame;
    if (prevFrame != null) {
      currentFrame = cloneFrame(prevFrame, frameNumber);
      fillGap(prevFrame, frameNumber);
    } else {
      currentFrame = { frameNumber, instances: [] };
      if (frameNumber > 1) {
        for (let missed = 1; missed < frameNumber; missed++) {
          timeline.frames.set(missed, []);
        }
      }
    }

    if (hasChangesInDisplayList) {
      const statesCount = r.readUint32();
      currentFrame.instances = [];
      for (let j = 0; j < statesCount; j++) {
        const hasColorTransform = r.readBoolean();
        const hasMask = r.readBoolean();
        const hasEffect = r.readBoolean();
        const stateID = String(r.readUint32());
        const zIndex = r.readInt32();
        const alpha = r.readFloat();

        const matrix = readMatrix6(r);

        if (hasColorTransform) r.skip(4 * 7);

        if (hasEffect) {
          const filterLength = r.readSByte();
          for (let k = 0; k < filterLength; k++) {
            const filterType = r.readUint32();
            skipFilterPayload(r, filterType);
          }
        }

        const maskId = hasMask ? String(r.readUint32()) : null;

        currentFrame.instances.push({
          objectId: stateID,
          zIndex,
          alpha,
          maskId,
          matrix
        });
      }
      sortInstances(currentFrame);
    }

    if (hasActions) {
      const count = r.readUint32();
      for (let a = 0; a < count; a++) {
        r.readUint32();
        r.readUTF();
        const paramsLength = r.readUint32();
        if (paramsLength > 0) r.skip(paramsLength);
      }
    }

    timeline.frames.set(frameNumber, currentFrame.instances);
    prevFrame = currentFrame;
  }

  if (prevFrame != null) {
    let missedFrameNumber = prevFrame.frameNumber + 1;
    while (missedFrameNumber <= timeline.framesCount) {
      timeline.frames.set(missedFrameNumber, cloneInstances(prevFrame.instances));
      missedFrameNumber++;
    }
  }
}

function readTimeline(r, cfg) {
  const timelineId = String(r.readUint32());
  const framesCount = r.readUint32();
  const bx = r.readFloat();
  const by = r.readFloat();
  const bw = r.readFloat();
  const bh = r.readFloat();
  const px = r.readFloat();
  const py = r.readFloat();
  const hasLinkage = r.readBoolean();
  const linkage = hasLinkage ? r.readUTF() : '';

  return createTimeline(cfg.versionMajor, cfg.versionMinor, timelineId, cfg.id, framesCount, { x: bx, y: by, width: bw, height: bh }, { x: px, y: py }, linkage);
}

function finalizeDefaults(cfg) {
  if (!cfg.scaleValues.length || !cfg.csfValues.length) {
    cfg.defaultElements = new Map();
    return;
  }

  const defaultScale = cfg.scaleValues[0];
  const defaultCSF = cfg.csfValues[0];
  cfg.defaultScale = defaultScale;
  cfg.defaultCSF = defaultCSF;

  const atlasScale = cfg.textureAtlasScales.find((t) => approxEq(t.scale, defaultScale));
  let elementsMap = new Map();
  if (atlasScale) {
    const csfRow = atlasScale.csfs.find((c) => approxEq(c.csf, defaultCSF));
    if (csfRow?.elements) elementsMap = csfRow.elements;
  }
  cfg.defaultElements = elementsMap;

  cfg.timelineById = new Map(cfg.timelines.map((t) => [String(t.id), t]));
}

/**
 * @param {Buffer} buffer
 * @param {string} assetId
 */
export function parseGafBinary(buffer, assetId = 'asset') {
  const r = new GafBytesReader(buffer);

  const compression = r.readUint32();
  const versionMajor = r.readSByte();
  const versionMinor = r.readSByte();
  const fileLength = r.readUint32();

  if (versionMajor > MAX_VERSION) {
    throw new Error(`Unsupported GAF version ${versionMajor}.${versionMinor} (max ${MAX_VERSION})`);
  }

  if ((compression >>> 0) === SIGNATURE_GAC) {
    throw new Error('GAF compressed format (GAC) is not supported by generate:gaf yet');
  }

  const cfg = {
    id: assetId,
    compression,
    versionMajor,
    versionMinor,
    fileLength,
    scaleValues: [],
    csfValues: [],
    timelines: [],
    textureAtlasScales: [],
    defaultScale: NaN,
    defaultCSF: NaN,
    defaultElements: new Map(),
    /** mirrors PixiGAF _isTimeline */
    insideTimeline: false
  };

  if (versionMajor < 4) {
    const framesCount = r.readUint16();
    const bx = r.readFloat();
    const by = r.readFloat();
    const bw = r.readFloat();
    const bh = r.readFloat();
    const px = r.readFloat();
    const py = r.readFloat();
    const tl = createTimeline(versionMajor, versionMinor, '0', assetId, framesCount, { x: bx, y: by, width: bw, height: bh }, { x: px, y: py }, '');
    cfg.timelines.push(tl);
    cfg.activeTimeline = tl;
    cfg.insideTimeline = true;
  } else {
    let l = r.readUint32();
    for (let i = 0; i < l; i++) cfg.scaleValues.push(r.readFloat());
    l = r.readUint32();
    for (let i = 0; i < l; i++) cfg.csfValues.push(r.readFloat());
    cfg.activeTimeline = null;
  }

  while (r.pos < buffer.length) {
    const tagID = r.readUint16();
    const tagLength = r.readUint32();

    switch (tagID) {
      case TAG_DEFINE_STAGE:
        readStageConfig(r);
        break;
      case TAG_DEFINE_ATLAS:
      case TAG_DEFINE_ATLAS2:
      case TAG_DEFINE_ATLAS3:
        readTextureAtlasTag(tagID, r, cfg);
        break;
      case TAG_DEFINE_ANIMATION_MASKS:
      case TAG_DEFINE_ANIMATION_MASKS2:
        if (!cfg.activeTimeline) throw new Error('Malformed GAF: animation masks before TAG_DEFINE_TIMELINE');
        readAnimationMasks(tagID, r, cfg.activeTimeline);
        break;
      case TAG_DEFINE_ANIMATION_OBJECTS:
      case TAG_DEFINE_ANIMATION_OBJECTS2:
        if (!cfg.activeTimeline) throw new Error('Malformed GAF: animation objects before TAG_DEFINE_TIMELINE');
        readAnimationObjects(tagID, r, cfg.activeTimeline);
        break;
      case TAG_DEFINE_ANIMATION_FRAMES:
      case TAG_DEFINE_ANIMATION_FRAMES2:
        if (!cfg.activeTimeline) throw new Error('Malformed GAF: animation frames before TAG_DEFINE_TIMELINE');
        readAnimationFrames(tagID, r, cfg.activeTimeline);
        break;
      case TAG_DEFINE_NAMED_PARTS:
        skipNamedParts(r);
        break;
      case TAG_DEFINE_SEQUENCES:
        skipAnimationSequences(r);
        break;
      case TAG_DEFINE_TEXT_FIELDS:
        r.skip(tagLength);
        break;
      case TAG_DEFINE_SOUNDS:
        r.skip(tagLength);
        break;
      case TAG_DEFINE_TIMELINE: {
        const tl = readTimeline(r, cfg);
        cfg.timelines.push(tl);
        cfg.activeTimeline = tl;
        cfg.insideTimeline = true;
        break;
      }
      case TAG_END:
        if (cfg.insideTimeline) {
          cfg.insideTimeline = false;
          cfg.activeTimeline = null;
        } else {
          r.pos = buffer.length;
        }
        break;
      default:
        r.skip(tagLength);
    }
  }

  finalizeDefaults(cfg);

  return cfg;
}
