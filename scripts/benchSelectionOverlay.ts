import { deepStrictEqual } from 'node:assert';
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { Container } from 'pixi.js';
import type { StageSceneState } from '../src/components/character-stage/types';
import type { DecorationLayer } from '../src/types/role';

const [baseline, sampleArg = '100'] = process.argv.slice(2);
const samples = Number(sampleArg);
if (!baseline || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error('Usage: node --import tsx scripts/benchSelectionOverlay.ts TRUSTED_V15_CHECKOUT [samples]');
}
type ControllerSync = typeof import('../src/components/character-stage/selectionControllerSync');
const pixiPath = JSON.stringify(import.meta.resolve('pixi.js'));
const stub = (source: string) => 'data:text/javascript,' + encodeURIComponent(source);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    // Replace only the two GPU/asset-dependent leaf factories in the real controller modules.
    if (context.parentURL?.endsWith('/selectionControllerSync.ts')) {
      if (specifier === './pixiVisuals') return { url: stub(`
        import { Container } from ${pixiPath};
        export function createDecorationVisual(deco) {
          const visual = new Container();
          visual.fixtureLayerId = deco.id;
          return visual;
        }
      `), shortCircuit: true };
      if (specifier === './stageOverlayVisuals') return { url: stub(`
        const filter = {};
        export function getCachedControllerGlowFilter() { return filter; }
      `), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});
const old = (await import(pathToFileURL(resolve(baseline, 'src/components/character-stage/selectionControllerSync.ts')).href)) as ControllerSync;
const current = await import('../src/components/character-stage/selectionControllerSync');
hooks.deregister();

function createScene(layers: readonly DecorationLayer[]) {
  const disguiseRoot = new Container();
  const decoDisplays = new Map(layers.map((layer) => {
    const container = new Container();
    container.position.set(layer.x, layer.y);
    container.getLocalBounds = () => ({ x: -4, y: -6, width: 8, height: 12 }) as ReturnType<Container['getLocalBounds']>;
    disguiseRoot.addChild(container);
    return [layer.id, { container }];
  }));
  const controller = new Container();
  const visuals = new Container();
  const graphic = {
    rect: null as number[] | null, fill: null as number[] | null, clears: 0,
    clear() { this.rect = null; this.fill = null; this.clears++; },
    beginFill(...fill: number[]) { this.fill = fill; },
    drawRect(...rect: number[]) { this.rect = rect; },
    endFill() {}
  };
  const scene = {
    disguiseRoot, decoDisplays, failedTextures: new Set(),
    selectionDragTargetId: null, selectionDragVisualKey: '',
    selectionDragController: controller,
    selectionDragControllerVisuals: visuals,
    selectionDragControllerGraphic: graphic,
    selectionDragVisualsById: new Map(),
    selectionDragVisualDisplayKeysById: new Map()
  };
  return { scene: scene as unknown as StageSceneState, controller, visuals, graphic, decoDisplays };
}
type Fixture = ReturnType<typeof createScene>;
function point({x,y}: {x:number; y:number}) { return [x,y]; }
function snapshot(fixture: Fixture) {
  const { scene, controller, graphic, visuals } = fixture;
  const area = controller.hitArea as { x: number; y: number; width: number; height: number } | null;
  return {
    target: scene.selectionDragTargetId, key: scene.selectionDragVisualKey,
    visible: controller.visible, eventMode: controller.eventMode, cursor: controller.cursor,
    position: point(controller.position), hitRect: area && [area.x, area.y, area.width, area.height],
    hasFilter: Boolean(controller.filters?.length), drawnRect: graphic.rect, fill: graphic.fill,
    layers: visuals.children.map((child) => {
      const visual = child as Container & { fixtureLayerId: string };
      return { id: visual.fixtureLayerId, position: point(visual.position), scale: point(visual.scale),
        rotation: visual.rotation, alpha: visual.alpha, visible: visual.visible, eventMode: visual.eventMode };
    })
  };
}

function makeLayers(count: number): DecorationLayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 'fixture-' + i, assetId: 'asset-' + i % 59, code: 'code-' + i % 59, name: 'Fixture',
    x: i % 503 - 251, y: i % 281 - 140, rotation: i % 360, scaleX: 1, scaleY: 1, opacity: 0.9, visible: true
  }));
}
function update(fixture: Fixture, version: ControllerSync, layers: DecorationLayer[], active = false) {
  const changedDisplay = fixture.decoDisplays.get(layers[0]?.id);
  if (changedDisplay) changedDisplay.container.position.set(layers[0].x, layers[0].y);
  version.syncSelectionDragController(fixture.scene, layers, active);
}
function stats(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  return { medianMs: +ordered[Math.ceil(ordered.length * .5) - 1].toFixed(4), p95Ms: +ordered[Math.ceil(ordered.length * .95) - 1].toFixed(4) };
}
for (const count of [32, 120, 121, 1000, 5000]) {
  const layers = makeLayers(count);
  const moved = [{ ...layers[0], x: layers[0].x - 35, y: layers[0].y + 10, rotation: 42, opacity: .73 }, ...layers.slice(1)];
  const first = createScene(layers), second = createScene(layers);
  // Newly allocated array per sync, as in stage filtering; unchanged records stay identical.
  const checks = [
    { list: layers }, { list: [...layers] }, { list: moved }, { list: [...moved] },
    { list: [...moved].reverse() }, { list: [{...layers[0], visible: false}, ...layers.slice(1)] },
    { list: layers, active: true }, { list: layers }, { list: [] }
  ];
  for (const { list, active } of checks) {
    update(first, old, list, active);
    update(second, current, list, active);
    deepStrictEqual(snapshot(second), snapshot(first));
  }
  for (const mode of ['stable', 'transform-miss'] as const) {
    const before = createScene(layers), after = createScene(layers);
    const previous: number[] = [], next: number[] = [];
    function measure(version: ControllerSync, fixture: Fixture, input: DecorationLayer[]) {
      const start = performance.now();
      version.syncSelectionDragController(fixture.scene, input, false);
      return performance.now() - start;
    }
    for (let i = -20; i < samples; i++) {
      const input = mode === 'transform-miss' && i % 2 !== 0 ? moved : layers;
      const left = [...input], right = [...input];
      if (count <= 120) {
        for (const fixture of [before, after]) fixture.decoDisplays.get(layers[0].id)!.container.position.set(input[0].x, input[0].y);
      }
      const a = i % 2 === 0 ? measure(old, before, left) : measure(current, after, right);
      const b = i % 2 === 0 ? measure(current, after, right) : measure(old, before, left);
      if (i >= 0) {
        previous.push(i % 2 === 0 ? a : b);
        next.push(i % 2 === 0 ? b : a);
      }
      // Reset counters after untimed warmups so reported graphics calls describe measured samples.
      if (i === -1) { before.graphic.clears = 0; after.graphic.clears = 0; }
    }
    deepStrictEqual(snapshot(after), snapshot(before));
    console.log(JSON.stringify({layers: count, mode, baseline: stats(previous), current: stats(next),
      graphicsClears: [before.graphic.clears, after.graphic.clears]}));
  }
}
console.log({node: process.version, samples, exactParity: '45 scenarios plus 10 timed final states'});
