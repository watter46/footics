# TASK-205d: ドラッグハンドラの Konva 直接同期切替と UI 層 `activeDragDelta` 切り離し

- **Status**: `DONE`
- **Commit**: `perf(tactical): switch marker and ball drag to direct Konva sync without React re-renders`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3, Phase 4, Phase 5 (parallel after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core,src/features/tactical-unified/objects,src/features/tactical-unified/hooks): activeDragDelta|setActiveDragDelta|scheduleDragDelta`
  - `absent: src/features/tactical-unified/core/components/__tests__/drag-raf-throttling.test.tsx`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 選手マーカー（単体・複数選択）およびボールの `dragmove` 中、`sessionStore.setActiveDragDelta`・`useResolvedSceneGraph`・`documentStore` のいずれも一切更新されないこと（React 再レンダリング 0 回）。
  2. `dragmove` 中に他選択マーカー、ゴースト軌道（カーブハンドル・ゴーストマーカー含む）、コネクト線、選手追従矢印が Konva ノード直接操作で 0 フレーム遅延追従すること。
  3. `dragend` 時のみ最終座標が `documentStore`（`updateMarker`/`updateMarkers` または `UPDATE_BALL`）へ 1 回だけ確定コミットされ、ベンチドロップ判定も維持されること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useMarkerDragHandlers` と `useBallDrag` から `scheduleDragDelta`・`cancelPendingDragDelta`・rAF スロットリング・`setActiveDragDelta` 呼び出しを完全に削除し、`syncPlayerDragKonvaNodes` / `syncBallDragKonvaNodes` の直接呼び出しへ置換する。
  2. `PitchGroundGhostsProps` から `activeDragDelta` を削除し、`PitchGroundLayer` / `useResolvedSceneGraph` / `BallObject` からの `activeDragDelta` 購読と `resolveEffectiveScreenNormPos` 呼び出しをすべて削除する。
  3. rAF スロットリング専用の旧テスト `drag-raf-throttling.test.tsx` は `[DELETE]` し、直接同期と Store 非更新を各コンポーネントテストで検証する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`

## 2. Implementation Phases

### Phase 1: `useMarkerDragHandlers` / `useBallDrag` / `BallObject` の直接同期切替
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (L1-L230)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (L1-L162)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (L30-L176)
- **Contract**:
  ```ts
  // use-ball-drag.ts
  interface UseBallDragProps {
    stageSize: { width: number; height: number };
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `useMarkerDragHandlers` の `handleMarkerDragMove` は、複数選択時は各マーカーの移動先 `(initial.pxX + deltaX, initial.pxY + deltaY)` を、単体時は `(curX, curY)` を `movedPlayers` に詰めて `syncPlayerDragKonvaNodes` を呼ぶ。`scheduleDragDelta` / `rafIdRef` / `setActiveDragDelta` は全削除する。
    2. `useBallDrag` の `handleDragMove` は `nodesRegistryRef?.current` があれば `syncBallDragKonvaNodes({ registry, ballPx: { x: node.x(), y: node.y() }, stageSize })` を呼ぶ。`setActiveDragDelta` と rAF 制御は全削除する。
    3. `BallObject`（`useBallObjectState`）から `activeDragDelta` 購読と `resolveEffectiveScreenNormPos` を削除し、`useBallDrag({ stageSize, nodesRegistryRef })` へ `nodesRegistryRef` を渡す。
- **Concrete Test Cases**:
  - Phase 3, 4, 5 のテストで検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx`

### Phase 2: `useResolvedSceneGraph` / `PitchGroundLayer` / `PitchGroundGhosts` の `activeDragDelta` 削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (L106-L164)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L58-L80, L255-L280)
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx` (L18-L75)
- **Contract**:
  ```ts
  // pitch-ground-ghosts.tsx
  export interface PitchGroundGhostsProps {
    visibleMarkers: readonly DomainPitchPlayer[];
    prevPlayers: readonly DomainPitchPlayer[];
    selectedIds: readonly string[];
    stageSize: { width: number; height: number };
    activeSlideId: string;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    aspectRatio?: AspectRatio;
    onUpdateTrajectory: (
      slideId: string,
      playerId: string,
      trajectory: DomainPlayerTrajectory | undefined,
    ) => void;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `useResolvedSceneGraph` から `activeDragDelta` の購読および `session` オブジェクトへの含め込みを削除する。
    2. `PitchGroundLayer` から `activeDragDelta` の購読および `<PitchGroundGhosts activeDragDelta={...} />` 渡しを削除する。
    3. `PitchGroundGhosts` から `activeDragDelta` prop と `resolveEffectiveScreenNormPos` 呼び出しを削除する。
- **Concrete Test Cases**:
  - Phase 3 で `pitch-ground-drag-ghost.test.tsx` を更新して検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx`

### Phase 3: `drag-raf-throttling.test.tsx` 削除 ＆ ゴースト・ボール UI テスト更新
- **Target Files**:
  - `[DELETE]` `src/features/tactical-unified/core/components/__tests__/drag-raf-throttling.test.tsx`
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx` (L70-L214)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx` (L115-L190)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `pitch-ground-drag-ghost.test.tsx`: `DragDeltaSetter` / `activeDragDelta` を削除し、選択された選手（前スライドと同座標）に対して `ghost-trajectory-<id>` が事前マウントされ、`nodesRegistryRef.current.trajectoryArrowNodes.get(id)` に登録されること、および距離 `< 4px` 時は `groupNode.visible()` が `false`、移動後は `syncPlayerDragKonvaNodes` により `true` になることを検証する。
    2. `ball-object.test.tsx`: `dragmove` 中に `documentStore.past.length === 0` のまま `nodesRegistryRef.current.trajectoryArrowNodes.get('ball')?.groupNode?.visible()` 等が直接更新され、`dragend` で `documentStore` のボール座標が確定保存されることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx`:
    - `case 1`: 選択中選手（前スライドと同座標）が `PitchGroundLayer` で事前マウントされ、初期 `groupNode.visible() === false` であること。
    - `case 2`: `syncPlayerDragKonvaNodes` で移動距離 `>= 4px` にすると `groupNode.visible() === true` かつ `arrowNode.points()` 終点が更新されること。
  - `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`:
    - `case 1`: ボール `dragmove` 中、`documentStore.past.length === 0` かつ `sessionStore.activeDragDelta === null` のままゴースト軌道 Konva ノードが同期更新されること。
    - `case 2`: ボール `dragend` で `documentStore` 座標更新かつ `past.length === 1` になること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`

### Phase 4: `player-connect-lines.test.tsx` の更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` (L225-L304)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useMarkerDragHandlers` のテストを、`handleMarkerDragMove` 呼び出し時に `sessionStore.activeDragDelta` を更新せず（`null` のまま）、`nodesRegistryRef` 上の `connectLineNodes` と `trajectoryArrowNodes` が直接更新され、`handleDragEnd` で `updateMarker` が呼ばれることを検証する形に更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`（実 `Konva.Line` / `Konva.Arrow` + `TacticalStoreProvider` 接続）:
    - `case 1`: `handleMarkerDragMove` で `sessionStore.activeDragDelta` は `null` のまま、`connectLineNodes` の `coreNode.points()` が新座標に即時更新される。
    - `case 2`: `handleDragEnd` で `updateMarker` が最終座標で呼ばれる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`

### Phase 5: `tracking-arrow-and-ball-trajectory.test.ts` の更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts` (L254-L370)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `BallObject: ドラッグ中のリアルタイムゴースト軌道追従` テストから `setActiveDragDelta` 呼び出しを削除し、実際の Konva ドラッグイベント（`dragstart` → `position` 更新 → `dragmove`）により `nodesRegistryRef.current.trajectoryArrowNodes.get('ball')` の `groupNode.visible()` と `arrowNode.points()` 終点が直接追従することを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`:
    - `case 1`: 前スライドと同座標のボールを選択し `ballNode` を `dx = +12%` 相当移動して `dragmove` 発火すると、`trajectoryArrowNodes.get('ball').groupNode.visible() === true` かつ矢印終点が移動先ピクセル座標に一致する。
    - `case 2`: 移動距離 `< 4px` のときは `groupNode.visible() === false` のままである。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`
