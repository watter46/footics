# TASK-197b: Wave C-1 Konva レイヤー関連テスト群の 3 頻度ストア & SceneGraph 移行

- **Status**: `DONE`
- **Commit**: `test(tactical): migrate Konva stage and layer tests to TacticalStoreProvider and SceneGraph DTO`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`canvas-stage.test.tsx`), Phase 2 (`clean-render.test.tsx`), Phase 3 (`hud-and-editor.test.tsx`), Phase 4 (`five-layer-architecture.test.tsx`), Phase 5 (`pitch-bench-transition.test.ts`)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx,src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx,src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx,src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx,src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts): \buseCanvasStore\b|\bCanvasStoreContext\b|\bCanvasStoreProvider\b|\bcreateCanvasStore\b|\bcalculatePitchTransform\b|\bsortBillboardItemsByDepth\b`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. 内部 Store / Hook に対する `vi.mock` を禁止し、必ず本物の `TacticalStoreProvider`（`createDocumentStore`, `createSessionStore`, `createPlaybackStore`）を接続してテストする。
  2. `PitchGroundLayer` / `BillboardObjectLayer` / `InteractionPreviewLayer` を直接レンダリングするテストでは、`resolveSceneGraphFromState`（`use-resolved-scene-graph.ts`）または `compileSceneGraph`（`compile-scene-graph.ts`）で生成した非 null の `ResolvedSceneGraphDTO` を渡す（`TacticalStoreProvider` 状態変化に連動させたいケースは `CanvasStage` または `useResolvedSceneGraph` ラッパーコンポーネント経由で検証する）。
  3. 300 行超の大型テスト移行ルール（`1 Phase = 1 テストファイル`）を厳守する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `clean-render.test.tsx`・`hud-and-editor.test.tsx`・`five-layer-architecture.test.tsx`・`pitch-bench-transition.test.ts` に残存している `CanvasStoreContext` / `createCanvasStore` / `useCanvasStore` / `useTacticalUnifiedStore` 参照を一括で `TacticalStoreProvider` + 3 頻度ストアへ置換する。
  2. `five-layer-architecture.test.tsx` 内の `sortBillboardItemsByDepth` 単体テストブロックは `compileSceneGraph` の深度ソート結果（`sceneGraph.billboardItems` 順）検証へ置換する。
  3. `hud-and-editor.test.tsx` 内の `calculatePitchTransform` 参照は `resolvePitchGroupTransform` へ置換し、`pitchTransform` 更新は `documentStore.getState().dispatchSlide(..., { type: 'UPDATE_SLIDE_META', patch: { pitchTransform } })` で実行する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`

---

## 2. Implementation Phases

### Phase 1: canvas-stage.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` (285 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - `CanvasStoreContext` / `createCanvasStore` を撤去し、`TacticalStoreProvider` でラップする `renderWithStore` ヘルパーへ置換する。
  - `InteractionPreviewLayer` 単体テストでは非 null の `PreviewSceneGraph`（必須プロパティ完備）を渡す。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`:
    - `size が 0x0`: Stage 非描画。
    - `size が有効値` / `interaction` あり/なし / `vRect` 不変時 Layer 非再生成。
    - `InteractionPreviewLayer` に `ResolvedArrowPrimitive` / `ResolvedZonePrimitive` を渡したとき描画されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`

### Phase 2: clean-render.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (343 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
- **Contract**:
  - `CanvasStoreContext` / `createCanvasStore` を完全撤去し、`TacticalStoreProvider`（`createDocumentStore`, `createSessionStore`, `createPlaybackStore`）へ統一する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`:
    - `cleanRender=true` 時に HUD・`InteractionPreviewLayer` が非描画、`PlayerMarkerItem` / `BallObject` の `draggable` が `false` であること。
    - `BallObject` が `resolvedBall.positionPx` 変更に即座追従すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`

### Phase 3: hud-and-editor.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` (731 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
- **Contract**:
  - `CanvasStoreContext` / `createCanvasStore` / `calculatePitchTransform` を撤去し、`TacticalStoreProvider` + `resolvePitchGroupTransform` へ移行する。
  - Konva 3 レイヤーの 2D ズーム・パン接続テスト（L651-L730）では、3 レイヤーへ `useResolvedSceneGraph` 経由（ラッパーコンポーネント内）または `resolveSceneGraphFromState` の `sceneGraph` を渡し、`documentStore.dispatchSlide(..., { type: 'UPDATE_SLIDE_META', patch: { pitchTransform: { zoom: 2, panX: 40, panY: -20, tilt: 0, isLocked: false } } })` 更新後に 3 つの `Group` が `resolvePitchGroupTransform` の値に一致することを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`:
    - `HtmlHudOverlay` / `PitchInlineTextEditor` / `CanvasStageContainer` 既存ケース全維持。
    - Konva 3 レイヤーへの 2D ズーム・パン変形適用検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`

### Phase 4: five-layer-architecture.test.tsx 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (955 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/compile-scene-graph.ts`
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - `useCanvasStore` / `CanvasStoreProvider` / `useTacticalUnifiedStore` / `sortBillboardItemsByDepth` を撤去し、`TacticalStoreProvider` と `useResolvedSceneGraph` ラッパー（または `resolveSceneGraphFromState`）へ全面移行する。
  - `sortBillboardItemsByDepth` テストブロックは `compileSceneGraph`（通常時と `pitchTransform.tilt > 0` 時）の `billboardItems` 深度ソート検証へ置換する。
  - `capabilities.hasBall` テストは `UPDATE_BALL`（`patch: { visible: true | false }`）による表示・非表示制御検証へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`:
    - `compileSceneGraph` 深度ソート（Y 座標昇順、3D チルト投影後ソート）。
    - `PitchGroundLayer` 背景 Rect & クリーンレンダー時ゴースト軌道非表示。
    - `BillboardObjectLayer` マーカー/ボール描画、`dragBoundFunc` 余白許容、座標更新同期、ドロップ時余白維持、`ball.visible` 切替。
    - `useCanvasSelectionBox` / `getPointerCoordinates` / `InteractionPreviewLayer` / `HtmlHudOverlay` / `memo` 化検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`

### Phase 5: pitch-bench-transition.test.ts 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (458 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - `CanvasStoreContext` / `createCanvasStore` / `useTacticalUnifiedStore` を撤去し、`TacticalStoreProvider`（`documentStore.dispatchSlide` 経由の `MOVE_PLAYER_TO_PITCH`, `MOVE_PLAYER_TO_BENCH`, `UPDATE_PLAYER`）へ一本化する。
  - `PitchGroundLayer` / `BillboardObjectLayer` 描画テストでは `resolveSceneGraphFromState` または `useResolvedSceneGraph` 経由で `sceneGraph` を供給する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`:
    - `findSafePitchPosition` / `MOVE_PLAYER_TO_PITCH` / `MOVE_PLAYER_TO_BENCH`（個別オプション自動クリア）。
    - 右側パネル領域ドロップによるベンチ退避、`resolveHudTarget` / `ContextHud` / `PlayerGhostTrajectoryList` / `PitchGroundLayer` のベンチ選手干渉防止。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
