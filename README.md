# TW Role Editor React Rebuild

這是 Twilight Wars 角色編輯器的 React 重建版。專案使用 Vite、React、TypeScript 與 Pixi.js，提供角色裝飾圖層編輯、即時預覽、匯入匯出、圖層排序、分組、轉換，以及圖片轉 `.twrole` 的輔助流程。

## 線上 Demo

https://role-editor-react-rebuild.ovoowovo.workers.dev/

## 核心功能

- 使用 Pixi.js 即時渲染角色、Head、Deco 與 decoration layers。
- 支援裝飾圖層新增、刪除、排序、群組、選取與 transform 編輯。
- 支援圖片像素轉 decoration layers，並可插入目前角色資料後匯出 legacy `.twrole`。
- 支援 JSON 匯入匯出，方便保存 editor role document 與 round-trip 測試。
- 支援 legacy `.twrole` 匯入匯出，格式為 `[0, 1]` envelope 加 gzip JSON。
- 支援 brush fill、圖層選取、群組 transform 與舞台互動。
- 透過 Worker API 管理 color block presets。
- 透過 GAF manifest 載入 runtime preview 需要的 asset metadata。
- 使用 Vitest 覆蓋 editor utilities、serialization、layer ordering、group logic、conversion helper 與 worker helper。

## 系統流程

### 預覽渲染流程

編輯器會將 React state 傳入 `CharacterStage`，由 stage runtime controller 建立 Pixi application、同步角色與選取狀態，最後更新 canvas preview。使用者在畫布上的拖曳、選取與 brush fill 操作會回寫到目前角色資料。

<div align="center">
  <img src="./docs/images/預覽渲染流程圖.svg" alt="預覽渲染流程" width="100%" />
</div>

### 圖片轉 TWRole 自動生成流程

上傳圖片後，系統會讀取圖片像素，根據顏色匹配最接近的 Deco asset，生成 decoration layers，插入目前角色資料後即可匯出成 legacy `.twrole` 檔案。

<div align="center">
  <img src="./docs/images/image-to-twrole-auto-generation-flow.svg" alt="圖片轉 TWRole 自動生成流程" width="100%" />
</div>

## 技術棧

- Vite
- React
- TypeScript
- Pixi.js
- Vitest
- Playwright
- Cloudflare Workers / Wrangler
- Drizzle ORM

## 開始使用

安裝依賴：

```bash
npm install
```

啟動本機開發伺服器：

```bash
npm run dev
```

預設網址：

```text
http://localhost:5173
```

建立 production build 並預覽：

```bash
npm run build
npm run preview
```

## 可用指令

```bash
npm run dev                     # 產生 GAF manifest 並啟動 Vite
npm run build                   # 產生 GAF manifest、執行 TypeScript 檢查並建立 production build
npm run preview                 # 預覽 production build
npm run test                    # 以 watch mode 執行 Vitest
npm run test:run                # 執行一次 Vitest
npm run test:e2e                # 執行 Playwright e2e 測試
npm run test:e2e:headed         # 以 headed mode 執行 Playwright e2e 測試
npm run generate:gaf            # 產生 src/generated/gafManifest.json
npm run renderer:dev            # 啟動 renderer 開發伺服器
npm run renderer:build          # 建立 renderer server
npm run renderer:start          # 建立 frontend 與 renderer 後啟動 renderer server
npm run typecheck:worker        # 檢查 Cloudflare Worker TypeScript
npm run worker:dev              # 使用 Wrangler 啟動本機 Worker
npm run worker:deploy           # 部署 Worker
npm run worker:deploy:frontend  # 使用 frontend Wrangler 設定部署 app shell
npm run db:generate             # 產生 Drizzle migration
npm run db:push                 # 推送 Drizzle schema
npm run db:seed:color-blocks    # 寫入 color block preset seed data
npm run db:migrate:color-blocks # 遷移 color block presets
```

## 專案結構

```text
src/
  components/   React UI，包括 editor shell、stage、layer list、modal 與 panels
  constants/    editor、stage、conversion、legacy、color block 等 domain constants
  hooks/        editor state、history、shortcuts、presets 與 group transform hooks
  lib/          editor、conversion、serialization、runtime、stage、API 與工具函式
  mock/         editor 開發用 mock role、asset、color block 與 manifest 資料
  generated/    自動產生的 GAF manifest JSON
  styles/       全域樣式
  test/         測試 fixtures
  types/        TypeScript role types

worker/
  src/          Cloudflare Worker API、HTTP helper 與 database schema
```

## GAF Assets

專案預期 GAF 相關檔案放在：

```text
public/assets/gaf/
```

需要的檔案：

```text
decorations.gaf
twactor.gaf
decorations.png
twactor.png
```

如果更新 GAF 檔案，請重新產生 manifest：

```bash
npm run generate:gaf
```

產生結果會寫入：

```text
src/generated/gafManifest.json
```

`npm run dev` 與 `npm run build` 會透過 npm lifecycle script 自動執行 manifest generation。

## 匯入與匯出

- JSON 匯出會保存目前 editor role document，適合開發、除錯與 round-trip import。
- `.twrole` 下載會輸出 legacy `[0, 1]` 格式，內容為 gzip 壓縮後的 JSON。
- legacy import/export 有對應測試，避免 role data、layer ordering 與轉換流程回歸。

## Worker 與部署

前端 app shell 可透過 Cloudflare Workers 與 frontend Wrangler config 部署：

```bash
npm run worker:deploy:frontend
```

Worker 也負責 color block preset 相關資料流程：

```bash
npm run db:generate
npm run db:push
npm run db:seed:color-blocks
npm run db:migrate:color-blocks
```

## 測試

執行單元測試：

```bash
npm run test:run
```

執行 production build 檢查：

```bash
npm run build
```

執行 e2e 測試：

```bash
npm run test:e2e
```
