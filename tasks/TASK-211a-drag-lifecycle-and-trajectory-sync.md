# TASK-211a: 共通ドラッグライフサイクルとリアルタイム軌道追従の統一

- **Status**: `DONE`
- **Commit**: `fix(tactical): unify drag lifecycle and realtime trajectory sync for ball and markers`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3, Phase 4 (parallel after Wave 1)
  - Wave 3: Phase 5 (sequential after Wave 2)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/utils/drag-konva-sync.ts): const trajectoryEntry = registry\.trajectoryArrowNodes\.get`
  - `rg(src/features/tactical-unified/objects/ball): setIsDragging\(true\);`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ドラッグ中は `documentStore`（`past` Undo履歴）を一切更新せず、`nodesRegistryRef` 経由で Konva ノードを直接更新して描画追従する。ドロップ時（`dragend`）のみ 1 操作として `dispatchSlide` する。
  2. `cleanRender === true`（エクスポート・動画再生・プレビュー）のときは、`BallObject` および全盤面要素の `draggable` は `false`、編集用ゴースト軌道・ハンドル（`BallGhostTrajectory` / `PitchGroundGhosts`）は非表示を維持する。
  3. 既存の 4px 移動しきい値（`TRAJECTORY_VISIBILITY_THRESHOLD_PX`）および 2次ベジェ曲線制御点計算式（`M = 0.25*P0 + 0.5*CP + 0.25*P1`）は維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. ボール（`BallObject` / `useBallDrag`）の未選択ドラッグ漏れと `isDragging` 未伝達を解消するため、全盤面オブジェクト共通の `useObjectDragLifecycle` フックを `core/hooks/` に新設する。
  2. 移動軌跡エフェクト線（`sceneGraph.trajectories` の `Line`）もゴースト軌道矢印（`trajectoryArrowNodes`）と同じく `CanvasNodesRegistry.trajectoryEffectLines` へ登録し、共通関数 `syncObjectTrajectoryKonva` で同時にリアルタイム同期する（片側のみのフォールバックは禁止）。
  3. `BallObjectProps.isInteractive` は既存テストの後方互換のため optional（デフォルト `true`）とし、`BillboardItemNode` から `!cleanRender && isInteractive` を渡すことで非 `select` ツール時の誤ドラッグを防止する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/utils/canvas-registry.ts`
  - `src/features/tactical-unified/core/utils/drag-konva-sync.ts`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx`
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
  - `src/features/tactical-unified/objects/ball/types.ts`
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`

## 2. Implementation Phases

### Phase 1: 共通ドラッグライフサイクルフックの作成
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts` (~75 lines)
  - `[ADD]` `src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx` (~110 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  ```ts
  export interface UseObjectDragLifecycleOptions {
    readonly isSelected: boolean;
    readonly onSelect?: (isShift: boolean, e: KonvaEventObject<DragEvent>) => void;
    readonly reopenHudOnEnd?: boolean;
    readonly cancelBubble?: boolean;
  }

  export interface UseObjectDragLifecycleResult {
    readonly isDragging: boolean;
    readonly beginDrag: (e: KonvaEventObject<DragEvent>) => void;
    readonly endDrag: () => void;
  }

  export function resolveEffectiveDragSelectedIds(
    selectedIds: readonly string[],
    targetId: string,
    isShift: boolean,
  ): readonly string[];

  export function useObjectDragLifecycle(
    options: UseObjectDragLifecycleOptions,
  ): UseObjectDragLifecycleResult;
  ```
  - 振る舞い仕様・境界条件:
    1. `beginDrag(e)`: `cancelBubble`（デフォルト `true`）が有効なら `e.cancelBubble = true`。`useSessionStore` の `setIsDragging(true)`・`setIsHudOpen(false)` とローカル `setIsDragging(true)` を実行する。`!isSelected && onSelect` なら `(e.evt as MouseEvent | undefined)?.shiftKey` を `Boolean(...)` で取得し `onSelect(isShift, e)` を呼ぶ。
    2. `endDrag()`: `useSessionStore` の `setIsDragging(false)` とローカル `setIsDragging(false)` を実行する。`reopenHudOnEnd` が `true` のときのみ `setIsHudOpen(true)` を呼ぶ。
    3. `resolveEffectiveDragSelectedIds(selectedIds, targetId, isShift)`: すでに `selectedIds.includes(targetId)` なら `selectedIds` をそのまま返し、未選択かつ `isShift === true` なら `[...selectedIds, targetId]`、それ以外は `[targetId]` を返す。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: `isSelected=false` で `beginDrag(e)` ➔ `isDragging===true`、sessionStore の `isDragging===true`, `isHudOpen===false`、`onSelect(false, e)` が 1 回呼ばれる。`endDrag()` で `isDragging===false` に戻る。
    - `case 2`: `isSelected=true` で `beginDrag(e)` ➔ `onSelect` は呼ばれない。`reopenHudOnEnd=true` 時は `endDrag()` で `isHudOpen===true` になる。
    - `case 3`: `resolveEffectiveDragSelectedIds(['p1'], 'p2', true)` ➔ `['p1', 'p2']`、同 `isShift=false` ➔ `['p2']`、`['p1', 'p2']` に `'p1'` ➔ `['p1', 'p2']`。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx`

### Phase 2: 共通軌道 Konva 同期基盤の統合
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-registry.ts` (L29-L84)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/drag-konva-sync.ts` (L1-L245)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts` (L1-L179)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/trajectory/index.ts`
- **Contract**:
  ```ts
  export interface TrajectoryEffectLineEntry {
    lineNode: Konva.Line | null;
    startPx: { x: number; y: number };
    trajectory?: DomainPlayerTrajectory;
  }

  export function computeKonvaTrajectoryPoints(
    startPx: { x: number; y: number },
    endPx: { x: number; y: number },
    trajectory: DomainPlayerTrajectory | undefined,
    stageSize: { width: number; height: number },
  ): { points: number[]; handleMidPx: { x: number; y: number } };

  export function syncTrajectoryEffectLineKonva(
    entry: TrajectoryEffectLineEntry,
    endPx: { x: number; y: number },
    stageSize: { width: number; height: number },
  ): Konva.Layer | null;

  export function syncObjectTrajectoryKonva(
    registry: CanvasNodesRegistry,
    objectId: string,
    endPx: { x: number; y: number },
    stageSize: { width: number; height: number },
  ): Konva.Layer[];
  ```
  - 振る舞い仕様・境界条件:
    1. `CanvasNodesRegistry` に `trajectoryEffectLines: Map<string, TrajectoryEffectLineEntry>` を追加し、`createCanvasNodesRegistry()` で `new Map()` 初期化する。
    2. `computeKonvaTrajectoryPoints`: `trajectory !== undefined && trajectory.type !== 'straight'` なら `getBezierControlPointPx` + `getQuadraticBezierPoints` と `getBezierMidpoint` を返し、直線なら `[startPx.x, startPx.y, endPx.x, endPx.y]` と中点を返す。
    3. `syncTrajectoryEntryKonva` と `syncTrajectoryEffectLineKonva` はどちらも `computeKonvaTrajectoryPoints` と `TRAJECTORY_VISIBILITY_THRESHOLD_PX` (`4px`) を使用する。
    4. `syncObjectTrajectoryKonva` は `registry.trajectoryArrowNodes.get(objectId)` と `registry.trajectoryEffectLines?.get(objectId)` の両方を更新し、見つかった `Konva.Layer` 配列を返す。
    5. `syncPlayerDragKonvaNodes` と `syncBallDragKonvaNodes` はどちらも `syncObjectTrajectoryKonva` のみを呼び（個別の `trajectoryArrowNodes.get` を廃止）、返却されたレイヤーを `dirtyLayers` / `batchDraw()` する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts`:
    - 既存 4 ケースを維持しつつ、以下を追加:
    - `case 5`: `trajectoryEffectLines` に `'ball'` と `'p1'` が登録された状態で `syncBallDragKonvaNodes` / `syncPlayerDragKonvaNodes` を呼ぶと、直線および `arc_left` 曲線で `lineNode.points()` と `lineNode.visible()`（4px境界）が同期更新される。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-registry.ts src/features/tactical-unified/core/utils/drag-konva-sync.ts src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts`

### Phase 3: 移動軌跡エフェクト線の Konva 登録とゴースト表示整合
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/components/trajectory-effect-line.tsx` (~95 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L150-L273)
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx` (L16-L61)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx` (L75-L211)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts`
  - `src/lib/tactical/engine/coordinates.ts`
- **Contract**:
  ```ts
  export interface TrajectoryEffectLineProps {
    playerId: string;
    flatPointsPx: readonly number[];
    color: string;
    dashArrayPx: readonly number[];
    startPx: { x: number; y: number };
    trajectory?: DomainPlayerTrajectory;
    stageSize: { width: number; height: number };
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  }
  export const TrajectoryEffectLine: React.MemoExoticComponent<...>;
  ```
  - 振る舞い仕様・境界条件:
    1. `TrajectoryEffectLine` は `<Line>` を描画し、`useEffect` で `nodesRegistryRef.current.trajectoryEffectLines.set(playerId, { lineNode, startPx, trajectory })` を登録・unmount 時に delete する。さらにマウント/更新時、`playerId === 'ball' ? registry.ballNode : registry.playerNodes.get(playerId)` が存在し最終点と `> 0.01px` ズレていれば即 `syncTrajectoryEffectLineKonva(entry, currentPos, stageSize)` で追いつく。
    2. `PitchGroundLayer` は `sceneGraph.trajectories` を `TrajectoryEffectLine` で描画する（`startPx` は `prevSlide` のボールまたは選手座標から `screenNormToStagePixel` で算出、`trajectory` は現在スライドの `ball.trajectory` または `visibleMarkers` から取得）。
    3. `PitchGroundGhosts` は `isDragging?: boolean`（または `selectedIds` に加えてドラッグ中の追従保証）に対応し、`PitchGroundLayer` から `useSessionStore((s) => s.isDragging)` 連携を含め選択中・ドラッグ中の不整合なくゴーストをマウントする。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx`:
    - 既存 case 1, 2 を維持しつつ追加:
    - `case 3`: `trajectoryEffect.enabled === true` の非選択ボール・非選択選手に対して `PitchGroundLayer` が `nodesRegistryRef.current.trajectoryEffectLines` に `'ball'` / `'p-1'` を登録し、`syncBallDragKonvaNodes` / `syncPlayerDragKonvaNodes` で `<Line>` の終点が即座に追従する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/trajectory-effect-line.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx src/features/tactical-unified/core/components/__tests__/pitch-ground-drag-ghost.test.tsx`

### Phase 4: ボールの共通ドラッグライフサイクル適用と軌道追従修正
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts` (L1-L137)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/types.ts` (L6-L12)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (L32-L239)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx` (L118-L165)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`
- **Contract**:
  ```ts
  // objects/ball/types.ts
  export interface BallObjectProps {
    ball: DomainBallState;
    resolvedBall: ResolvedBillboardBallItem;
    stageSize: { width: number; height: number };
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    cleanRender?: boolean;
    isInteractive?: boolean;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `useBallDrag` は `useObjectDragLifecycle({ isSelected: Boolean(isSelected), onSelect: (isShift) => selectObject({ id: 'ball', kind: 'ball' }, isShift) })` を使用し、`handleDragStart` で `beginDrag(e)`、`handleDragEnd` で `endDrag()` を呼ぶ。戻り値に `isDragging` を追加する。
    2. `BallObject` は `isInteractive = true` をデフォルトとし、`<Group draggable={!cleanRender && isInteractive && !ball.locked}>` を設定する。
    3. `BallObject` は `<BallGhostTrajectory isSelected={isSelected} isDragging={drag.isDragging} ... />` を必ず渡す。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`:
    - `case 1`: 手動で `trajectoryArrowNodes.set('ball', ...)` を事前注入せずとも、2スライド目以降で未選択の `BallObject` に `dragstart` ➔ `dragmove` を発火すると、`sessionStore.selectedObjects` に `'ball'` が入り、`BallGhostTrajectory` がマウントされて `trajectoryArrowNodes.get('ball').groupNode.visible() === true` かつ矢印終点が移動先に一致し、`documentStore.past` は空のままであること。
    - `case 2`: `isInteractive={false}` のとき `ballNode.draggable() === false` であること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts src/features/tactical-unified/objects/ball/types.ts src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/objects/ball/__tests__/ball-object.test.tsx`

### Phase 5: BillboardItemNode 接続とボール軌道ONドラッグ統合検証
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (L128-L148)
  - `[ADD]` `src/features/tactical-unified/__tests__/ball-trajectory-drag-realtime.test.tsx` (~135 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `BillboardItemNode` の `item.kind === 'ball'` 分岐で `<BallObject ... isInteractive={!cleanRender && isInteractive} />` を渡す。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/ball-trajectory-drag-realtime.test.tsx`（実 `TacticalStoreProvider` + `PitchGroundLayer` + `BillboardItemNode` 接続）:
    - `case 1`: 2スライド構成で `ball.trajectoryEffect.enabled === true` かつ未選択状態で `BallObject` を `dragstart` ➔ `dragmove` したとき、`sessionStore.selectedObjects` が `'ball'` に更新され、`nodesRegistryRef.current.trajectoryArrowNodes.get('ball')` が移動先座標へ即座に追従し、`dragend` で確定すること。
    - `case 2`: `isInteractive={false}`（選択ツール以外）ではボールの `draggable()` が `false` であること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/billboard-item-node.tsx src/features/tactical-unified/__tests__/ball-trajectory-drag-realtime.test.tsx`
