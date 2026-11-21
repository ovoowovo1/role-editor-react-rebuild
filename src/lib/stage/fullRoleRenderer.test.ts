import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeDecorationLayer, makeRoleDocument } from '../../test/roleFixtures';
import { createBatchRoleCapture } from './fullRoleRenderer';

const mocked = vi.hoisted(() => {
  const calls = {
    normalize: vi.fn(),
    collectUrls: vi.fn(),
    partition: vi.fn(),
    load: vi.fn(),
    weapon: vi.fn(),
    buildApp: vi.fn(),
    render: vi.fn(),
    destroy: vi.fn(),
    encode: vi.fn(),
    getImageData: vi.fn()
  };
  class StubDisplay {
    children: StubDisplay[] = [];
    scale = { set: vi.fn() };
    position = { set: vi.fn() };
    visible = true;
    addChild(...children: StubDisplay[]) { this.children.push(...children); }
    gotoAndStop() { /* no-op */ }
  }
  return { ...calls, StubDisplay };
});

vi.mock('pixi.js', () => ({
  Assets: { load: mocked.load },
  Container: mocked.StubDisplay,
  Sprite: mocked.StubDisplay,
  Graphics: mocked.StubDisplay,
  Application: class {
    stage = new mocked.StubDisplay();
    view: { width: number; height: number; toDataURL: typeof mocked.encode };
    renderer = { render: mocked.render };
    destroy = mocked.destroy;
    constructor(options: { width: number; height: number }) {
      mocked.buildApp(this, options);
      this.view = { width: options.width, height: options.height, toDataURL: mocked.encode };
    }
  }
}));

vi.mock('../runtime/actorClipAdapter', () => ({ ACTOR_BODY_SCALE: 1 }));
vi.mock('../runtime/actorClip', () => ({
  ActorClip: class extends mocked.StubDisplay {
    body = new mocked.StubDisplay();
    footContainer = new mocked.StubDisplay();
    headClip = { clip: new mocked.StubDisplay(), setFrame() {}, setDisguise() {} };
    capeClip = { clip: new mocked.StubDisplay(), setFrame() {} };
    rightFoot = { clip: new mocked.StubDisplay(), setFrame() {} };
    leftFoot = { clip: new mocked.StubDisplay(), setFrame() {} };
    rightHand = { clip: new mocked.StubDisplay(), setFrame() {} };
    leftHand = { clip: new mocked.StubDisplay(), setFrame() {} };
  }
}));
vi.mock('../runtime/gafMovieClip', () => ({ createActorGafClip: () => new mocked.StubDisplay() }));
vi.mock('../runtime/gafRuntimeManifest', () => ({ actorRuntimeManifest: {} }));
vi.mock('./decorationVisual', () => ({ createDecorationVisual: () => new mocked.StubDisplay() }));
vi.mock('../../mock/options', () => ({ getBodyPartOption: () => undefined }));
vi.mock('../../mock/gafManifest', () => ({ actorAtlasFrames: {}, gafSources: { actorTexture: 'actor' } }));
vi.mock('../serialization/roleSerializationImport', () => ({ normalizeImportedRole: mocked.normalize }));
vi.mock('../runtime/atlasTextureAvailability', () => ({
  collectAtlasTextureUrlsForRole: mocked.collectUrls,
  partitionAtlasTextureUrls: mocked.partition
}));
vi.mock('../runtime/weaponAtlasAvailability', () => ({
  prepareWeaponAtlasForAnimation: mocked.weapon,
  recordWeaponAtlasResult(failed: Set<string>, ready: boolean) {
    if (ready) failed.delete('weapon');
    else failed.add('weapon');
  }
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocked.normalize.mockImplementation((role) => ({ role, warnings: ['warning'] }));
  mocked.collectUrls.mockImplementation((role) => role.decorations.map(({ assetId }: { assetId: string }) => assetId));
  mocked.partition.mockImplementation(async (urls: string[]) => ({ failed: new Set<string>(), ok: new Set(urls) }));
  mocked.load.mockResolvedValue(undefined);
  mocked.weapon.mockReturnValue(null);
  mocked.encode.mockReturnValue('data:image/png;base64,rendered');
  mocked.getImageData.mockImplementation((_x, _y, width, height) => ({ width, height, data: Uint8ClampedArray.of(12, 34, 56, 255) }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal('document', { createElement: () => ({
    getContext: () => ({ drawImage() {}, getImageData: mocked.getImageData })
  }) });
});

afterEach(() => vi.unstubAllGlobals());

it('normalizes and collects atlas URLs once per batch while rendering each mode in its own app', async () => {
  const role = makeRoleDocument({ decorations: [makeDecorationLayer('asset')] });
  const capture = createBatchRoleCapture(role);
  const options = { width: 1, height: 1, background: '#123456' };
  await expect(capture(options, 'both')).resolves.toEqual({
    dataUrl: 'data:image/png;base64,rendered',
    imageData: { width: 1, height: 1, data: Uint8ClampedArray.of(12, 34, 56, 255) },
    width: 1, height: 1, warnings: ['warning'], missingTextureCount: 0
  });
  for (const part of ['head', 'hand', 'foot', 'cape'] as const) {
    await expect(capture({ ...options, debug: { hideParts: [part] } }, 'pixels'))
      .resolves.toMatchObject({ dataUrl: '', imageData: { data: Uint8ClampedArray.of(12, 34, 56, 255) } });
  }
  await capture({ ...options, debug: { hideDecorations: true } }, 'pixels');
  expect(mocked.normalize).toHaveBeenCalledExactlyOnceWith(role);
  expect(mocked.collectUrls).toHaveBeenCalledExactlyOnceWith(role);
  expect(mocked.partition.mock.calls).toEqual(Array.from({ length: 6 }, () => [['asset']]));
  expect(mocked.load).toHaveBeenCalledTimes(6);
  expect(new Set(mocked.buildApp.mock.calls.map(([app]) => app)).size).toBe(6);
  expect(mocked.buildApp.mock.calls[0][1]).toMatchObject({ width: 1, height: 1, background: 0x123456 });
  expect(mocked.render).toHaveBeenCalledTimes(12);
  expect(mocked.destroy).toHaveBeenCalledTimes(6);
  expect(mocked.encode).toHaveBeenCalledTimes(1);
  expect(mocked.getImageData).toHaveBeenCalledTimes(6);

  await createBatchRoleCapture(role)(options, 'png');
  expect(mocked.normalize).toHaveBeenCalledTimes(2);
  expect(mocked.collectUrls).toHaveBeenCalledTimes(2);
});

it('retains ordinary failures, per-capture weapon retry, and load-error propagation', async () => {
  const role = makeRoleDocument({ decorations: [makeDecorationLayer('missing'), makeDecorationLayer('ok')] });
  mocked.partition.mockImplementation(async () => ({ failed: new Set(['missing']), ok: new Set(['ok']) }));
  mocked.weapon.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const capture = createBatchRoleCapture(role);
  const options = { bodyAnimationLabel: 'weapon-animation' };

  await expect(capture(options, 'png')).resolves.toMatchObject({ missingTextureCount: 2 });
  await expect(capture(options, 'png')).resolves.toMatchObject({ missingTextureCount: 1 });
  mocked.load.mockRejectedValueOnce(new Error('Atlas loading failed'));
  await expect(capture(options, 'png')).rejects.toThrow('Atlas loading failed');
  expect(mocked.buildApp).toHaveBeenCalledTimes(2);
  await expect(createBatchRoleCapture(role)(options, 'png')).resolves.toMatchObject({ missingTextureCount: 1 });
  expect(mocked.load.mock.calls).toEqual(Array.from({ length: 4 }, () => [['ok']]));
  expect(mocked.weapon.mock.calls).toEqual(Array.from({ length: 4 }, () => ['weapon-animation']));
  expect(mocked.normalize).toHaveBeenCalledTimes(2);
});
