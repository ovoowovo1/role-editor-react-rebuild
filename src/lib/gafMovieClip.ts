import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { GafAtlasFrame } from '../types/role';
import { applyGafAtlasToSprite } from './gafAtlasSprite';

/**
 * GafMovieClip mirrors the subset of `GAFMovieClip` API used by the original
 * RoleEditor preview (gotoAndStop / currentFrame / scale / visible).
 *
 * Each frame renders a single atlas Sprite cropped from the shared GAF PNG.
 * The rebuild does not ship a full GAF timeline runtime, so animation/walk
 * states are intentionally no-ops; this is enough to match the editor, which
 * only uses gotoAndStop plus the first frame of footContainer.
 */
export class GafMovieClip extends Container {
  private readonly _frames: readonly GafAtlasFrame[];
  private readonly _failedTextures: Set<string>;
  private _sprite: Sprite | null = null;
  private _currentFrame = 1;

  loop = true;

  constructor(frames: readonly GafAtlasFrame[], failedTextures: Set<string>) {
    super();
    this._frames = frames;
    this._failedTextures = failedTextures;
    if (frames.length > 0) {
      this.gotoAndStop(1);
    }
  }

  get currentFrame(): number {
    return this._currentFrame;
  }

  get frame(): number {
    return this._currentFrame;
  }

  get totalFrames(): number {
    return this._frames.length;
  }

  gotoAndStop(frame: number): void {
    this._currentFrame = this._clampFrame(frame);
    this._renderFrame();
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
    if (this._frames.length === 0) return rounded;
    return Math.max(1, Math.min(this._frames.length, rounded));
  }

  private _renderFrame(): void {
    if (this._sprite) {
      this.removeChild(this._sprite);
      if (!this._sprite.destroyed) {
        this._sprite.destroy();
      }
      this._sprite = null;
    }

    const atlas = this._frames[this._currentFrame - 1];
    if (!atlas) return;
    if (this._failedTextures.has(atlas.texture)) return;

    const baseTexture = Texture.from(atlas.texture).baseTexture;
    const texture = new Texture(
      baseTexture,
      new Rectangle(atlas.x, atlas.y, atlas.width, atlas.height)
    );
    const sprite = new Sprite(texture);
    applyGafAtlasToSprite(sprite, atlas);
    this.addChild(sprite);
    this._sprite = sprite;
  }
}
