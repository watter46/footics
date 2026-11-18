# TASK-212a: ボード画面再生のゼロ再レンダー同期 & Konva レイヤー・セレクタ最適化

- **Status**: `DONE`
- **Commit**: `perf(tactical): eliminate board playback React rerenders via Konva sync and narrow layer selectors`
- **Execution Waves**:
  - Wave 1: Phase 1 (parallel-independent pure Konva sync utility)
  - Wave 2: Phase 2, Phase 3, Phase 4 (parallel after Wave 1)
  - Wave 3: Phase 5 (sequential after Wave 2)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/hooks/use-resolved-scene-graph.ts): usePlaybackStore\(\(s\) => s\.timeMs\)`
  - `rg(src/features/tactical-unified/core/components/PitchGroundLayer.tsx,src/features/tactical-unified/core/components/BillboardObjectLayer.tsx,src/features/tactical-unified/core/components/HtmlHudOverlay.tsx): useDocumentStore\(\(s\) => s\.project\)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ボード画面のアニメーション再生中（`isPlaying === true`）の補間座標・透明度・可視状態は、純粋関数 `resolveSceneGraphFromState`（`evaluateTimelineFrame` + `compileSceneGraph`）の単一パイプラインのみから算出すること（旧 `animation-node-updater` の独自補間状態は作らない）。
  2. `isPlaying === false` の静止編集時・スライド切替・ドラッグ中・操作確定時の `DocumentStore` 保存および選択枠・ハンドル・ゴースト軌道表示が従来通り動作すること。
  3. 既存の `full-tactical-canvas-integration.test.tsx` が検証する再生中 Konva `Group` 座標補間が維持されること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useResolvedSceneGraph` から `usePlaybackStore((s) => s.timeMs)` 購読を完全撤廃し、`isPlaying` が `true` に切り替わった初期フレームのみ `playbackStore.getState().timeMs` で初期化する（再生中の毎フレーム更新は `CanvasStage` の `useEffect` 内 `playbackStore.subscribe()` から `resolveSceneGraphFromState` + `syncSceneGraphToKonva` で Konva ノードを直接更新し React 再レンダーを 0 回にする）。
  2. `PitchGroundLayer` / `BillboardObjectLayer` / `HtmlHudOverlay` の `useDocumentStore((s) => s.project)` 丸ごと購読を廃止し、`selectDomainActiveSlide` / `selectDomainPreviousSlide` / `selectDomainActivePhaseAspectRatio` に絞り込む。
  3. `ArrowObject` の依存配列なし `useEffect` を廃止して明示的依存配列（または ref 同期）に改め、`ZoneShapeNode` / `ZonePolygonNode` に `perfectDrawEnabled={false}` と `listening={isInteractive}` を設定する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`

## 2. Implementation Phases

### Phase 1: Konva シーングラフ直接同期ユーティリティ (`syncSceneGraphToKonva`)
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/utils/playback-konva-sync.ts` (~110 lines)
  - `[ADD]` `src/features/tactical-unified/core/utils/__tests__/playback-konva-sync.test.ts` (~130 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/utils/canvas-registry.ts`
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
- **Contract**:
  ```ts
  export function syncSceneGraphToKonva(
    registry: CanvasNodesRegistry,
    sceneGraph: ResolvedSceneGraphDTO,
  ): void;
  ```
  - 振る舞い仕様・境界条件:
    1. `sceneGraph.billboardItems` を走査し、`kind === 'player'` は `registry.playerNodes.get(item.id)`、`kind === 'ball'` は `registry.ballNode`、`kind === 'text'` は `registry.textNodes.get(item.id)` に対して `.position(item.positionPx)`・`.opacity(item.opacity)`・`.visible(item.visible)` を適用する。
    2. `sceneGraph.arrows` を走査し、`registry.arrowNodes.get(arrow.id)` が存在すれば `entry.node.points([...arrow.flatPointsPx])`・`.opacity(arrow.opacity)`・`.visible(arrow.visible)` を更新し、`entry.startDotNode` / `entry.endDotNode` があれば `startMarkerPointPx` / `endMarkerPointPx` へ `.position(...)`・`.visible(arrow.visible)` を反映する。
    3. `sceneGraph.connectLines` を走査し、`registry.connectLineNodes.get(cl.id)` の `glowNode` / `highlightNode` / `coreNode` に `.points([...cl.flatPointsPx])` と `.visible(cl.visible)` を反映する。
    4. `sceneGraph.zones` を走査し、`registry.zoneNodes.get(zone.id)` に対して `shapeType === 'polygon'` は `.points([...(zone.flatPointsPx ?? [])])`、`'rect' | 'ellipse'` は `.position({ x: zone.xPx ?? 0, y: zone.yPx ?? 0 })` を設定し、共通で `.opacity(zone.opacity)`・`.visible(zone.visible)` を反映する。
    5. 更新したノードの `.getLayer()` を `Set<Konva.Layer>` に集約し、最後に各レイヤーへ 1 回ずつ `layer.batchDraw()` を呼び出す（未登録 ID はスキップ）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/utils/__tests__/playback-konva-sync.test.ts`（実 Konva `Stage`/`Layer`/`Group`/`Arrow`/`Line`/`Rect` 使用・内部 `vi.mock` 禁止）:
    - `case 1`: `playerNodes`・`ballNode`・`textNodes` の座標/opacity/visible が `sceneGraph.billboardItems` 通りに更新され、`layer.batchDraw()` が対象レイヤー数分のみ呼ばれること。
    - `case 2`: `arrowNodes`・`connectLineNodes`・`zoneNodes`（`rect` と `polygon`）の `points` / `position` / `visible` が更新され、存在しない ID を含んでも例外を出さないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/playback-konva-sync.ts src/features/tactical-unified/core/utils/__tests__/playback-konva-sync.test.ts`

### Phase 2: `useResolvedSceneGraph` の `timeMs` 購読撤廃と `CanvasStage` 再生直接同期
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (L1-L152)
  - `[MODIFY]` `src/features/tactical-unified/core/components/canvas-stage.tsx` (L48-L149)
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-tactical-animation.ts` (L26-L40)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/utils/playback-konva-sync.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  ```ts
  // useResolvedSceneGraph(viewport):
  // - usePlaybackStore((s) => s.timeMs) を削除
  // - useDocumentStore((s) => s.project) を selectDomainActivePhase(s.project, activePhaseId) 中心へ絞り込む
  // - isPlaying === true 時は初期フレーム用に playbackStore.getState().timeMs を1回だけ参照
  ```
  - 振る舞い仕様・境界条件:
    1. `useResolvedSceneGraph` は `useTacticalStoresContext()` から `playbackStore` を取得し、`usePlaybackStore((s) => s.timeMs)` を呼ばない。`isPlaying` が `true` に変化したタイミングでのみ `playbackStore.getState().timeMs` を初期値として `resolveSceneGraphFromState` を実行する（`useDocumentStore` は `selectDomainActivePhase(s.project, activePhaseId)` 相当に絞り込み、他フェーズ更新の巻き添えを防ぐ）。
    2. `CanvasStageInner`（`canvas-stage.tsx`）に `useEffect` を追加し、`isPlaying` が `true` の間 `playbackStore.subscribe((state, prevState) => ...)` を購読する。`state.timeMs === prevState.timeMs` または `!state.isPlaying` なら即リターンし、変化時は `documentStore.getState().project`・`sessionStore.getState()` から `resolveSceneGraphFromState(..., options: { applyPitchTransform: false })` を算出して `syncSceneGraphToKonva(nodesRegistryRef.current, nextSceneGraph)` を呼び出す。
    3. `CanvasStage` は `TacticalStoresContext` 外の単体テスト（`canvas-stage.test.tsx` 等）でも動作するよう、`useContext(TacticalStoresContext)` でストアを取得し、Context が存在する場合のみ `subscribe` を行う。
    4. `use-tactical-animation.ts` L28 の `useDocumentStore((s) => s.project)` を `selectDomainActivePhase(s.project, activePhaseId)` に置換する。
- **Concrete Test Cases**:
  - 既存テスト `src/features/tactical-unified/__tests__/tactical-animation.test.ts`・`src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`・`src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` がすべて PASS し、再生中に Konva `Group` 座標が補間更新されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/hooks/use-tactical-animation.ts`

### Phase 3: Konva レイヤーの `s.project` 購読排除と `InteractionPreviewLayer` メモ化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L50-L180)
  - `[MODIFY]` `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (L44-L160)
  - `[MODIFY]` `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (L209-L293)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `PitchGroundLayer`: `useDocumentStore((s) => s.project)` を削除し、`selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)`、`selectDomainPreviousSlide(s.project, activePhaseId, activeSlideId)`、`selectDomainActivePhaseAspectRatio(s.project, activePhaseId)` の細粒度セレクタへ置換する。
    2. `BillboardObjectLayer`: `useDocumentStore((s) => s.project)` を削除し、`selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)` と `selectDomainActivePhaseAspectRatio(s.project, activePhaseId)` へ置換する。
    3. `InteractionPreviewLayer`: コンポーネント全体を `React.memo` でラップし、親 `CanvasStageInner` 再レンダー時の不要な再計算（`visibleMarkers` 算出と `compileDrawingPreview`）を遮断する。
- **Concrete Test Cases**:
  - 既存の `five-layer-architecture.test.tsx`・`billboard-item-node-memo.test.tsx`・`pitch-ground-drag-ghost.test.tsx` が全 PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`

### Phase 4: `ArrowObject` 依存配列修正・`Zone` バッファ描画無効化・`HtmlHudOverlay` 絞り込み
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L50-L90)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (L70-L120)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (L65-L95)
  - `[MODIFY]` `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx` (L35-L48)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `ArrowObject`: 依存配列なしの `useEffect(() => { ... Object.assign(entry, ...) })` を廃止し、`resolvedArrow`・`arrow`・`nodesRegistryRef` 等の明示的依存配列を指定して毎レンダー無条件実行を排除する。
    2. `ZoneShapeNode` (`<Ellipse>`, `<Rect>`) および `ZonePolygonNode` (`<Line>`): すべてに `perfectDrawEnabled={false}` と `listening={isInteractive}` を指定し、再生中（`cleanRender`）・非対話時の Hit Canvas 判定および半透明バッファ生成を抑止する。
    3. `HtmlHudOverlay`: `useDocumentStore((s) => s.project)` を削除し、`useDocumentStore((s) => selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)?.pitchTransform)` に絞り込む。
- **Concrete Test Cases**:
  - 既存の `arrow-object-interaction.test.tsx`・`zone-object-components.test.ts`・`hud-and-editor.test.tsx` が全 PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`

### Phase 5: ボード再生ゼロ再レンダー & Konva 座標補間回帰テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/board-playback-performance.test.tsx` (L115-L215)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
- **Contract**:
  - 実 `TacticalStoreProvider` に `CanvasStage` をマウントし、`isPlaying: true` 中の連続 `playbackStore.setTimeMs` 呼び出しで React `Profiler` 再レンダー回数が 0 増加に抑えられつつ、Konva `playerNodes` 座標が補間更新されることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`（実 Store + Konva Stage 接続・内部 `vi.mock` 禁止）:
    - `case 3`: `CanvasStage` を `Profiler` 配下でマウントし、`startPlayback()` 後に `setTimeMs(500)`, `setTimeMs(750)`, `setTimeMs(1000)` を連続実行しても `Profiler` の追加レンダーが発生せず、`nodesRegistryRef.current.playerNodes.get('p1')?.x()` が補間変化すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/board-playback-performance.test.tsx`
