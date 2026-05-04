import { Container, Matrix, Rectangle, Sprite, Texture } from 'pixi.js';
import type {
  ActorGafRuntimeManifest,
  GafElementSerialized,
  GafFrameInstanceSerialized,
  GafTimelineSerialized
} from '../types/gafRuntime';
import type { GafAtlasFrame } from '../types/role';
import { applyGafAtlasToSprite } from './gafAtlasSprite';

const TYPE_TEXTURE = 'texture';
const TYPE_TIMELINE = 'timeline';

export type GafMovieClipSpec =
  | { kind: 'atlas'; frames: readonly GafAtlasFrame[] }
  | { kind: 'timeline'; manifest: ActorGafRuntimeManifest; timelineId: string; textureUrl: string };

function clamp01(a: number): number {
  if (!Number.isFinite(a)) return 1;
  return Math.min(Math.max(a, 0), 1);
}

function elementPivotMatrix(el: GafElementSerialized): Matrix {
  const sx = Math.abs(el.scaleX) > 1e-8 ? el.scaleX : 1;
  const sy = Math.abs(el.scaleY) > 1e-8 ? el.scaleY : 1;
  return new Matrix(1 / sx, 0, 0, 1 / sy, -el.pivotX / sx, -el.pivotY / sy);
}

function instanceMatrix(m: GafFrameInstanceSerialized['matrix']): Matrix {
  return new Matrix(m.a, m.b, m.c, m.d, m.tx, m.ty);
}

function composeWorldMatrix(instance: Matrix, pivot: Matrix): Matrix {
  const world = new Matrix();
  world.copyFrom(pivot);
  world.prepend(instance);
  return world;
}

function applyMatrixToDisplayObject(target: Container, m: Matrix): void {
  const tf = target.transform as typeof target.transform & { setFromMatrix?: (matrix: Matrix) => void };
  if (tf.setFromMatrix) {
    tf.setFromMatrix(m);
  } else {
    target.position.set(m.tx, m.ty);
    target.rotation = Math.atan2(m.b, m.a);
    target.scale.set(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  }
}

export function resolveActorTimelineId(manifest: ActorGafRuntimeManifest, linkageOrId: string): string | null {
  const fromLinkage = manifest.timelinesByLinkage[linkageOrId];
  if (fromLinkage != null && fromLinkage !== '') return fromLinkage;
  if (manifest.timelinesById[linkageOrId]) return linkageOrId;
  return null;
}

/** Prefer serialized GAF runtime; fall back to single-atlas sprites (CI / missing binaries). */
export function createActorGafClip(
  failedTextures: Set<string>,
  linkage: string,
  manifest: ActorGafRuntimeManifest | undefined,
  textureUrl: string,
  atlasFallback: readonly GafAtlasFrame[]
): GafMovieClip {
  if (manifest) {
    const id = resolveActorTimelineId(manifest, linkage);
    if (id) {
      return new GafMovieClip(failedTextures, {
        kind: 'timeline',
        manifest,
        timelineId: id,
        textureUrl
      });
    }
  }
  return new GafMovieClip(failedTextures, { kind: 'atlas', frames: atlasFallback });
}

/**
 * Mirrors TWLibLib GAFMovieClip usage (gotoAndStop / scale / visibility).
 *
 * When `timelines/manifest.json` exposes `actorRuntime`, actor parts route through the
 * `timeline` spec; older manifests only carry `kind: atlas` fallback frames.
 */
export class GafMovieClip extends Container {
  private readonly _failedTextures: Set<string>;
  private readonly _spec: GafMovieClipSpec;

  private _atlasFrames: readonly GafAtlasFrame[] = [];
  private _sprite: Sprite | null = null;

  private _manifest: ActorGafRuntimeManifest | null = null;
  private _timeline: GafTimelineSerialized | null = null;
  private _textureUrl = '';

  private _currentFrame = 1;
  loop = true;

  constructor(failedTextures: Set<string>, spec: GafMovieClipSpec) {
    super();
    this._failedTextures = failedTextures;
    this._spec = spec;
    if (spec.kind === 'atlas') {
      this._atlasFrames = spec.frames;
      if (spec.frames.length > 0) this.gotoAndStop(1);
      return;
    }
    this._manifest = spec.manifest;
    this._textureUrl = spec.textureUrl;
    this._timeline = spec.manifest.timelinesById[spec.timelineId] ?? null;
    if (!this._timeline) {
      console.warn(`[GafMovieClip] Unknown timeline "${spec.timelineId}"`);
      return;
    }
    if (this._timeline.framesCount > 0) this.gotoAndStop(1);
  }

  get currentFrame(): number {
    return this._currentFrame;
  }

  get frame(): number {
    return this._currentFrame;
  }

  get totalFrames(): number {
    if (this._spec.kind === 'atlas') return this._atlasFrames.length;
    return this._timeline?.framesCount ?? 0;
  }

  gotoAndStop(frame: number): void {
    this._currentFrame = this._clampFrame(frame);
    if (this._spec.kind === 'atlas') {
      this._renderAtlasFrame();
      return;
    }
    this._renderTimelineFrame();
  }

  gotoAndPlay(frame: number): void {
    this.gotoAndStop(frame);
  }

  stop(): void {}

  play(): void {}

  private _clampFrame(frame: number): number {
    const numeric = typeof frame === 'number' ? frame : Number(frame);
    if (!Number.isFinite(numeric) || numeric <= 0) return 1;
    const rounded = Math.round(numeric);
    if (this._spec.kind === 'atlas') {
      if (this._atlasFrames.length === 0) return rounded;
      return Math.max(1, Math.min(this._atlasFrames.length, rounded));
    }
    const fc = this._timeline?.framesCount ?? 0;
    if (fc <= 0) return Math.max(1, rounded);
    return Math.max(1, Math.min(fc, rounded));
  }

  private _destroyLayerChildren(): void {
    while (this.children.length > 0) {
      const child = this.removeChild(this.children[0]);
      if (!child.destroyed) {
        child.destroy({ children: true });
      }
    }
    this._sprite = null;
  }

  private _renderAtlasFrame(): void {
    if (this._sprite) {
      this.removeChild(this._sprite);
      if (!this._sprite.destroyed) {
        this._sprite.destroy({ children: false });
      }
      this._sprite = null;
    }

    const atlas = this._atlasFrames[this._currentFrame - 1];
    if (!atlas) return;
    if (this._failedTextures.has(atlas.texture)) return;

    const baseTexture = Texture.from(atlas.texture).baseTexture;
    const texture = new Texture(baseTexture, new Rectangle(atlas.x, atlas.y, atlas.width, atlas.height));
    const sprite = new Sprite(texture);
    applyGafAtlasToSprite(sprite, atlas);
    this.addChild(sprite);
    this._sprite = sprite;
  }

  private _renderTimelineFrame(): void {
    this._destroyLayerChildren();
    const tl = this._timeline;
    const manifest = this._manifest;
    if (!tl || !manifest) return;

    const key = String(this._currentFrame);
    const raw = tl.frames[key] ?? [];
    const insts = [...raw].sort((a, b) => a.zIndex - b.zIndex);

    for (const inst of insts) {
      const ao = tl.animationObjects[inst.objectId];
      if (!ao || ao.mask) continue;

      if (ao.type === TYPE_TEXTURE) {
        const el = manifest.elements[ao.regionId];
        if (!el) continue;
        if (this._failedTextures.has(this._textureUrl)) continue;

        const sprite = this._makeTextureSprite(el);
        if (!sprite) continue;
        sprite.alpha = clamp01(inst.alpha);

        const world = composeWorldMatrix(instanceMatrix(inst.matrix), elementPivotMatrix(el));
        applyMatrixToDisplayObject(sprite, world);
        this.addChild(sprite);
        continue;
      }

      if (ao.type === TYPE_TIMELINE) {
        const nestedId = ao.regionId;
        if (!manifest.timelinesById[nestedId]) continue;

        const nested = new GafMovieClip(this._failedTextures, {
          kind: 'timeline',
          manifest,
          timelineId: nestedId,
          textureUrl: this._textureUrl
        });
        nested.gotoAndStop(this._currentFrame);
        nested.alpha = clamp01(inst.alpha);
        applyMatrixToDisplayObject(nested, instanceMatrix(inst.matrix));
        this.addChild(nested);
      }
    }
  }

  private _makeTextureSprite(el: GafElementSerialized): Sprite | null {
    try {
      const baseTexture = Texture.from(this._textureUrl).baseTexture;
      const tex = new Texture(
        baseTexture,
        new Rectangle(el.region.x, el.region.y, el.region.width, el.region.height)
      );
      const sprite = new Sprite(tex);
      sprite.anchor.set(0, 0);
      return sprite;
    } catch {
      return null;
    }
  }
}
