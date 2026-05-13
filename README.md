# TW Role Editor React 重建版

本專案是根據上傳的 `modules.js` 進行逆向整理後，以現代技術棧重新實作的角色編輯器。不是直接拆解並重用原始 bundle，而是使用 **Vite + React + TypeScript** 重建介面結構、資料流程與主要互動行為。

## 快速開始

安裝與啟動開發環境：

```bash
npm install
npm run dev
```

預設網址：

```text
http://localhost:5173
```

建置與預覽：

```bash
npm run build
npm run preview
```

## 專案結構

```text
src/
  components/    # UI 元件（角色畫布、選項網格、圖層清單、控制列等）
  hooks/         # 核心狀態、歷史紀錄（Undo/Redo）、快捷鍵
  lib/           # 工具與序列化邏輯（JSON / .twrole）
  mock/          # 缺少原始遊戲 runtime 時的替代資料/行為
  generated/     # 由腳本產生的 GAF manifest
  styles/        # 全域樣式
  types/         # 型別定義
```

## 目前已支援功能

- 近似原編輯器風格的主介面與分頁（Deco / Head / Hand / Foot / Cape）。
- PIXI.js 角色預覽畫布與物件拖曳。
- 大量選項的虛擬捲動網格。
- 右側圖層清單拖曳排序與多選。
- 常見編輯操作：顯示/隱藏、刪除、複製/貼上、翻轉、移至頂/底。
- Undo / Redo（按鈕與快捷鍵）。
- 匯入/匯出 JSON。
- 下載 mock `.twrole`（`[0,1]` 標頭 + gzip JSON）。
- 群組功能（建立群組、展開/收合、整組顯示/隱藏、解散群組）。

## GAF 資產整合

專案可讀取以下檔案（位於 `public/assets/gaf/`）：

- `decorations.gaf`
- `twactor.gaf`

若同時提供 atlas PNG：

- `decorations.png`
- `twactor.png`

則會使用實際圖集裁切顯示；若缺少 PNG，會退回 SVG placeholder。

## 重新產生 GAF Manifest

```bash
npm run generate:gaf
```

說明：

- 會讀取 `public/assets/gaf/decorations.gaf` 與 `twactor.gaf`。
- 輸出至 `src/generated/gafManifest.json`。
- `npm run dev` 與 `npm run build` 前置流程會自動執行此步驟。
- 若 `.gaf` 不存在，會改用 `scripts/gafManifest.fallback.json`。

## 檔案格式

### Export JSON

輸出可讀 JSON envelope，包含角色資料、schema 版本與匯出時間。

### Download `.twrole`

輸出格式為 `[0, 1]` + gzip JSON，目的在於與本專案 mock 流程相容；不保證可直接被原始 Twilight Wars runtime 讀取。

## 開發備註

- 圖層在狀態中以 UI 順序保存，渲染時依需求調整順序以符合視覺層級。
- 拖曳與滑桿操作採用 transient edit，避免歷史紀錄過度碎片化。
- 匯入 legacy/外部資料時，未知代碼會嘗試映射到可用 mock 選項。
- 若要接回真實遊戲環境，建議替換 `src/mock/*` 與 `src/lib/mockAdapters.ts`。

## 授權與用途

本專案以重建與研究互動邏輯為目的，供開發測試與介面驗證使用。
