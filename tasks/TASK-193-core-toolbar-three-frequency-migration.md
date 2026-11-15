# TASK-193: Core Toolbar コンポーネント群の 3頻度ストア移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate core drawing toolbar components to 3-frequency stores`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel — ファイル重複なし)
  - Wave 2: Phase 3 (sequential after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/toolbar/,src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx,src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx,src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx): useCanvasStore|CanvasStoreContext|CanvasStoreProvider|createCanvasStore`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ツール選択・連続描画ロック・消しゴムモード切替は `SessionStore` のみ更新し、`DocumentStore` の履歴 (`past`) や `isDirty` を汚染しないこと。
  2. ピッチロック切替 (`ToolbarPitchLock`) とスライドオブジェクトリセット (`ToolbarResetButton`) は `DocumentStore.dispatchSlide` 経由で永続スライドを更新すること。
  3. Chrome Extension の `QuickAnnotationCanvas`（`CoreDrawingToolbar` 共用）では `PitchLock` ボタンを表示しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `CoreDrawingToolbar` は `useCanvasStore` (`capabilities?.hasPitchLock`) への依存を廃止し、Props の `showPitchLock = true` のみで制御する。これに伴い `QuickAnnotationCanvas.tsx` では `<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} showPitchLock={false} />` を明示指定する。
  2. `ToolbarPitchLock` で `activeSlide.pitchTransform` が未定義の場合は `{ panX: 0, panY: 0, zoom: 1, tilt: 0, yaw: 90, isLocked: true }` を既定値として扱い、`isLocked` 反転結果を `UPDATE_SLIDE_META` で保存する（旧 `canvas-store-pitch.ts` 定数を参照しない）。
  3. `ToolbarResetButton` は `window.confirm(...)` 確認後、`dispatchSlide(activePhaseId, activeSlideId, { type: 'RESET_SLIDE_OBJECTS' })` と `clearSelection()` を実行する。
- **Consumers (同期更新対象)**:
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (L119)
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar{,-marker-mode}.test.tsx`

## 2. Implementation Phases

### Phase 1: ツール選択・消しゴム・ロックボタンの 3頻度ストア移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/ToolbarToolsGroup.tsx` (L1-L38)
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/ToolbarEraser.tsx` (L1-L29)
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/ToolbarContinuousLock.tsx` (L1-L30)
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/ToolbarPitchLock.tsx` (L1-L28)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`useDocumentStore`, `useSessionStore`)
  - `src/features/tactical-unified/stores/domain-selectors.ts` (`selectDomainActiveSlide`)
  - `src/lib/tactical/domain/commands.ts` (`UPDATE_SLIDE_META`, L154-L167)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `ToolbarToolsGroup`: `useSessionStore((s) => s.activeTool)` / `useSessionStore((s) => s.setActiveTool)` を使用する。
    2. `ToolbarEraser`: `useSessionStore` の `activeTool` / `setActiveTool` を使用し、`eraser` と `select` をトグルする。
    3. `ToolbarContinuousLock`: `useSessionStore` の `continuousDrawing` / `toggleContinuousDrawing` を使用する。
    4. `ToolbarPitchLock`: `useDocumentStore((s) => s.project)` / `useDocumentStore((s) => s.dispatchSlide)` と `useSessionStore` の `activePhaseId` / `activeSlideId` を購読し、`selectDomainActiveSlide` で取得した `activeSlide?.pitchTransform?.isLocked ?? true` をクリック時に反転して `UPDATE_SLIDE_META` を発行する。
- **Concrete Test Cases**:
  - Phase 3 の `toolbar.test.tsx` で一括検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/toolbar/ToolbarToolsGroup.tsx src/features/tactical-unified/core/components/toolbar/ToolbarEraser.tsx src/features/tactical-unified/core/components/toolbar/ToolbarContinuousLock.tsx src/features/tactical-unified/core/components/toolbar/ToolbarPitchLock.tsx`

### Phase 2: ToolbarResetButton / CoreDrawingToolbar / QuickAnnotationCanvas の移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/ToolbarResetButton.tsx` (L1-L40)
  - `[MODIFY]` `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (L1-L47)
  - `[MODIFY]` `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (L114-L122)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/tactical/domain/commands.ts` (`RESET_SLIDE_OBJECTS`, L142)
- **Contract**:
  ```ts
  export interface CoreDrawingToolbarProps {
    className?: string;
    markerMode?: '2d-only' | '3d-only' | 'all';
    tools?: DrawingToolPlugin[];
    showPitchLock?: boolean; // default: true
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `ToolbarResetButton`: `useDocumentStore((s) => s.dispatchSlide)` と `useSessionStore` (`activePhaseId`, `activeSlideId`, `clearSelection`) を使用し、`window.confirm` 承認時に `dispatchSlide(activePhaseId, activeSlideId, { type: 'RESET_SLIDE_OBJECTS' })` と `clearSelection()` を呼ぶ。
    2. `CoreDrawingToolbar`: `useCanvasStore` のインポートと `hasPitchLock` 読み取りを削除し、`shouldShowPitchLock = showPitchLock ?? true` にする。
    3. `QuickAnnotationCanvas.tsx` L119: `<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} showPitchLock={false} />` へ変更する。
- **Concrete Test Cases**:
  - Phase 3 及び既存 `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`（PitchLock 非表示確認）が PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/toolbar/ToolbarResetButton.tsx src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`

### Phase 3: Toolbar テスト群の TacticalStoreProvider 接続移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` (L1-L240)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx` (L1-L54)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx` (L1-L44)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`TacticalStoreProvider`, `createDefaultTacticalProject`)
  - `src/features/tactical-unified/stores/document-store.ts` (`createDocumentStore`)
  - `src/features/tactical-unified/stores/session-store.ts` (`createSessionStore`)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 3テストファイルすべてから `CanvasStoreProvider`, `CanvasStoreContext`, `createCanvasStore` を削除し、`TacticalStoreProvider`（実 `createDocumentStore` / `createSessionStore` 注入）へ置き換える。
    2. `toolbar.test.tsx` L185-L208 の `capabilities.hasPitchLock` テストを `CoreDrawingToolbar` の `showPitchLock={false}` / `showPitchLock={true}` Props 制御のテストへ更新し、`ToolbarPitchLock` テストでは `documentStore` の `pitchTransform.isLocked` がトグルされることも検証する。
    3. `ToolbarResetButton` テストを追加し、`window.confirm` が `true` を返した際に `RESET_SLIDE_OBJECTS` により矢印が消去され選手マーカーが保持されることを検証する。
- **Concrete Test Cases**:
  - `toolbar.test.tsx`, `drawing-toolbar.test.tsx`, `drawing-toolbar-marker-mode.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: `ToolbarToolsGroup` クリックで `sessionStore.activeTool` が更新され `documentStore.past` は空のまま
    - `case 2`: `ToolbarPitchLock` クリックで `documentStore` の対象スライド `pitchTransform.isLocked` が反転する
    - `case 3`: `CoreDrawingToolbar` で `showPitchLock={false}` 時は PitchLock ボタンが描画されない
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx`
