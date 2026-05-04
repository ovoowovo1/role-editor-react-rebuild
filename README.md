# TW Role Editor React Rebuild

这是一个根据上传的 `modules.js` 反向整理后重建的现代 React 版本。项目不是把原始 bundle 直接拆出来复用，而是用 Vite + React + TypeScript 重新实现 Role Editor 的界面结构、数据流和主要交互。

## 运行方式

```bash
npm install
npm run dev
```

默认开发服务器：

```text
http://localhost:5173
```

构建生产包：

```bash
npm run build
npm run preview
```

## 项目结构

```text
src/
  App.tsx
  main.tsx
  components/
    CharacterStage.tsx      # PIXI.js 角色预览画布
    ChoiceGrid.tsx          # 虚拟滚动选项网格
    EditControls.tsx        # 底部编辑控制栏
    EditorShell.tsx         # 主编辑器布局与文件导入导出
    LayerList.tsx           # @dnd-kit 图层拖拽排序
    TabBar.tsx
    TitleBar.tsx
    TopMenu.tsx
  hooks/
    useHistory.ts           # Undo / Redo 与 transient edit batching
    useKeyboardShortcuts.ts # 快捷键
    useRoleEditor.ts        # Role Editor 核心状态与动作
  lib/
    math.ts
    mockAdapters.ts         # 缺失外部 runtime 的 mock adapter
    roleSerialization.ts    # JSON / .twrole gzip 导入导出
  mock/
    assets.ts               # SVG fallback asset generator
    gafManifest.ts          # symbol manifest extracted from uploaded GAF files
    options.ts              # GAF-backed role/deco option list with fallback previews
  styles/
    global.css
  types/
    role.ts
```

## 已重建的原始 UX 概念

- 深蓝到黑色渐变的主编辑窗口、圆角边框、顶端标题栏。
- 顶部菜单：Import、Download、Export JSON、New Design、Save、Undo、Redo、Camp、Gender。
- 五个 Tab：Deco、Head、Hand、Foot、Cape。
- 中央 PIXI.js 预览画布，带角色本体、部件、装饰层和 canvas 内拖拽。
- 左侧/中间选项网格，使用 `@tanstack/react-virtual` 做固定高度虚拟滚动，可承载大量 mock 选项。
- 右侧图层列表，使用 `@dnd-kit` 支持拖拽排序。
- 多选：Ctrl/Cmd 点击图层或 canvas 装饰可加选/取消加选；Ctrl/Cmd+A 全选装饰。
- Copy / Paste：复制选中装饰，粘贴时自动偏移并插入到当前选区附近。
- Delete / visibility / flip / move top / move bottom。
- Undo / Redo：按钮与 Ctrl/Cmd+Z、Ctrl/Cmd+Y、Ctrl/Cmd+Shift+Z。
- 底部编辑控制：Rotate、Scale、Ratio、Pos X、Pos Y、Show、Hide、Delete、Copy、Paste、Zoom。
- 快捷键：方向键/WASD 移动，C/V 旋转，Z/X 缩放，Shift+Z/X 改比例，Delete 删除。
- 导入/导出：支持可读 JSON，也支持带 `[0,1]` 头和 gzip 的 mock `.twrole` 格式。导入 legacy/foreign role 时会把缺失游戏资产映射到 placeholder。
- 响应式布局：窄屏时三栏改为纵向堆叠。

## 与原始 bundle 对应较精确的部分

这些部分是按照 bundle 中的 Role Editor UI 和交互语义重建的：

- 主窗口视觉：`linear-gradient(#003949, black)`、浅色边框、圆角、悬浮标题条。
- 菜单区、Undo/Redo、Camp/Gender 下拉和 Save/Download/Import 的位置关系。
- Deco / Head / Hand / Foot / Cape 五个分页。
- 选项卡按钮的边框、渐变、选中态和 hover 概念。
- Choice block 的 50px 级别图标网格、蓝绿色 radial gradient、选中高亮。
- 右侧图层列表的缩略图、层级编号、选中态、删除按钮和拖拽排序。
- 底部编辑控制的 rotate / scale / ratio / position / visibility / delete / copy-paste 概念。
- 虚拟滚动、大量部件选项、图层多选、复制粘贴、撤销重做、导入导出等编辑器行为。

## 被 mock 的部分

原始 bundle 依赖多个外部全局运行时与游戏资产，本独立 React 项目无法直接访问它们，因此替换为 mock adapter：

| 原始依赖 | 替代方案 |
|---|---|
| `CgLibs.modules.TWRoleCgEditor` / System.register boot flow | Vite `main.tsx` 直接启动 React app |
| `Base.pixi` / `Base.pixis.Pixi` | 本地 `pixi.js` Application |
| `Base.resourceManager.createGAFMovieClip` | GAF symbol manifest + SVG fallback previews + PIXI Sprite |
| `TwilightWarsLib.games.configs.RoleDecosList` | 从上传的 `decorations.gaf` / `twactor.gaf` 抽取 symbol code；缺失 frame config 时使用 fallback frame list |
| `ActorClip`, `ActorHead`, `ActorHand`, `ActorFoot`, `ActorCape` | `CharacterStage.tsx` 中用 PIXI Graphics/Sprite 绘制的角色预览 |
| `GLT.auth`, `myProfile.roleManager`, purchase/save slot | `Save` 触发 `mockRoleEditor:saveRole` browser event |
| `MaterialUI` | 原生按钮、select、input + CSS 复刻视觉 |
| `SortableJS + InfiScroll` | `@dnd-kit` + `@tanstack/react-virtual` |
| 原始 PNG 纹理图集 | 如果 `public/assets/gaf/decorations.png` 与 `public/assets/gaf/twactor.png` 存在，会用从 GAF 抽取的 atlas rect 裁切显示；缺失时回退到 SVG placeholder |


## Uploaded GAF asset integration

This build includes the two uploaded GAF binaries under `public/assets/gaf/`:

- `decorations.gaf`
- `twactor.gaf`

The rebuild now extracts and uses real GAF symbol codes where possible:

- Deco options are generated from `decorations.gaf` symbols such as `royal_deco_*`, `third_deco_*`, `skydow_deco_*`, and xmas variants.
- Head / Hand / Foot / Cape options are generated from actor libraries found in `twactor.gaf`, including `lib_actor_head`, `lib_actor_hand`, `lib_actor_foot`, and `lib_actor_cape`.
- The choice grid shows `GAF` badges for options whose code came from these files.

The uploaded `.gaf` files are metadata/timeline files. They reference external texture-atlas PNG files named `decorations.png` and `twactor.png`; those PNG files are not embedded in the GAF binaries. This build now extracts atlas rectangles from the GAF files. If you add `public/assets/gaf/decorations.png` and `public/assets/gaf/twactor.png`, the choice grid, layer list, and PIXI preview will use cropped atlas sprites. If either PNG is missing or named differently, the UI falls back to SVG placeholder previews.

## 文件格式说明

### Export JSON

导出一个可读的 envelope：

```json
{
  "source": "tw-role-editor-react-rebuild",
  "schemaVersion": 1,
  "exportedAt": "...",
  "data": {
    "schemaVersion": 1,
    "name": "Mock Twilight Role",
    "camp": "camp1",
    "gender": "male",
    "parts": { "head": "head-01", "hand": "hand-01", "foot": "foot-01", "cape": "cape-01" },
    "decorations": []
  },
  "thumb": null,
  "decoGroups": []
}
```

### Download `.twrole`

为了贴近原 bundle，`.twrole` 按 `[0, 1]` 两字节 header + gzip JSON envelope 导出。这个格式是本项目的 mock-compatible 格式，不保证能被 Twilight Wars 原始运行时读取，因为缺少真实 asset code 与 GAF 资源。

## 开发备注

- 角色层级在 state 中按“从上到下”的 UI 顺序保存；PIXI 绘制时反向加入 container，确保 UI 顶层显示在 canvas 顶层。
- Slider 和 canvas drag 使用 transient edit：拖动过程中静默更新，松手后只写入一个历史记录。
- 从外部 legacy role 导入时，`roleSerialization.ts` 会尝试读取 `customRoleConfig.head/cape/hand/foot/decolist`，并把未知 code 映射到现有 mock option。
- 所有 mock adapter 仅用于让项目独立运行；真实集成时应替换 `mock/options.ts`、`mock/assets.ts` 和 `lib/mockAdapters.ts`。

## Patch notes

### 2026-05-04 StrictMode PIXI cleanup fix

React 18 development mode intentionally mounts and unmounts effects twice inside `React.StrictMode`. The PIXI stage redraw effect now captures the `stage` instance locally and checks `stage.destroyed` before removing listeners. This prevents `Cannot read properties of null (reading 'off')` when the PIXI `Application` cleanup runs before the redraw-effect cleanup. A small SVG favicon was also added to avoid the Vite `/favicon.ico` 404 noise.

### 2026-05-04 layer drag direction fix

The right layer panel used `@dnd-kit`'s hovered row id as the insertion target. The first rebuild always inserted the dragged block before the hovered row. That works when dragging upward, but when dragging a top layer downward it can place the block back into the same index, making downward drag appear broken. `reorderDecorations` now compares the original active index and hovered index: moving downward inserts after the hovered row, moving upward inserts before it. Multi-selected layer blocks use the same rule.

## Group function patch

This version restores the Layer Group concept found in the original bundle. Use Ctrl/Cmd-click to select two or more ungrouped decoration layers, then press **Group** in the right panel.

Implemented group behavior:

- Create a group from the current multi-selection.
- Render a group header in the right-side layer list.
- Click the group header to select all layers in that group.
- Collapse / expand the grouped layers.
- Hide / show the entire group.
- Ungroup layers.
- Preserve group data through undo / redo and JSON / `.twrole` import-export.

Limitations compared with the original runtime:

- Group names are generated as `Group 1`, `Group 2`, etc. Inline renaming is not implemented because the bundled source depends on original Material UI/runtime widgets that are not available here.
- The original group feature operates on PIXI/GAF display objects from `TwilightWarsLib`; this rebuild stores group membership by decoration IDs and applies visibility to the mock PIXI layers.

### Patch notes: group drag/drop fix

This build changes the right-side layer list from item-only sorting to row-level sorting. Group headers now participate in the `@dnd-kit` sortable context, so dragging a group header moves the whole group block. Dragging a single item inside a group now moves that item independently: dropping it over an ungrouped item removes it from its previous group; dropping it over another grouped item joins that target group; dropping it over a group header places it beside that group block. This mirrors the original editor concept where groups are a layer-management aid rather than immutable containers.


### 2026-05-04 uploaded GAF symbol integration

The uploaded `decorations.gaf` and `twactor.gaf` files were added to `public/assets/gaf/`. `src/mock/gafManifest.ts` was generated from their binary string tables. This replaces the generic Deco mock list with 245 decoration symbols extracted from `decorations.gaf`, and changes body-part option codes to GAF actor-library frame codes. The follow-up atlas patch adds real atlas-frame rendering. When `decorations.png` and `twactor.png` are present under `public/assets/gaf/`, the app uses the extracted x/y/width/height data instead of only showing fallback SVGs.


### 2026-05-04 GAF PNG atlas rendering patch

The previous GAF-symbol build only extracted option codes; it did not use the atlas PNGs at runtime. This patch adds `GafAtlasFrame` metadata, DOM atlas previews, and PIXI atlas sprites. Required PNG location:

```text
public/assets/gaf/decorations.png
public/assets/gaf/twactor.png
```

After adding the PNG files, restart Vite or hard-refresh the browser cache. Direct browser checks should return HTTP 200:

```text
http://localhost:5173/assets/gaf/decorations.png
http://localhost:5173/assets/gaf/twactor.png
```

## Patch note: atlas registration preview

`role-editor-react-rebuild-gaf-atlas-preview-fixed.zip` updates the center PIXI preview so actor parts are no longer stretched into fixed square sizes. Head, hand, foot, cape, and deco sprites now preserve the GAF atlas frame dimensions and use the GAF pivot/registration point when placed on the mock ActorClip skeleton. This better matches the original `modules.js` behavior, where `ActorClip`, `ActorHead`, `ActorHand`, `ActorFoot`, and `ActorCape` own the part transforms and `RoleEditor` only switches frames.

The exact TwilightWarsLib runtime skeleton is still unavailable, so the attachment-slot coordinates are an approximation. They are isolated in `src/lib/actorClipAdapter.ts` as `actorPreviewSlots` for tuning if you later recover the original game runtime transforms.

## 2026-05 ActorClip adapter update

A second uploaded `modules.js` was inspected and found to be the `TwilightWarsLib` bundle. It contains the `TwilightWarsLib/games/displays/ActorClip` module. The preview now mirrors the original `ActorClip` child hierarchy more closely:

- root child order: `footContainer`, `capeClip.container`, `body`
- `leftFoot.clip` and `rightFoot.clip` are placed inside `footContainer`
- `rightHand.clip`, `leftHand.clip`, and `headClip.container` are attached through the body animation layer

The lower-level `ActorHead`, `ActorHand`, `ActorFoot`, and `ActorCape` classes are still exported from the external `TWLibLib.games.displays` runtime in the bundle, so the React rebuild uses `src/lib/actorClipAdapter.ts` as a documented approximation of the missing GAF runtime transforms.

## 2026-05 TWLibLib ActorPart runtime update

A third uploaded `modules.js` was inspected and identified as the `TWLibLib` bundle. It contains the lower-level `TWLibLib/games/displays/ActorPart` module that exports `ActorHead`, `ActorHand`, `ActorFoot`, and `ActorCape`.

This patch uses that source to align the rebuild with the original runtime contract:

- body part options now use the numeric frame id (`f`) used by `ActorPart.setFrame(frame, scale)`, instead of storing `lib_actor_head/frame_01` style codes;
- the primary actor libraries are `lib_actor_head`, `lib_actor_hand`, `lib_actor_foot`, and `lib_actor_cape`;
- empty frames are now respected: head `76`, hand `10`, foot `19`, cape `11`;
- cape defaults to empty frame `11`, matching `RoleDecosConfig`;
- imported legacy `customRoleConfig.head/cape/hand/foot` JSON with `{ f, s }` now maps directly to the matching frame option.

The app still cannot execute the proprietary GAF runtime itself, so nested GAF animation transforms remain approximated in `src/lib/actorClipAdapter.ts`; however, frame identity, empty-frame behavior, and role import/export are now much closer to the original bundles.

### Patch: no-placeholder-body preview rig

The `twlib-actorpart-fixed` build still drew a custom React/PIXI placeholder body. That was not correct for the original Role Editor preview. The uploaded `TwilightWarsLib` / `TWLibLib` bundles show that the Role Editor changes head, hand, foot and cape frames through `ActorClip` / `ActorPart`, while the original `body` is a GAF movie clip that mainly provides attachment slots for those parts.

This patch removes the drawn mock body from `CharacterStage.tsx`. The preview now uses invisible attachment containers and draws only the selected `twactor.png` Head / Hand / Foot / Cape frames plus Deco layers. The hierarchy is still kept close to `ActorClip`: foot container first, cape behind, then body attachment slots for hands and head.

### Patch note: ActorClip attachment matrix preview

The center preview now uses GAF attachment matrices extracted from the uploaded `twactor.gaf` / `TwilightWarsLib` runtime for `headClip`, `rightHand`, `leftHand`, `rightFoot`, `leftFoot`, and `cape`. This replaces the earlier hand-authored UI offsets that spread the parts apart. The remaining limitation is that the project still renders each selected part from the atlas frame data available in the standalone rebuild; the original runtime can replay full nested GAF movie clips and may include multi-sprite frame composition not fully represented by the static atlas manifest.

## 2026-05-03 actor-runtime alignment patch

This patch changes the preview/import path to follow the original `modules.js` ActorPart model more closely:

- `ActorPart.setFrame(f, s)` is now represented as a numeric frame plus an independent part scale.
- Head and cape are treated as container-owned clips; hand and foot are direct clips.
- Foot scale is applied on the foot container, matching the original editor's `footContainer.scaleX` export.
- Deco layers now render inside the head disguise root instead of on the actor root. This mirrors `headClip.setDisguise(decoManager.root)`, so imported RoleDeco coordinates are head-local.
- `.twrole` import accepts original two-byte-header gzip files, raw gzip JSON, readable JSON, and base64 gzip JSON.
- Original `RoleDecosConfig` values `{ head, cape, hand, foot, decolist/deco }` are converted into rebuild state without dropping `{ f, s }` values.
- Missing role parts, scales, groups, and decoration values are normalized safely.
- Empty frames are handled through the original constants: head 76, hand 10, foot 19, cape 11.

### 2026-05-04 manifest-driven GAF asset paths + `data.cr` import fix

This patch removes repeated atlas texture URL literals from `src/mock/gafManifest.ts`. The generated atlas frame data now stores only frame rectangles and registration data; runtime texture URLs are injected from `gafSources`, which is created from `defaultGafAssetManifest`:

```ts
export const defaultGafAssetManifest = {
  decorations: '/assets/gaf/decorations.gaf',
  actor: '/assets/gaf/twactor.gaf',
  decorationsTexture: '/assets/gaf/decorations.png',
  actorTexture: '/assets/gaf/twactor.png',
  decorationsTextureName: 'decorations.png',
  actorTextureName: 'twactor.png'
} as const;
```

If the asset folder or PNG names change, update that manifest object rather than editing every atlas frame.

The import converter in `src/lib/roleSerialization.ts` also now supports the original exported readable JSON shape:

```json
{ "data": { "dr": 13, "cr": { "head": { "f": 36, "s": 1 }, "hand": { "f": 10, "s": 1 } } } }
```

The important fix is reading `cr` as the original `customRoleConfig`. The uploaded `nohand.json` now imports as `head: 36`, `hand: 10`, `foot: 1`, `cape: 11`; because hand frame `10` is `ActorHand.EMPTY_FRAME`, the preview renders no hands immediately after import.
