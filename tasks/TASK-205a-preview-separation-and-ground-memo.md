# TASK-205a: 描画プレビューの全体計算分離とグラウンドレイヤーメモ化

- **Status**: `DONE`
- **Commit**: `perf(tactical): separate drawingPreview from scene graph and stabilize ground layer memo`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential)
  - Wave 2: Phase 2, Phase 4 (parallel after Wave 1)
  - Wave 3: Phase 3, Phase 5 (parallel after Wave 2)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/hooks/use-resolved-scene-graph.ts): drawingPreview`
  - `rg(src/lib/tactical/compiler/compile-scene-graph.ts): compileDrawingPreview`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `drawingPreview` 更新時（矢印・ゾーンのドラッグ描画中）に `useResolvedSceneGraph` および `PitchGroundLayer` / `BillboardObjectLayer` が再計算・再レンダリングされないこと。
  2. `PitchGroundLayer` 配下の `ZoneObject` / `ArrowObject` / `PitchGroundGhosts` に渡す props（`pitchStageSize`・`prevPitchPlayers`・ソート結果・ハンドラ）が毎回新規参照にならず `React.memo` が機能すること。
  3. クリーンレンダー時（エクスポート等）は `InteractionPreviewLayer` が `null` を返しプレビューが混入しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `DrawingPreviewInput` 型を `scene-graph-dto.ts` に切り出し、`EphemeralSessionState` と `ResolvedSceneGraphDTO` から `drawingPreview` を完全に削除する（フォールバック併用禁止）。
  2. `InteractionPreviewLayer` は `sceneGraph` prop を受け取らず、内部で `useSessionStore((s) => s.drawingPreview)` を直接購読し、`compileDrawingPreview(drawingPreview, pitchRect)` で描画する。
  3. `PitchGroundLayer` で `selectZone` / `selectArrow` 用の安定コールバックを `Map` キャッシュまたは `useMemo` で生成し、`ZoneObject` / `ArrowObject` の `onSelect` シグネチャ `(e: KonvaClickEvent) => void` を維持しつつ参照安定化する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`

## 2. Implementation Phases

### Phase 1: `drawingPreview` 型とコンパイラの分離
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (L1-L35, L160-L175)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts` (compileDrawingPreview, L115-L138)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (compileSceneGraph, L213-L255)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts` (L1-L20)
- **Contract**:
  ```ts
  // scene-graph-dto.ts
  export interface DrawingPreviewInput {
    readonly tool: string;
    readonly startPoint: ScreenNormPoint;
    readonly currentPoint: ScreenNormPoint;
    readonly polygonPoints?: readonly ScreenNormPoint[];
  }
  // EphemeralSessionState / ResolvedSceneGraphDTO から drawingPreview を削除

  // compile-zones.ts
  export function compileDrawingPreview(
    drawingPreview: DrawingPreviewInput | null | undefined,
    viewport: StageViewport,
  ): ResolvedDrawingPreview | null;
  ```
  - 振る舞い仕様・境界条件:
    1. `compileDrawingPreview` は `EphemeralSessionState` 全体ではなく `DrawingPreviewInput | null | undefined` を直接受け取る。
    2. `compileSceneGraph` は `compileDrawingPreview` を呼ばず、戻り値に `drawingPreview` を含めない。
    3. `canvas-drawing-factory.ts` の `DrawingPreview` 型は `EphemeralSessionState['drawingPreview']` 依存を廃し、`DrawingPreviewInput` を用いた既存互換型に差し替える。
- **Concrete Test Cases**:
  - Phase 4 で `compile-scene-graph.test.ts` により検証（本 Phase では `tsc` で型整合を検証）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/compile-zones.ts src/lib/tactical/compiler/compile-scene-graph.ts src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`

### Phase 2: Store / SceneGraph Hook / PreviewLayer の分離接続
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L1-L45)
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (useResolvedSceneGraph, L106-L164)
  - `[MODIFY]` `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (L1-L225)
  - `[MODIFY]` `src/features/tactical-unified/core/components/canvas-stage.tsx` (CanvasStageInner, L62-L127)
- **Contract**:
  ```ts
  // InteractionPreviewLayer.tsx
  export interface InteractionPreviewLayerProps {
    stageSize: { width: number; height: number };
    pitchRect: PitchRectBounds;
    selectionBox?: SelectionBox | null;
    cleanRender?: boolean;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `session-store.ts` の `drawingPreview` 型は `DrawingPreviewInput` ベースに変更する（`setDrawingPreview` 等のシグネチャ維持）。
    2. `useResolvedSceneGraph` から `useSessionStore((s) => s.drawingPreview)` の購読および `session` オブジェクトへの含め込みを削除する。
    3. `InteractionPreviewLayer` は内部で `useSessionStore((s) => s.drawingPreview)` を購読し、`compileDrawingPreview(drawingPreview, { width: pw, height: ph })` の結果を `renderSceneGraphDrawingPreview` で描画する（`sceneGraph` prop 削除）。
    4. `canvas-stage.tsx` の `<InteractionPreviewLayer>` 呼び出しから `sceneGraph={sceneGraph}` を削除する。
- **Concrete Test Cases**:
  - Phase 3 で `canvas-stage.test.tsx` を更新して検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/components/canvas-stage.tsx`

### Phase 3: `PitchGroundLayer` メモ化安定化 ＆ `canvas-stage.test.tsx` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L115-L284)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` (L160-L268)
- **Contract**:
  ```ts
  // PitchGroundLayer 内の参照安定化
  const pitchStageSize = useMemo(
    () => ({ width: pitchRect.width, height: pitchRect.height }),
    [pitchRect.width, pitchRect.height],
  );
  ```
  - 振る舞い仕様・境界条件:
    1. `PitchGroundLayer` 内で `sortedZones`, `sortedArrows`, `prevPitchPlayers`, `pitchStageSize`, `handleSelectConnectLine` を `useMemo` / `useCallback` で安定化する。
    2. `makeSelectHandler` による毎レンダーのクロージャ再生成を廃止し、`useMemo`（`Map<string, (e: KonvaClickEvent) => void>` を `sortedZones` / `sortedArrows` と `selectObject` / `setIsHudOpen` に依存してキャッシュ）で安定化する。
    3. `canvas-stage.test.tsx` の `InteractionPreviewLayer` テスト（L160-L268）は `sceneGraph.drawingPreview` 渡しを廃止し、`sessionStore.getState().setDrawingPreview(...)` 経由で `Line`（矢印プレビュー）および `Rect`（ゾーンプレビュー）が描画されることを実 `TacticalStoreProvider` で検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `setDrawingPreview({ tool: 'pass', startPoint, currentPoint })` 時に `InteractionPreviewLayer` がプレビュー `Line` を描画する。
    - `case 2`: `setDrawingPreview({ tool: 'zone', startPoint, currentPoint })` 時に `InteractionPreviewLayer` がプレビュー `Rect` を描画する。
    - `case 3`: `cleanRender={true}` の場合はプレビューを描画せず `null` を返す。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`

### Phase 4: `compile-scene-graph.test.ts` の更新
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/compile-scene-graph.test.ts` (L190-L252)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compileDrawingPreview` を直接インポートしてテストする形式に更新する（`compileSceneGraph` の結果に `drawingPreview` を期待しない）。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/compile-scene-graph.test.ts`:
    - `case 1`: `compileDrawingPreview({ tool: 'pass', startPoint: (10,10), currentPoint: (25,25) }, { width: 1000, height: 500 })` ➔ `startPointPx: { x: 100, y: 50 }`, `currentPointPx: { x: 250, y: 125 }`。
    - `case 2`: `compileDrawingPreview(null, viewport)` ➔ `null`。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/compile-scene-graph.test.ts`

### Phase 5: `tactical-animation.test.ts` の更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (L157-L222)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `EphemeralSessionState` リテラルから廃止済みの `drawingPreview: null` を削除し、既存の静止フレーム・再生補間テストがそのまま通るようにする。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`:
    - `case 1`: `isPlaying: false` で `p1` の位置が `{ x: 100, y: 50 }` に解決されること。
    - `case 2`: `isPlaying: true, timeMs: 750` で補間座標 `{ x: 150, y: 75 }` に解決されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-animation.test.ts`
