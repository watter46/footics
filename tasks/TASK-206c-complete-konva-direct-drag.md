# TASK-206c: 矢印・ボール・ゾーン・ステージの残存ドラッグ再レンダリング完全排除

- **Status**: `DONE`
- **Commit**: `perf(tactical): eliminate remaining React re-renders and duplicate handlers during arrow, ball, and zone drag`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
  - Wave 2: Phase 4, Phase 5 (parallel after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/annotations): ArrowHandlePreviewDelta|ArrowBodyDragDelta|setPreviewHandle|setBodyDragDelta`
  - `rg(src/features/tactical-unified/objects/ball): moveToTop`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 矢印本体・矢印ハンドル（始点・終点・制御点）・ボール・ゾーン・テキストのいずれをドラッグ移動しても、ドラッグ開始〜移動中に React の再レンダリングが一切発生せず、操作確定時（`dragend`）のみ `DocumentStore` へ 1 回確定保存されること。
  2. 矢印の曲線追従（`controlPoint` ドラッグによる 2 次ベジェ分割）、波線追従（`dribble`）、本体ドラッグ時の 3 ハンドル＋ドット追従、およびボールのゴースト軌道追従が従来通り動作すること。
  3. ドラッグ開始時に `sessionStore.setIsDragging(true)` と `setIsHudOpen(false)` が 1 回だけ呼ばれ（`Stage` への二重バブリングなし）、`dragend` で `setIsDragging(false)` が呼ばれること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ArrowObject` の `previewHandle` / `bodyDragDelta` 両 `useState` と `ArrowHandlePreviewDelta` / `ArrowBodyDragDelta` 型を完全廃止し、`startHandleRef` / `endHandleRef` / `controlHandleRef` を介して Konva ノードの `points` と `position` を直接同期する（フォールバック併用禁止）。
  2. `useBallDrag` のローカル `useState(false)`（`isDragging`）と `node.moveToTop()` を廃止し、`BallVisual` の選択枠 `Circle` に `selectionRingRef` を接続して `dragstart` / `dragend` で `.visible(...)` を直接切り替える。`BallGhostTrajectory` は `hasPrevBall && prevBall` 時に事前マウントしておき、`isSelected` 外でも `syncBallDragKonvaNodes` から `.visible(true)` で即表示できるようにする。
  3. `Stage` の `onDragStart` / `onDragEnd` 重複ハンドラ（`CanvasStageContainer.tsx`）を削除し、各ドラッグ可能オブジェクト側で `e.cancelBubble = true` とともに `setIsDragging` / `setIsHudOpen` を単一発火させる。
  4. `Konva.DD.isDragging` 中は `dispatchPointerMove` 内のゾーン回転領域判定（`onRotateMove`）をスキップし、不要な幾何計算・DOM カーソル更新を止める。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`

## 2. Implementation Phases

### Phase 1: 矢印ハンドル群の `ref` 直接操作化 (`onPreviewMove` 廃止)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx` (L1-L62)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx` (L1-L102)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx` (L1-L106)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx` (L1-L122)
- **Contract**:
  ```ts
  // arrow-handles-group.tsx
  export type ArrowHandleKind = 'start' | 'end' | 'control';
  export interface ArrowHandleCommonProps {
    // onPreviewMove を削除し、以下へ置換:
    onHandleDragMove?: (kind: ArrowHandleKind, pxX: number, pxY: number) => void;
    onHandleDragEnd?: () => void;
  }
  // ArrowHandlesGroupProps に startHandleRef / endHandleRef / controlHandleRef を追加
  ```
  - 振る舞い仕様・境界条件:
    1. `ArrowStartHandle`, `ArrowEndHandle`, `ArrowControlPoints` にそれぞれ `handleRef?: React.Ref<Konva.Circle>` を受け取り `<Circle ref={handleRef} ... />` に接続する。
    2. `onDragMove` では `onHandleDragMove?.(kind, pos.x, pos.y)` を呼び、`onDragEnd` では `onHandleDragEnd?.()` を呼んで `updateArrow` を実行する。
- **Concrete Test Cases**:
  - Phase 4 の `arrow-object-interaction.test.tsx` で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`

### Phase 2: `BallObject` / `useBallDrag` のローカル `isDragging` state 廃止
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (L1-L125)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (L130-L232)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-visual.tsx` (L1-L70)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (L15-L75)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useBallDrag` から `useState(false)`（`isDragging`）と `node.moveToTop()` を削除する。代わりに `useSessionStore((s) => s.setIsDragging)` と `selectionRingRef?: React.RefObject<Konva.Circle | null>` を受け取り、`handleDragStart` で `e.cancelBubble = true`, `setIsDragging(true)`, `setIsHudOpen(false)`, `selectionRingRef?.current?.visible(false)` を行い、`handleDragEnd` で `setIsDragging(false)` と `selectionRingRef?.current?.visible(Boolean(isSelected))` を行う。
    2. `BallVisual` に `selectionRingRef?: React.Ref<Konva.Circle>` を追加し、選択リング `<Circle ref={selectionRingRef} visible={!cleanRender && isSelected} ... />` とする。
    3. `BallGhostTrajectory` は `!cleanRender && hasPrevBall && prevBall` の条件でマウントしておき、`GhostTrajectoryArrow` の初期表示可否は `isSelected && isBallMoved` に委ね、非選択からの `dragmove` 時にも `syncBallDragKonvaNodes` が `.visible(true)` に切り替えられるようにする。
- **Concrete Test Cases**:
  - 既存 `ball-object.test.tsx`, `ball-ghost-trajectory.test.tsx`, `tracking-arrow-and-ball-trajectory.test.ts` の PASS で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/objects/ball/components/ball-visual.tsx src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`

### Phase 3: `ZoneShapeNode` の `useEffect` 安定化 ＆ ドラッグ中 `onPointerMove` 回転判定スキップ
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/use-zone-shape.ts` (L50-L72)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (L40-L70)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts` (L95-L135)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts` (L68-L96)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `use-zone-shape.ts` の `Transformer` 同期 `useEffect` 依存配列から `zone` オブジェクト全体を外し、`[isSelected, effectivePxW, effectivePxH, resolvedRotationDeg, zone.id, zone.locked, shapeType]` のプリミティブ値のみにする。
    2. `ZoneShapeNode.tsx` の `handleDragStart` / `handleDragEnd` に `e.cancelBubble = true` を追加し、`handleDragMove` の不要な `transformerRef.current?.getLayer()?.batchDraw()` を整理する（`Konva.Transformer` はアタッチ先ノードの `dragmove` に自動追従するため `forceUpdate` 不要）。
    3. `canvas-pointer-dispatcher.ts` の `dispatchPointerMove` で、`Konva.DD.isDragging` が `true` の間は `opts.onRotateMove`（`checkCornerRotateZone` と DOM `style.cursor` 更新）をスキップする。
- **Concrete Test Cases**:
  - 既存 `zone-object-components.test.ts`, `use-canvas-pointer.test.ts` の PASS で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/use-zone-shape.ts src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts`

### Phase 4: `ArrowObject` / `ArrowLineNode` の完全 Konva 直接同期化 ＆ テスト更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L35-L216)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (L11-L138)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx` (L94-L255)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `ArrowObject` から `previewHandle` / `bodyDragDelta` の両 `useState` を完全に削除し、`startHandleRef`, `endHandleRef`, `controlHandleRef` を保持する。
    2. `handleHandleDragMove(kind, pxX, pxY)` は各 ref（未操作端点は `resolvedArrow` 基準座標）から `sPx`, `ePx`, `midHandlePx` を算出し、`isWavy` (`generateWavyLinePoints`) / 曲線 (`subdivideQuadraticBezier`) / 直線 (`[sx, sy, ex, ey]`) で `arrowRef.current.points(...)`, `startDotRef`, `endDotRef`, `controlHandleRef` を直接更新して `arrowRef.current.getLayer()?.batchDraw()` を呼ぶ。
    3. `ArrowLineNode` の `onDragMove` は `onBodyDragMove?.(node.x(), node.y())` を呼び、`ArrowObject` 側が `startDotRef`, `endDotRef`, `startHandleRef`, `endHandleRef`, `controlHandleRef` の `position` を直接オフセット更新して `batchDraw()` する。`onDragEnd` 時は `node.position({ x: 0, y: 0 })` に戻しつつ `onBodyDragMove?.(0, 0)` で ref 座標をリセットする。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 `Konva.Stage` / `Layer` 接続）:
    - `case 1`〜`case 4`: 既存の制御点配置・ベジェ追従・波線追従・本体ドラッグ時の 3 ハンドル座標追従がすべて PASS し、さらに `dragmove` 中に親 `ArrowObject` の React 再レンダリング回数が 0 回増加であることを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/ArrowObject.tsx src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`

### Phase 5: `Stage` 重複 `onDragStart` 撤去と各オブジェクトの `cancelBubble` 統一
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (L55-L62, L137-L170)
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (L64-L165)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (L60-L80)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/TextObject.tsx` (L75-L92)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `CanvasStageContainer.tsx` の `stageHandlers` から `onDragStart` / `onDragEnd`（および不要なら `setIsDragging` / `setIsHudOpen` 購読）を削除し、`Stage` レベルでの二重 Store 更新を廃止する。
    2. `useMarkerDragHandlers`（`handleDragStart`, `handleDragEnd`）、`ZonePolygonNode`（`onDragStart`）、`TextObject`（`onDragStart`）に `e.cancelBubble = true` を設定する。
- **Concrete Test Cases**:
  - 既存 `use-marker-drag-handlers-hud.test.tsx`, `canvas-stage-container.test.tsx`, `zone-object-components.test.ts` の PASS で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/core/components/annotations/TextObject.tsx`
