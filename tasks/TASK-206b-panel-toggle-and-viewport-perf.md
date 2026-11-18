# TASK-206b: 左右パネル開閉遅延とリサイズ連鎖負荷の解消

- **Status**: `TODO`
- **Commit**: `perf(tactical): eliminate panel toggle lag by removing width transition and coalescing resize/cache updates`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4 (parallel)
  - Wave 2: Phase 5 (sequential after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/right-panel/right-panel.tsx): transition-\[width\]`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. パネルの開閉操作（クリック / ショートカット）時に既存の表示・タブ切替・レイアウト画面遷移・フォーカスモード切替の挙動が維持されること。
  2. `useCanvasViewport` は初回マウント時（`containerSize.width === 0 || containerSize.height === 0`）のみ同期的に `containerSize` を確定し、既存統合テストの初回 `Stage` 生成タイミングを壊さないこと。
  3. `SceneCanvasThumbnail` は単体マウント時に従来通り `requestAnimationFrame` 1 回で描画を完了し、アンマウント/連続再レンダー時は `cancelAnimationFrame` でキャンセルすること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `RightPanel` の `transition-[width] duration-200 ease-in-out` を廃止し即時幅切替にする（200ms 間の連続 `ResizeObserver` 発火と全選手マーカーキャッシュ再生成の連鎖を断つ）。
  2. `useCanvasViewport` の 2 回目以降の `ResizeObserver` 通知は `requestAnimationFrame` で 1 フレーム 1 回に集約（coalesce）し、アンマウント時に `cancelAnimationFrame` する。
  3. `PlayerMarkerRing` / `PlayerMarkerRingFade` / `PlayerFocusSpotlight` の `node.cache()` は `Math.round(radius)` 単位で依存配列を量子化し、さらに `requestAnimationFrame` 内で実行することで、パネル開閉クリックハンドラの同期ブロッキングを回避する。
  4. `SceneCanvasThumbnail` にモジュール内フレームバジェット型キュー（1 フレームあたり最大 2 件ずつ描画、3 件目以降は次 `rAF` へ先送り）を導入し、左パネル展開時の全スライド一斉描画によるロングタスク（`[Violation]`）を分散させる。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx`
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/panels/left-panel/left-panel.tsx`
  - `src/features/tactical-unified/panels/left-panel/phase-section.tsx`

## 2. Implementation Phases

### Phase 1: `RightPanel` 幅アニメーション撤去 ＆ `LeftPanel` / `PhaseSection` メモ化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (L51-L90)
  - `[MODIFY]` `src/features/tactical-unified/tactical-unified-page.tsx` (L120-L235)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/left-panel.tsx` (L21-L150)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/phase-section.tsx` (L24-L80)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `RightPanel` の `<aside>` から `transition-[width] duration-200 ease-in-out` を削除し、`RightPanel` を `React.memo` でラップする。`updatePitchAppearance` も `useCallback` 化する。
    2. `tactical-unified-page.tsx` の `LeftPanel` へ渡すコールバック（`onSelectScene`, `onAddPhase`, `onDeletePhase`, `onRenamePhase`, `onAddSlideToPhase`）および `TopBar` の `onToggleFocusMode` を `useCallback` で参照安定化する。
    3. `LeftPanel` と `PhaseSection` を `React.memo` でラップし、`LeftPanel` 内の `handleToggleExpand` 等のハンドラを `useCallback` 安定化する。
- **Concrete Test Cases**:
  - Phase 5 の `right-panel-tabs.test.tsx` および既存 `left-panel.test.tsx` で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/right-panel.tsx src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/panels/left-panel/left-panel.tsx src/features/tactical-unified/panels/left-panel/phase-section.tsx`

### Phase 2: `useCanvasViewport` の `ResizeObserver` rAF 集約
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-viewport.ts` (L19-L55)
  - `[ADD]` `src/features/tactical-unified/core/hooks/__tests__/use-canvas-viewport.test.ts` (~80 lines)
- **Contract**:
  ```ts
  // useCanvasViewport 内のリサイズ集約契約
  // 1. 初回サイズ確定 (hasInitializedSizeRef.current === false かつ nextWidth > 0 && nextHeight > 0): 同期で setContainerSize
  // 2. 2回目以降のリサイズ通知: pendingSizeRef に最新値を保持し、1つの requestAnimationFrame 内で1回だけ setContainerSize
  ```
  - 振る舞い仕様・境界条件:
    1. 同一フレーム内に複数回の `ResizeObserver` 通知が来た場合、前の未実行 rAF を追加スケジュールせず最新サイズのみ適用する。
    2. アンマウント時は `observer.disconnect()` と同時に保留中の `cancelAnimationFrame` を必ず実行する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-canvas-viewport.test.ts`（`ResizeObserver` テスト環境スタブ使用）:
    - `case 1`: 初回 `observe` 通知（`800x450`）は同期で `containerSize` と `vRect` に反映されること。
    - `case 2`: 2回目以降に同一フレーム内で `700x450` ➔ `600x450` と連続通知された場合、`requestAnimationFrame` は 1 回のみスケジュールされ、rAF 発火後に最終値 `600x450` だけが反映されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/use-canvas-viewport.ts src/features/tactical-unified/core/hooks/__tests__/use-canvas-viewport.test.ts`

### Phase 3: 選手マーカー光彩・リングキャッシュの量子化と rAF 遅延化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (L33-L73)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx` (L25-L72)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (L32-L87)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 3コンポーネントとも `const cacheRadius = Math.round(radius);`（Spotlight は `Math.round(outerRadius)`）を `useEffect` 依存配列に用い、リサイズに伴うサブピクセル揺れで毎回キャッシュ破棄・再構築しないようにする。
    2. `useEffect` 内の `node.cache(...)` と直後の `node.getLayer()?.batchDraw()` は `requestAnimationFrame` 内に遅延スケジュールし、クリーンアップで `cancelAnimationFrame` ＋ `node.clearCache()` を呼ぶ（ただし `requestAnimationFrame` 未定義環境では同期フォールバックではなくテスト契約維持のため即時実行）。
- **Concrete Test Cases**:
  - 既存テスト（`player-marker-ring-fade.test.tsx`, `player-marker-item.test.tsx`）の PASS で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/components/player-marker-ring.tsx src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx`

### Phase 4: `SceneCanvasThumbnail` のフレーム分散キューイング
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (L1-L115)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx` (L1-L115)
- **Contract**:
  ```ts
  // scene-canvas-thumbnail.tsx
  // 同一フレームに積まれたサムネイル描画タスクを 1 フレーム最大 2 件ずつ実行するモジュール内キュー
  // キューからキャンセルされたエントリは描画せずスキップする
  ```
  - 振る舞い仕様・境界条件:
    1. 各 `SceneCanvasThumbnail` は従来通り `requestAnimationFrame` 経由で非同期描画を予約し、単一マウント・再レンダー時は `requestAnimationFrame` 1 回（および `rerender` 時の前タスクキャンセル）を維持する。
    2. 同時に 3 件以上マウントされた場合、1 回目の rAF では先頭 2 件のみ `renderTacticalPhaseFrameToCanvas` を実行し、残りタスクは次の `requestAnimationFrame` を予約して実行する。
    3. クリーンアップ時に未実行タスクを確実にキューから除外（および予約中 rAF キャンセル）する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx`:
    - `case 1`: 既存ケース（単一マウント時 rAF 1 回で描画、rerender で前予約キャンセル）がそのまま PASS すること。
    - `case 2`: 4 件の `SceneCanvasThumbnail` を同時にマウントした場合、1 回目の rAF 発火で描画されるのは 2 件までで、2 回目の rAF 発火で残り 2 件が描画されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/panels/left-panel/__tests__/scene-canvas-thumbnail-raf.test.tsx`

### Phase 5: `right-panel-tabs.test.tsx` のトランジション廃止契約検証（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx` (L50-L85)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `RightPanel` の `<aside>` 要素に `transition-[width]` クラスが含まれず、展開時は `w-[400px]`、折りたたみ時は `w-12` へ即時切替されることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx`:
    - `case 1`: `RightPanel` の `aside` 要素の `className` が `transition-[width]` を含まず、折りたたみ/展開切替時に即時クラス切替されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx`
