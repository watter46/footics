# TASK-197a: Konva 描画レイヤーの 3 頻度ストア統合 & Dumb View 化

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate Konva stage layers to three-frequency stores and SceneGraph DTO`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`canvas-coordinates` + `canvas-stage` + `canvas-display-stage`), Phase 2 (`InteractionPreviewLayer` + `billboard-item-node`)
  - Wave 2 (直列, Wave 1 後): Phase 3 (`PitchGroundLayer`), Phase 4 (`BillboardObjectLayer` + `core/index.ts` + `[DELETE] billboard-depth-sort`)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/billboard-depth-sort.ts`
  - `rg(src/features/tactical-unified/core/components/canvas-stage.tsx,src/features/tactical-unified/core/components/PitchGroundLayer.tsx,src/features/tactical-unified/core/components/BillboardObjectLayer.tsx,src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx,src/features/tactical-unified/core/components/billboard-item-node.tsx): \buseCanvasStore\b|\bcalculatePitchTransform\b|\bbuildBillboardItems\b|\bsortBillboardItemsByDepth\b|\bsortBillboardItemsBySceneGraph\b`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `useResolvedSceneGraph` は `viewport = { width: vRect.width, height: vRect.height, offsetX: 0, offsetY: 0 }` かつ `applyPitchTransform: false` でローカル座標 `(0..pitchRect.width, 0..pitchRect.height)` を返すため、Konva 3 レイヤー（`PitchGroundLayer` / `BillboardObjectLayer` / `InteractionPreviewLayer`）の親 `<Group>` が `pitchRect` オフセットと `pitchTransform`（2D `panX`, `panY`, `zoom`）を担い、`PitchBackgroundImage` を含む全要素を同期して変形する（二重変形は禁止）。
  2. 3 レイヤーから `calculatePitchTransform`（`canvas-pitch-transform-helper.ts`）への依存を完全に撤去し、`canvas-coordinates.ts` の純粋関数 `resolvePitchGroupTransform` のみを使用する。
  3. `CanvasStage` は `TacticalStoreProvider` 配下でのみ動作させ、コンテキスト不在時の null フォールバックを撤去する（`FullTacticalCanvas` / `QuickAnnotationCanvas` ともに既に外側で `TacticalStoreProvider` をマウント済み）。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `PitchGroundLayer` / `BillboardObjectLayer` / `InteractionPreviewLayer` の `sceneGraph` props は必須（`ResolvedSceneGraphDTO` / `PreviewSceneGraph`）とし、`useCanvasStore` 参照および未解決フォールバック分岐を全面撤去する。
  2. `BillboardObjectLayer` は `sceneGraph.billboardItems` をそのまま順に表示し、`billboard-depth-sort.ts` とそのテストは `[DELETE]` する。`BillboardItemNode` は `ResolvedBillboardItem`（`player` / `ball` / `text`）を直接受け取る（Wave C-2 完了までは `PlayerMarkerItem` / `TextObject` へ必要なメタデータ・コールバックを繋ぐ）。
  3. 座標・変形・Z 順は `sceneGraph` からのみ読み、クリック選択・ドラッグ確定・コネクトライン接続などのユーザー操作は `useDocumentStore`（`dispatchSlide`）および `useSessionStore`（`selectObject`, `setIsHudOpen`, `setConnectingPlayerId` 等）へ直接発行する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/canvas-stage.tsx`
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/core/index.ts`

---

## 2. Implementation Phases

### Phase 1: PitchGroupTransform 純粋関数 & CanvasStage 非 null 化

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-coordinates.ts` (175 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/canvas-stage.tsx` (160 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (63 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface PitchGroupTransform {
    readonly x: number;
    readonly y: number;
    readonly scaleX: number;
    readonly scaleY: number;
  }

  export function resolvePitchGroupTransform(
    pitchRect: PitchRectBounds,
    pitchTransform?: PitchTransformState | null,
  ): PitchGroupTransform;
  ```
  - 振る舞い仕様・境界条件:
    1. `resolvePitchGroupTransform`（`canvas-coordinates.ts` L135-L175 付近へ追加）: `zoom = pitchTransform?.zoom ?? 1`, `panX = pitchTransform?.panX ?? 0`, `panY = pitchTransform?.panY ?? 0` とし、`x = pitchRect.x + panX + (pitchRect.width / 2) * (1 - zoom)`, `y = pitchRect.y + panY + (pitchRect.height / 2) * (1 - zoom)`, `scaleX = zoom`, `scaleY = zoom` を返す（`pitchTransform` 未指定時は `x = pitchRect.x, y = pitchRect.y, scaleX = 1, scaleY = 1`）。
    2. `canvas-stage.tsx`（L49-L159）: `CanvasStageInnerProps.sceneGraph` を `ResolvedSceneGraphDTO`（非 null）に変更。`CanvasStage` 内の `!tacticalStores` null フォールバック分岐と `useContext(TacticalStoresContext)` 分岐を削除し、常に `ResolvedSceneGraphBridge` 経由で `useResolvedSceneGraph(viewport)` の結果を `CanvasStageInner` へ渡す。
    3. `canvas-display-stage.tsx`（L1-L62）: `CanvasStage` を `TacticalStoreProvider` 配下で描画する責務を壊さないよう型整合を確認し、不要な旧 `CanvasStore` 前提があれば除去する。
- **Concrete Test Cases**:
  - テスト更新は `TASK-197b` Phase 1 (`canvas-stage.test.tsx`) で実施する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-coordinates.ts src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/core/components/canvas-display-stage.tsx`

### Phase 2: InteractionPreviewLayer & BillboardItemNode の Dumb View 化

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (233 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (159 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface InteractionPreviewLayerProps {
    stageSize: { width: number; height: number };
    pitchRect: PitchRectBounds;
    selectionBox?: SelectionBox | null;
    cleanRender?: boolean;
    sceneGraph: PreviewSceneGraph;
  }

  export interface BillboardItemNodeProps {
    item: ResolvedBillboardItem;
    pitchRect: PitchRectBounds;
    baseDim: number;
    markerMode: string;
    aspectRatio?: AspectRatio;
    selectedIds: readonly string[];
    cleanRender?: boolean;
    isInteractive: boolean;
    connectingPlayerId: string | null;
    editingTextId?: string | null;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    onStartEditText?: (textId: string) => void;
    onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
    onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
    onDragEnd: (e: KonvaEventObject<DragEvent>, marker: PitchPlayer) => void;
    onClickMarker: (markerId: string, isShift: boolean) => void;
    onUpdateVisionCone: (marker: PitchPlayer, patch: Partial<NonNullable<PitchPlayer['visionCone']>>) => void;
    onSelectText: (e: KonvaEventObject<MouseEvent | TouchEvent>, textId: string) => void;
    updateText: (id: string, patch: Partial<DomainTextAnnotation>) => void;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `InteractionPreviewLayer`: `useCanvasStore`・`calculatePitchTransform`・`renderDrawingPreviewNode` 呼び出しを完全撤去する。`useSessionStore` から `activePhaseId`, `activeSlideId`, `connectingPlayerId`, `teamVisibility` を、`useDocumentStore` から `selectDomainActiveSlide(s.project, activePhaseId, activeSlideId)` の `players` と `pitchTransform` を取得する。
    2. 親 `<Group>` の変形には `resolvePitchGroupTransform(pitchRect, pitchTransform)` を使用し、範囲選択矩形 `selectionBox` は Stage 座標系のまま描画する。`drawingPreview` の描画は `sceneGraph.drawingPreview` のみを `renderSceneGraphDrawingPreview` で描画し、旧 `DrawingPreviewLayer` フォールバック分岐を持たない。`PlayerConnectingGuide` へは `teamVisibility` で絞り込んだ `area === 'pitch'` 選手一覧を渡す。
    3. `BillboardItemNode`: `BillboardItem`（`billboard-depth-sort`）への依存および `sceneGraph.billboardItems.find(...)` を完全撤去し、`item: ResolvedBillboardItem` を受け取って `item.kind` で分岐する。`!item.visible` のときは `null`。
       - `player`: `PlayerMarkerItem` へ `marker={item.player}` と `resolvedPlayer={item}` を渡す。
       - `ball`: `BallObject` へ `resolvedBall={item}` を渡す。
       - `text`: `TextObject` へ `resolvedText={item}` と `ResolvedBillboardTextItem` から構築した `TextAnnotation` 互換オブジェクトを渡す。
- **Concrete Test Cases**:
  - `InteractionPreviewLayer` の `sceneGraph.drawingPreview` / `cleanRender` / 2D ズームパン検証は `TASK-197b` で実施する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/components/billboard-item-node.tsx`

### Phase 3: PitchGroundLayer の 3 頻度ストア統合 & SceneGraph 必須化

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (290 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface PitchGroundLayerProps {
    stageSize: { width: number; height: number };
    pitchRect: PitchRectBounds;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    cleanRender?: boolean;
    listening?: boolean;
    sceneGraph: ResolvedSceneGraphDTO;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `useCanvasStore` および `calculatePitchTransform` を撤去し、`useDocumentStore`（`project`, `dispatchSlide`）と `useSessionStore`（`activePhaseId`, `activeSlideId`, `selectedObjects`, `activeTool`, `teamVisibility`, `selectObject`, `setIsHudOpen`）へ移行する。
    2. `selectDomainActivePhase`, `selectDomainActiveSlide`, `selectDomainPreviousSlide` で `activePhase` / `activeSlide` / `prevSlide` を取得し、`<Group>` の `x, y, scaleX, scaleY` を `resolvePitchGroupTransform(pitchRect, activeSlide?.pitchTransform)` で設定する。
    3. ゾーン・矢印・コネクトラインは `sceneGraph.zones` / `sceneGraph.arrows` / `sceneGraph.connectLines` のみを基準に描画する（`selectedIds` による手前ソートは `sceneGraph.zones` / `sceneGraph.arrows` を基に `activeSlide` の要素と突き合わせて描画）。`updateZone` は `dispatchSlide(activePhaseId, activeSlideId, { type: 'UPDATE_ZONE', id, patch })`、`updateArrow` は `UPDATE_ARROW` を発行する。
    4. ゴースト軌道（`!cleanRender` 時）: `sceneGraph.trajectories` を描画しつつ、選択中選手の操作ハンドル用 `PlayerGhostTrajectory` は `resolvedPlayer.positionPx` の `%` 逆算ブリッジを撤去し、ドメイン上の `marker`（`PitchPlayer`）と `prevPlayer` を直接渡し、`onUpdateTrajectory` は `SET_PLAYER_TRAJECTORY` を `dispatchSlide` で発行する。
- **Concrete Test Cases**:
  - `PitchGroundLayer` の描画・クリーンレンダー・2D ズームパン検証は `TASK-197b` で実施する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx`

### Phase 4: BillboardObjectLayer 移行 & billboard-depth-sort 物理削除

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (252 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (185 lines)
  - `[DELETE]` `src/features/tactical-unified/core/components/billboard-depth-sort.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
- **Contract**:
  ```ts
  export interface BillboardObjectLayerProps {
    stageSize: { width: number; height: number };
    pitchRect: PitchRectBounds;
    editingTextId?: string | null;
    onStartEditText?: (textId: string) => void;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    cleanRender?: boolean;
    listening?: boolean;
    sceneGraph: ResolvedSceneGraphDTO;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `useCanvasStore`・`calculatePitchTransform`・`buildBillboardItems`・`sortBillboardItemsByDepth`・`sortBillboardItemsBySceneGraph`・`billboard-depth-sort` からの再エクスポート（`core/index.ts` L10-L14 含む）を全面撤去する。
    2. `useDocumentStore`（`project`, `dispatchSlide`）と `useSessionStore`（`activePhaseId`, `activeSlideId`, `markerMode`, `selectedObjects`, `activeTool`, `connectingPlayerId`, `teamVisibility`, `selectObject`, `setIsDragging`, `setIsHudOpen`, `setConnectingPlayerId`）へ移行し、`resolvePitchGroupTransform(pitchRect, activeSlide?.pitchTransform)` で `<Group>` 変形を設定する。
    3. `sceneGraph.billboardItems` をそのままマップして `<BillboardItemNode>` を描画する。`teamVisibility !== 'both'` の場合のみ `item.kind === 'player'` かつ `item.player.team !== teamVisibility && item.player.team !== 'neutral'` をフィルタして非表示とする。
    4. `useMarkerDragHandlers` へのコールバック（`updateMarker`, `updateMarkers`, `moveMarkerToBench`）はそれぞれ `dispatchSlide` の `UPDATE_PLAYER`, `MOVE_PLAYERS`, `MOVE_PLAYER_TO_BENCH` を発行し、`capabilities` は `{ hasBench: activePhase?.backgroundType !== 'image', hasBall: activeSlide?.ball.visible ?? false }` を渡す。
    5. テキスト更新は `UPDATE_TEXT`、視野角更新は `SET_PLAYER_VISION_CONE`、コネクトライン接続クリック時は `ADD_CONNECT_LINE` を `dispatchSlide` で発行する。
- **Concrete Test Cases**:
  - `BillboardObjectLayer` 結合検証は `TASK-197b` で実施する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/index.ts`
