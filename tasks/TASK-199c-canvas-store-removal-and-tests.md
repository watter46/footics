# TASK-199c: CanvasStore 系コード完全削除・残存 CanvasStore テスト群の 3-frequency 移行

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-core): delete legacy CanvasStore directory and migrate remaining store tests to 3-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`canvas-display-stage.test.tsx` + `multi-marker-drag.test.ts`), Phase 2 (`canvas-stage-container.test.tsx` 1+1), Phase 3 (`context-hud.test.tsx` 1+1)
  - Wave 2 (直列, Wave 1 後): Phase 4 (`core/index.ts` + `core/types.ts` + `use-canvas-store.ts` / `core/store/*` / `canvas-store.test.ts` 全削除)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/hooks/use-canvas-store.ts`
  - `absent: src/features/tactical-unified/core/store/canvas-store.ts`
  - `absent: src/features/tactical-unified/core/store/canvas-store-provider.tsx`
  - `absent: src/features/tactical-unified/core/__tests__/canvas-store.test.ts`
  - `rg(src/,extension/): useCanvasStore|createCanvasStore|CanvasStoreProvider|CanvasStoreContext`
  - `rg(extension/): serializeProjectToScreenshotJson`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `core/store/*` および `core/hooks/use-canvas-store.ts` は二重管理根絶のため完全削除（`[DELETE]`）とし、旧 `CanvasStore` の一部を再輸出・フォールバック温存しない。
  2. テストはすべて実 `TacticalStoreProvider`（`createDocumentStore` / `createSessionStore` / `createPlaybackStore`）で実行し、内部ストア・フックの `vi.mock` を禁止する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `core/types.ts` および `core/index.ts` では `CanvasCoreHandle`, `CanvasStageProps`, `CanvasCapabilities`, `DrawingPreviewState`, `SelectedObject`, `SelectedObjectKind`, `AspectRatio`, `DrawingTool`, `PitchTransform` を保持し、`CanvasStore`, `CanvasStoreApi`, `CanvasState`, `CanvasActions`, `CanvasConfig`, `AnnotationsData`, `CanvasHistorySnapshot`, `CanvasClipboard` 等を削除する。
  2. Wave 1 で残存 `CanvasStore` 参照テスト4件を先に 3-frequency store へ移行し、Wave 2 で物理削除と `core/types.ts` / `core/index.ts` 整理を完了する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/types.ts`
  - `src/features/tactical-unified/core/index.ts`

---

## 2. Implementation Phases

### Phase 1: `canvas-display-stage.test.tsx` と `multi-marker-drag.test.ts` の 3-frequency 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-display-stage.test.tsx` (149 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/multi-marker-drag.test.ts` (150 lines)
- **Contract**:
  - `createCanvasStore`・`CanvasStoreContext`・`CanvasStoreApi`・`useTacticalUnifiedStore` への依存をすべて除去し、`TacticalStoreProvider`（`createDocumentStore` / `createSessionStore` / `createPlaybackStore`）で同等の振る舞いを検証する。
- **Concrete Test Cases**:
  - `canvas-display-stage.test.tsx`: 0x0 未確定時の Stage 非生成、全 Layer `listening() === false`、`window.addEventListener('keydown')` 未登録、選手マーカー `draggable() === false` の 4 ケースを維持。
  - `multi-marker-drag.test.ts`: `documentStore` の `UPDATE_PLAYERS` による一括座標更新・1 回 Undo 復元、ロック選手スキップ、複数選択ベンチドロップを検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/canvas-display-stage.test.tsx src/features/tactical-unified/__tests__/multi-marker-drag.test.ts`

---

### Phase 2: `canvas-stage-container.test.tsx` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` (429 lines)
- **Contract**:
  - `createCanvasStore` / `CanvasStoreContext` / `CanvasStoreApi` 参照を削除し、`TacticalStoreProvider` 配下で `CanvasStageContainer` を検証する。
- **Concrete Test Cases**:
  - `CanvasCoreHandle`（`exportPng`, `copyToClipboard`, `undo`, `redo`, `canUndo`, `canRedo`）、ツール/履歴ショートカット（`V`, Delete, Ctrl+Z/Y, Ctrl+A, Escape, input 中無視）、`toolbar` スロット、比率切替時の固定ステージ外枠、余白・PNG クロップを 3-frequency store で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`

---

### Phase 3: `context-hud.test.tsx` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/context-hud.test.tsx` (490 lines)
- **Contract**:
  - `createCanvasStore` / `CanvasStoreProvider` / `createTacticalUnifiedStore` / `TacticalUnifiedStoreContext` 参照をすべて削除し、`TacticalStoreProvider` のみで検証する。
- **Concrete Test Cases**:
  - `resolveHudTarget`（Arrow / Zone / Player）、`computeClampedHudPos`、`BallHud` と `ContextHud` のボールサイズ更新連動（`documentStore` 反映）、`PlayerMarkerLabel` 表示テストをすべて維持。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/context-hud.test.tsx`

---

### Phase 4: `core/store/*`・`use-canvas-store.ts` 物理削除と `core/types.ts`・`core/index.ts` 整理

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/types.ts` (224 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (185 lines)
  - `[DELETE]` `src/features/tactical-unified/core/hooks/use-canvas-store.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-provider.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-actions.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-cascade.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-clipboard.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-eraser.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-history.ts`
  - `[DELETE]` `src/features/tactical-unified/core/store/canvas-store-pitch.ts`
  - `[DELETE]` `src/features/tactical-unified/core/__tests__/canvas-store.test.ts`
- **Contract**:
```ts
// src/features/tactical-unified/core/types.ts に残す主要公開型
export type SelectedObjectKind =
  | 'player' | 'arrow' | 'zone' | 'text' | 'ball'
  | 'vision-cone' | 'connect-line' | 'badge' | 'focus';
export interface SelectedObject { id: string; kind: SelectedObjectKind; parentPlayerId?: string; }
export interface CanvasCapabilities { hasBall: boolean; hasPitchLock: boolean; hasBench: boolean; paddingRatio: number; }
export interface CanvasCoreHandle { exportPng: (...args: any[]) => Promise<string>; copyToClipboard: (...args: any[]) => Promise<void>; undo: () => void; redo: () => void; canUndo: () => boolean; canRedo: () => boolean; }
export interface DrawingPreviewState { isDrawing: boolean; tool: DrawingTool; startX: number; startY: number; currentX: number; currentY: number; points?: number[]; }
```
  1. `core/types.ts` から `CanvasConfig`, `AnnotationsData`, `CanvasHistorySnapshot`, `CanvasClipboard`, `CanvasState`, `CanvasActions`, `CanvasStore`, `CanvasStoreApi` を削除する（`CanvasCoreHandle`, `CanvasStageProps`, `CanvasCapabilities`, `DrawingPreviewState`, `SelectedObject*`, `AspectRatio`, `DrawingTool`, `PitchTransform` は保持）。
  2. `core/index.ts` から `useCanvasStore`, `useCanvasStoreApi`, `createCanvasStore`, `CanvasStoreContext`, `CanvasStoreProvider`, `CanvasStoreProviderProps` および上記削除型の再エクスポートを除去する。
  3. `[DELETE]` 対象 10 ファイルを物理削除する。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/index.ts` で型・ガードレール通過および残存参照ゼロを確認する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/index.ts`
