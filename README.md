# TW Role Editor React 重建版

這是 Twilight Wars 角色編輯器的 React 重建版。專案使用 Vite、React、TypeScript 和 Pixi.js，提供角色裝飾圖層編輯、即時預覽、匯入、匯出、分組、排序與轉換工具。

## 線上 Demo

https://role-editor-react-rebuild.ovoowovo.workers.dev/

## 功能

- 使用 Pixi.js 即時預覽角色與裝飾圖層。
- 編輯 Deco / Head 等角色圖層的座標、縮放、旋轉、可見狀態與排序。
- 支援圖層複製、貼上、鏡像、刪除、群組、收合與重新排序。
- 支援 JSON 匯入與匯出，方便除錯與資料 round-trip。
- 支援 legacy `.twrole` 格式下載與匯入，格式為 `[0, 1]` envelope 加 gzip JSON。
- 可從圖片或 brush fill 區域產生裝飾圖層。
- 透過 Worker API 載入 color block presets。
- 可從本機 GAF asset 產生 runtime preview 使用的 manifest。
- 使用 Vitest 測試 editor utilities、serialization、layer ordering、group logic、conversion helper 與 worker helper。

## 技術棧

- Vite
- React
- TypeScript
- Pixi.js
- Vitest
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

開啟：

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
npm run build                   # 產生 GAF manifest、TypeScript 檢查並建立 build
npm run preview                 # 預覽 production build
npm run test                    # 以 watch mode 執行 Vitest
npm run test:run                # 執行一次 Vitest
npm run generate:gaf            # 重新產生 src/generated/gafManifest.json
npm run typecheck:worker        # 檢查 Cloudflare Worker TypeScript
npm run worker:dev              # 使用 Wrangler 本機啟動 Worker
npm run worker:deploy           # 部署 Worker
npm run worker:deploy:frontend  # 使用 frontend Wrangler 設定部署前端
```

## 專案結構

```text
src/
  components/   React UI，包含 editor shell、stage、layer list、modal 與 panels
  constants/    editor、stage、conversion、legacy、color block 等 domain constants
  hooks/        editor state、history、shortcuts、presets 與 group transform hooks
  lib/          editor、conversion、serialization、runtime、stage、API 等純邏輯 helper
  mock/         editor 使用的 mock role、asset、color block 與 manifest 資料
  generated/    產生出的 GAF manifest JSON
  styles/       全域樣式
  test/         共用測試 fixtures
  types/        共用 TypeScript role types

worker/
  src/          Cloudflare Worker API、HTTP helper、database schema 與測試
```

## GAF Assets

專案預期 GAF 相關檔案放在：

```text
public/assets/gaf/
```

常用來源檔案：

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

`npm run dev` 和 `npm run build` 也會透過既有 npm lifecycle script 自動執行 manifest generation。

## 匯入與匯出

- JSON 匯出會輸出 editor role document，方便除錯、測試與 round-trip import。
- `.twrole` 下載會輸出 legacy `[0, 1]` 格式，內容為 gzip 壓縮後的 JSON。
- legacy import/export 行為已有單元測試保護，方便後續重構時維持相容性。

## Worker 與部署

前端透過 Cloudflare Workers 部署。部署 app shell 時使用 frontend Wrangler config：

```bash
npm run worker:deploy:frontend
```

Worker 也包含 color block preset 載入與資料庫相關腳本：

```bash
npm run db:generate
npm run db:push
npm run db:seed:color-blocks
npm run db:migrate:color-blocks
```

## 測試

執行完整單元測試：

```bash
npm run test:run
```

執行前端 build 驗證：

```bash
npm run build
```
