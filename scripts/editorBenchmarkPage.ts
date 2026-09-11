import { createDefaultRole, partOptions } from '../src/mock/options';
import { cloneRole, syncGroups, touch } from '../src/lib/editor/editorRoleUtils';
import { applyTransformUpdate } from '../src/lib/editor/editorTransformUpdates';
import { nudgeSelectedRole, applySingleTransformPatchToSelectedRole } from '../src/lib/editor/editorGroupTransformCommands';
import { captureDecorationTransforms } from '../src/lib/editor/editorTransformHistory';
import { resolveLocalUndo, resolveLocalRedo } from '../src/lib/editor/editorHistoryCommands';
import type { RoleDocument } from '../src/types/role';

// Deliberately outside src: globals and controls exist only in benchmark builds.
const bench = globalThis as any;
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const summary = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return { median: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], samples };
};
function fixture(count: number): RoleDocument {
  const role = createDefaultRole();
  const option = partOptions.deco.find(option => option.atlas) ?? partOptions.deco[0];
  role.decorations = Array.from({ length: count }, (_, i) => ({
    id: `bench-${i}`, code: option.code, assetId: option.id, name: `Layer ${i}`,
    x: (i % 20) * 2 - 20, y: (Math.floor(i / 20) % 20) * 2 - 20,
    scaleX: .2, scaleY: .2, rotation: 0, visible: true, opacity: 1
  }));
  role.groups = [{ id: 'bench-group', name: 'Benchmark group', itemIds: role.decorations.slice(0, 20).map(d => d.id), visible: true, collapsed: false }];
  role.headLayerIndex = count;
  return role;
}

async function settled(predicate: () => boolean) {
  const deadline = performance.now() + 15000;
  do {
    await frame();
    if (predicate()) return;
  } while (performance.now() < deadline);
  throw new Error('Benchmark stage did not reach expected state.');
}
async function operation(run: () => void, selectionOnly = false) {
  const previousRole = bench.__benchEditor.role;
  const previousSelection = JSON.stringify(bench.__benchEditor.selectedDecorationIds);
  const start = performance.now();
  run();
  await settled(() => {
    const editor = bench.__benchEditor;
    const rendered = bench.__benchRendered;
    return rendered?.time >= start && (selectionOnly
      ? JSON.stringify(rendered.selection) === JSON.stringify(editor.selectedDecorationIds) && JSON.stringify(editor.selectedDecorationIds) !== previousSelection
      : rendered.role === editor.role && editor.role !== previousRole);
  });
  const end = bench.__benchRendered.time;
  // Drain pending history/selection restoration outside the measured interval.
  await frame(); await frame();
  return end - start;
}

bench.__runEditorBenchmark = async (count: number, scenarios = ['position', 'scale', 'multi-position', 'selection', 'undo', 'redo', 'drag-commit']) => {
  const role = fixture(count);
  const selected = role.decorations.slice(0, 20).map(d => d.id);
  const data: Record<string, ReturnType<typeof summary>> = {};
  const updateTransform = applyTransformUpdate;
  for (const scenario of ['position', 'scale', 'multi-position', 'undo-redo']) {
    let current = role;
    const target = captureDecorationTransforms(role, selected);
    const changed = nudgeSelectedRole(role, selected, 1, 0);
    let history = { nextRole: changed, localPast: [{ kind: 'transform' as const, target, selectionIds: selected }], localFuture: [] as any[] };
    const samples: number[] = [];
    for (let round = -1; round < 5; round++) {
      for (let i = 0; i < 30; i++) {
        // Batch to avoid sub-millisecond timer quantization; report per operation.
        const start = performance.now();
        for (let j = 0; j < 30; j++) {
          const sign = j % 2 ? -1 : 1;
          if (scenario === 'undo-redo') history = (j % 2
            ? resolveLocalRedo(history.nextRole, history.localPast, history.localFuture)
            : resolveLocalUndo(history.nextRole, history.localPast, history.localFuture)) as typeof history;
          else current = updateTransform(current, r => scenario === 'scale'
            ? applySingleTransformPatchToSelectedRole(r, ['bench-0'], { scale: j % 2 ? .2 : .3 })
            : nudgeSelectedRole(r, scenario === 'position' ? ['bench-0'] : selected, sign, 0));
        }
        if (round >= 0) samples.push((performance.now() - start) / 30);
      }
    }
    data[scenario] = summary(samples);
  }
  const ui: Record<string, unknown> = {};
  for (const scenario of scenarios) {
    console.log(`BENCH: ${count} ${scenario}`);
    await operation(() => bench.__benchEditor.importRole(fixture(count)));
    await operation(() => bench.__benchEditor.selectMultipleDecorations(scenario === 'multi-position' || scenario === 'drag-commit' ? selected : ['bench-0']), true);
    const samples: number[] = [];
    const longTasks: number[] = [];
    const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration)));
    observer.observe({ type: 'longtask', buffered: false });
    for (let round = -1; round < 5; round++) {
      for (let i = 0; i < 30; i++) {
        if (scenario === 'undo' || scenario === 'redo') {
          await operation(() => bench.__benchEditor.nudgeSelected(i % 2 ? -1 : 1, 0));
          if (scenario === 'redo') await operation(() => bench.__benchEditor.undo());
        }
        const elapsed = await operation(() => {
          const editor = bench.__benchEditor;
          if (scenario === 'selection') editor.selectMultipleDecorations(i % 2 ? ['bench-0'] : selected);
          else if (scenario === 'scale') editor.updateSelectedTransform({ scale: i % 2 ? .2 : .3 }, true);
          else if (scenario === 'undo') editor.undo();
          else if (scenario === 'redo') editor.redo();
          else if (scenario === 'drag-commit') editor.commitDrag(selected, i % 2 ? -1 : 1, 0);
          else editor.nudgeSelected(i % 2 ? -1 : 1, 0);
        }, scenario === 'selection');
        if (round >= 0) samples.push(elapsed);
      }
    }
    observer.disconnect();
    ui[scenario] = { ...summary(samples), longTasks, note: 'Long tasks include warmup, preparation and settling; latency ends at renderer postrender, not physical display presentation.' };
  }
  return { count, data, ui };
};
