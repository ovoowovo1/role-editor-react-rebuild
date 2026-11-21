# Editor browser benchmark (opt-in)

Run from the repository root on a machine with Node 22, installed dependencies and Playwright Chromium. A previously installed local Chromium executable can be supplied through the optional `EDITOR_BENCH_CHROMIUM` environment variable.

```bash
npm run build
npx playwright test --config playwright.benchmark.config.ts
```

The benchmark opens the production build on loopback (port 4174), blocks external HTTP(S) in the test context, and needs no login, credentials or deployed backend. It is not part of the default E2E suite. JSON is printed and attached to the Playwright result.

It performs three fresh browser-context runs. Each reports time from navigation start until the canvas first has visible geometry (a **proxy**, not first drawn pixels), observed local resource size before that mark, 1 second of idle animation-frame gaps after importing 5,000 layers, and frame gaps and long tasks during a single-layer transform slider drag and brief settling window. The benchmark verifies the transform actually changed and Undo restored the original value. This is not a GPU/FPS measurement or a canvas drag benchmark. Compare on the same machine and Chromium configuration; no performance threshold is enforced.

## Ablation preparation (Node CPU)

```bash
node --import tsx scripts/benchAblationPreparation.ts 1000 5000
```

Uses deterministic modern and legacy input to compare six independent normalizations and role-atlas URL collections with reusing one prepared result across six render modes. It checks normalized data (excluding only generated timestamps), warnings and ordered atlas URLs for parity. Timings exclude actual image probes, downloads, Pixi rendering, pixel capture, PNG encoding and any browser effects. No login, Chromium or deployed service is needed.

## Palette alpha-threshold reuse (Node CPU)

```bash
node --import tsx scripts/benchPaletteThresholds.ts 128
```

Compares the previous exact RGBA scan with the production alpha-bucket functions. Deterministic synthetic sprite pixels include transparent margins, fully opaque areas and varied partial alpha. Checks RGB/sample-count parity even at fractional and out-of-range thresholds, and separately reports the initial raw scan, the second distinct threshold (which builds buckets from retained pixels), three more new thresholds with buckets available, and the complete five-threshold sequence from cold. Each result contains CPU medians/p95. Canvas readbacks are an operation-count model for resident, stable palette options under the cache limit, not timings or browser measurements. Already-derived same-threshold hits existed before this change and are excluded; neither path measures atlas decoding, Canvas draw/readback, UI responsiveness or full image conversion.

## GAF decoration geometry cache (Node CPU)

```bash
node --import tsx scripts/benchGafGeometry.ts 5000
```

Uses the real generated decoration manifest, its authored scale and canonical timeline IDs. Checks painter order, element ID, alpha and all affine transform fields against the previous resolver for every catalog decoration. First access measures one sweep of the catalog in independent fresh Node processes; process startup and asset module import are outside the timer. Repeated and catalog-mixed layer sequences measure warm geometry lookup at 5,000 layers by default. This isolates renderer-neutral geometry once available to Pixi; it is not a measurement of GPU draw calls, load time, memory, or browser FPS.

## Decoration visibility structural sharing (Node CPU)

```bash
node --import tsx scripts/benchDecorationVisibility.ts 5000
```

Compares the previous command's full role clone + visibility update with the current production helpers. The fixture covers a single toggle, sparse hide, dense hide and already-visible no-op. Checks exact resulting role and history patch values, unchanged group identity and the number of replaced decoration records. Reports timings for role mutation alone and mutation plus history patch creation, excluding React reconciliation, Pixi updates and browser rendering.

## Decoration insertion vs v10 (Node CPU)

```bash
node --import tsx scripts/benchDecorationInsertion.ts /path/to/extracted/v10/role-editor-react-rebuild 5000
```

Compares the exact insertion helper from the delivered v10 source with the current helper using real atlas-symbol types, one layer, 20 layers, and 2,000 layers at top, bottom, or either side of HEAD. Checks role parity (excluding only generated timestamps), inserted and preserved layer object identity, colliding IDs, reserved HEAD aliases, malformed placement indexes, and no-op insertion. Reports isolated Node mutation cost, not browser interaction or GPU performance. Use a trusted v10 source checkout; the benchmark imports its local insertion module.

## Exact palette matcher vs v11 (Node CPU)

```bash
node --import tsx scripts/benchPaletteMatching.ts /path/to/extracted/v11/role-editor-react-rebuild 5000
```

Compares the actual matcher from the delivered v11 source with the current production matcher across all seven color algorithms. The fixture uses the real catalog size and production color-space derivation from deterministic synthetic RGB; a one-pixel Canvas shim is used in setup only. The timed work is matching alone, not Canvas or image conversion. It reports distinct RGB, repeated direct matching, and repeated colors with the converter's existing RGB memo (only 32 scans). It also checks exact winning object references and first-palette-entry tie order. Use a trusted local baseline because the benchmark imports its matcher module.

## Group collapse/rename vs v12 (Node CPU)

```bash
node --import tsx scripts/benchGroupMetadata.ts /path/to/extracted/v12/role-editor-react-rebuild 5000
```

Compares the v12 clone/mutate/normalize command with the current production group-metadata helper on a 5,000-layer role with 125 groups, three nesting levels and HEAD in the root group. It verifies identical role and base-history patch values (excluding generated timestamps), Undo/Redo and no-op outcomes, plus reuse of the existing decoration array. It measures normalization alone and with the applicable equality and history codec operations, not React or browser rendering. Use a trusted local v12 source because the benchmark imports it.

## Group visibility vs v13 (Node CPU)

```bash
node --import tsx scripts/benchGroupVisibility.ts /path/to/extracted/v13/role-editor-react-rebuild 1001
```

Runs sparse leaf and dense root visibility edits on 5,000 layers with nested groups, with and without HEAD. Pass `125` for the smaller group fixture; the optional fourth argument is the sample count (default 60 per path). Compares exact resulting role, history patch, Undo and Redo against the delivered v13 source (excluding generated timestamps). Also checks duplicate groups, cycles, legacy members and missing groups. Reports median and p95 milliseconds plus replaced decoration record counts. Includes command routing, and separately measures the applicable equality/history codec; excludes React, Pixi and GPU rendering. Use a trusted local v13 baseline because this script imports its modules.

## Group normalization via visibility edits vs v14 (Node CPU)

```bash
node --import tsx scripts/benchGroupVisibility.ts /path/to/extracted/v14/role-editor-react-rebuild 125 60 v14
node --import tsx scripts/benchGroupVisibility.ts /path/to/extracted/v14/role-editor-react-rebuild 1001 60 v14
```

The `v14` mode uses the delivered v14 production visibility helpers, rather than the pre-v14 ordinary command. It also checks exact normalization of 20,000 seeded malformed inputs (including duplicate IDs, cycles, missing members and legacy group records). Normal and HEAD command measurements and history assertions are the same as above; it additionally times the normalization helper alone on the same role. The baseline imports executable modules, so only use a trusted local copy.

## Selection overlay sync vs v15 (Node / Pixi CPU)

```bash
node --import tsx scripts/benchSelectionOverlay.ts /path/to/extracted/v15/role-editor-react-rebuild 300
```

Imports the actual overlay sync from both trees and uses real Pixi containers without a renderer. Two leaf factories (asset visuals and glow shader) and the graphics drawing surface are stubbed. Checks exact controller state, hit rectangles, draw arguments, and visual order and transforms across 32–5,000 selections, including the 120/121 boundary, reordering, visibility changes, active drag and clearing. Reports median/p95 for stable ordered layer references and alternating one-layer transform edits (cache misses), with fresh selection arrays each time. Graphics clear counts show whether the overlay was redrawn. This is not a browser, GPU, or drag FPS measurement. Use a trusted local baseline and Node 22.18+; it imports source modules directly.

## Legacy thumbnail MD5 vs v16 (Node CPU)

```bash
node --import tsx scripts/benchLegacyThumbnailHash.ts /path/to/extracted/v16/role-editor-react-rebuild 120
```

Compares the actual two MD5 implementations over complete 256×256 RGBA PNG data URLs (header and Base64 text included). Generates three valid deterministic PNG fixtures, from small to high entropy, outside the timer. Checks both implementations against Node crypto for the fixtures and general UTF-8 and MD5 block-boundary inputs. Reports isolated hash CPU median/p95, not PNG encoding, thumbnail rendering or full export speed. Only use a trusted baseline, since its source is imported.

## Actor runtime packing vs v17 (build bytes and Node CPU)

Build both trees separately with `npx vite build --manifest` (using their installed, locked dependencies), then run:

```bash
node --import tsx scripts/benchActorRuntimePacking.ts /path/to/extracted/v17/role-editor-react-rebuild /path/to/v17/dist dist
```

Checks exact actor metadata and all authored frame instances (order, encoded alpha/mask/color and six matrix values), plus unchanged decoration and weapon manifests. Reports individual gzip sums for static JS/CSS dependencies and emitted runtime payloads, and isolates source JSON parsing and full actor frame reads in Node. JSON parsing is not browser chunk startup timing, and a full cold sweep is a worst-case diagnostic, not the normal one-animation access pattern. Only use a trusted local v17 checkout because the script imports its decoder.

## Brush Fill coverage vs v18 (Node CPU)

```bash
node --import tsx scripts/benchBrushFillCoverage.ts /path/to/extracted/v18/role-editor-react-rebuild 35
```

Runs the actual Brush Fill conversion with a selected atlas decoration (no palette or browser involved). Compares a single stamp, fractional and tangent circles, a dense painting, widely separated strokes, mixed narrow/wide brushes at editor scale and stress scale, and a dense wide-radius case. Adds 310 deterministic randomized cases including fractional/tangent, mixed-radius, dense and layer-cap boundaries. Checks exact row-major decorations, sample counts, truncation warnings and unchanged mask input, ignoring only independently generated decoration IDs. CPU timings include decoration construction but exclude browser canvas/Pixi work. Use a trusted local v18 baseline because the script imports its source.

## Base appearance updates vs v19 (Node CPU)

```bash
node --import tsx scripts/benchRoleAppearanceUpdates.ts /path/to/extracted/v19/role-editor-react-rebuild 80
```

Compares camp, gender and body-part edits for a 5,000-layer role with no groups, 125 normalized groups, or stale legacy groups. Models the hook's role update, equality check and base history patch without mounting React; verifies exact role, no-op, history patch, Undo/Redo and unmodified source input (ignoring only generated timestamps), plus reuse of the decoration array and records for finite fixtures and the legacy history result for a malformed NaN transform. Only measures CPU in this path, not Pixi or UI rendering. Use a trusted local v19 baseline because its code is imported.

## AutoCreate ErrorField setup vs v20 (Node CPU)

```bash
node --import tsx scripts/benchAutoCreateErrorField.ts /path/to/extracted/v20/role-editor-react-rebuild 24
```

Compares actual ErrorField construction and its initial score on 7–1,024px premultiplied RGBA fixtures. Includes dense and disconnected silhouettes with an eroded placement mask, and checks exact scores, per-cell data, incremental updates, and seeded focus choices (including zero-error, empty focus and shared-mask cases). Times only constructor setup and initial score, excluding fixture creation, search, browser, and rendering. Only use a trusted baseline because the script imports its source.
