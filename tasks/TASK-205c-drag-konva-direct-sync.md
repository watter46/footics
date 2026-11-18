# TASK-205c: ドラッグ中の Konva 直接同期パイプライン整備とゴースト軌道事前マウント

- **Status**: `DONE`
- **Commit**: `perf(tactical): add Konva direct drag sync pipeline and pre-mount ghost trajectories`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential)
  - Wave 2: Phase 2, Phase 3, Phase 4 (parallel after Wave 1)
  - Wave 3: Phase 5 (sequential after Wave 2)
- **Negative Contracts**:
  - `none`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 本タスク完了時点で既存の `activeDragDelta` 契約・テストはすべて維持され、次タスク `TASK-205d` でドラッグハンドラを直接同期へ切り替える土台を完成させること。
  2. 前スライドと同一座標から選手・ボールをドラッグ開始した場合でも、ゴースト軌道の Konva ノードが事前マウントされており、`visible` 切替のみで 0 遅延表示できること。
  3. ゴースト軌道の曲線（`custom` / `arc_left` / `arc_right`）および追従矢印（波線・曲線・端点半径オフセット）の幾何計算は既存の `trajectory.ts` / `geometry-primitives.ts` を再利用し、計算結果を完全に一致させること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ResolvedArrowPrimitive` に `sourceRadiusPx?: number` と `targetRadiusPx?: number` をオプショナル追加し、`ArrowObject` から `ArrowNodeEntry` へ登録する。
  2. `drag-konva-sync.ts` は React に一切依存せず、`CanvasNodesRegistry` 上の Konva ノードを直接更新して必要なレイヤーだけ `batchDraw()` を呼ぶ。
  3. ゴースト軌道が `playerNodes` より先にマウントされても座標がズレないよう、`useGhostTrajectoryArrow` マウント時に `playerNodes.get(playerId)` があれば現在座標で即時同期する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`

## 2. Implementation Phases

### Phase 1: DTO 半径拡張と `CanvasNodesRegistry` 拡張
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/scene-graph-dto.ts` (ResolvedArrowPrimitive, L34-L55)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts` (compileArrows, L135-L255)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-registry.ts` (L1-L45)
- **Contract**:
  ```ts
  // canvas-registry.ts 拡張フィールド
  export interface ArrowNodeEntry {
    node: Konva.Arrow | null;
    startHandleNode?: Konva.Circle | null;
    endHandleNode?: Konva.Circle | null;
    controlHandleNode?: Konva.Circle | null;
    startDotNode?: Konva.Circle | null;
    endDotNode?: Konva.Circle | null;
    sourcePlayerId?: string;
    targetPlayerId?: string;
    arrowType?: DomainArrowAnnotation['arrowType'];
    curveType?: DomainArrowAnnotation['curveType'];
    startMarker?: DomainArrowAnnotation['startMarker'];
    endMarker?: DomainArrowAnnotation['endMarker'];
    startPx?: { x: number; y: number };
    endPx?: { x: number; y: number };
    controlPointPx?: { x: number; y: number };
    sourceRadiusPx?: number;
    targetRadiusPx?: number;
    dotRadiusPx?: number;
  }
  export interface TrajectoryArrowNodeEntry {
    groupNode?: Konva.Group | null;
    ghostGroupNode?: Konva.Group | null;
    arrowNode: Konva.Arrow | null;
    controlHandleNode?: Konva.Circle | null;
    startPx: { x: number; y: number };
    startPos: { x: number; y: number };
    endPos?: { x: number; y: number };
    trajectory?: DomainPlayerTrajectory;
  }
  export interface ConnectLineNodeEntry {
    glowNode?: Konva.Line | null;
    highlightNode?: Konva.Line | null;
    coreNode?: Konva.Line | null;
    fromPlayerId?: string;
    toPlayerId?: string;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `compileArrows` は返却する `ResolvedArrowPrimitive` に `sourceRadiusPx: sourceRadius` と `targetRadiusPx: targetRadius` を含める。
    2. `canvas-registry.ts` の追加フィールドはすべてオプショナルとし、既存リテラル構築箇所を破壊しない。
- **Concrete Test Cases**:
  - `tsc` 整合と Phase 2 の単体テストで検証。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/compile-arrows.ts src/features/tactical-unified/core/utils/canvas-registry.ts`

### Phase 2: `drag-konva-sync.ts` 新規作成と実 Konva 単体テスト
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/utils/drag-konva-sync.ts` (~160 lines)
  - `[ADD]` `src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts` (~150 lines)
- **Contract**:
  ```ts
  export function syncTrajectoryEntryKonva(
    entry: TrajectoryArrowNodeEntry,
    endPx: { x: number; y: number },
    stageSize: { width: number; height: number },
  ): Konva.Layer | null;

  export function syncPlayerDragKonvaNodes(params: {
    registry: CanvasNodesRegistry;
    movedPlayers: ReadonlyMap<string, { xPx: number; yPx: number }>;
    primaryPlayerId?: string;
    stageSize: { width: number; height: number };
  }): void;

  export function syncBallDragKonvaNodes(params: {
    registry: CanvasNodesRegistry;
    ballPx: { x: number; y: number };
    stageSize: { width: number; height: number };
  }): void;
  ```
  - 振る舞い仕様・境界条件:
    1. `syncTrajectoryEntryKonva`: `dist = Math.hypot(endPx.x - entry.startPx.x, endPx.y - entry.startPx.y)` が `>= 4` のとき `groupNode.visible(true)`・`ghostGroupNode?.visible(true)`、`< 4` のとき `false` に設定する。曲線判定時は `getBezierControlPoint`, `getQuadraticBezierPoints`, `getBezierMidpoint` を用いて `arrowNode.points(...)` と `controlHandleNode.position(...)` を更新する。
    2. `syncPlayerDragKonvaNodes`: ① `primaryPlayerId` 以外の `movedPlayers` に含まれる `playerNodes` の `.position({ x, y })` 更新、② 各 `movedPlayers` の `trajectoryArrowNodes` 更新、③ `fromPlayerId` または `toPlayerId` が `movedPlayers` に含まれる `connectLineNodes` の `.points([fx, fy, tx, ty])` 更新、④ `sourcePlayerId` または `targetPlayerId` が `movedPlayers` に含まれる `arrowNodes` の `offsetArrowEndpoints` + 波形/ベジェ/直線点計算による `.points(...)` と `startDotNode`/`endDotNode` 位置更新、⑤ 変更が発生した `Konva.Layer`（`Set<Konva.Layer>` で重複排除）に `layer.batchDraw()` を実行。
    3. `syncBallDragKonvaNodes`: `registry.trajectoryArrowNodes.get('ball')` に対し `syncTrajectoryEntryKonva` を呼び、変更レイヤーに `batchDraw()` を実行。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts`（実 `Konva.Stage` / `Layer` / `Group` / `Arrow` / `Line` / `Circle` 使用、モック禁止）:
    - `case 1`: 移動距離 `< 4px` のとき `groupNode.visible()` と `ghostGroupNode.visible()` が `false` になり、`>= 4px` で `true` かつ `arrowNode.points()` 終点が `endPx` と一致する。
    - `case 2`: `trajectory.type = 'arc_left'` のとき `arrowNode.points()` がベジェ多点になり `controlHandleNode.position()` が中点弧頂点に一致する。
    - `case 3`: 2選手のコネクト線および `sourcePlayerId` 付き追従矢印が、選手移動後の座標（および半径オフセット）に同期更新される。
    - `case 4`: 複数選択で `primaryPlayerId` 以外の他マーカー `playerNode` 座標も同期移動する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/drag-konva-sync.ts src/features/tactical-unified/core/utils/__tests__/drag-konva-sync.test.ts`

### Phase 3: `GhostTrajectoryArrow` / `PlayerGhostTrajectory` の同期対応
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/types.ts` (L1-L15)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts` (L10-L66)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx` (L26-L95)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx` (L30-L60)
- **Contract**:
  ```ts
  // objects/arrow/types.ts
  export interface GhostTrajectoryArrowProps {
    // 既存プロパティに加え:
    ghostGroupRef?: React.RefObject<Konva.Group | null>;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `PlayerGhostTrajectory` で `ghostGroupRef = useRef<Konva.Group>(null)` を生成し、前スライドゴーストマーカーの `<Group ref={ghostGroupRef} x={sPxX} y={sPxY} visible={isMoved} ...>`（`isMoved = Math.hypot(ePxX - sPxX, ePxY - sPxY) >= 4`）に設定して `<GhostTrajectoryArrow ghostGroupRef={ghostGroupRef} ... />` へ渡す。
    2. `useGhostTrajectoryArrow` は `trajectoryArrowNodes.set(playerId, { ..., ghostGroupNode: ghostGroupRef?.current ?? null, endPos })` を登録し、直後に `playerNodes.get(playerId)`（または `playerId === 'ball'` 時は `ballNode`）が存在しドラッグ中の位置ズレがあれば `syncTrajectoryEntryKonva` で即時位置同期する。
- **Concrete Test Cases**:
  - `TASK-205d` の UI 統合テスト（`pitch-ground-drag-ghost.test.tsx`, `tracking-arrow-and-ball-trajectory.test.ts`）で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/arrow/types.ts src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx`

### Phase 4: 事前マウントとコネクト線・矢印ノード登録の整備
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx` (L34-L75)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (L30-L76)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectLines.tsx` (L1-L59)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (L54-L65)
- **Contract**:
  ```ts
  // PlayerConnectLines.tsx
  export interface PlayerConnectLinesProps {
    // 既存プロパティに加え:
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `PitchGroundGhosts` は `selectedIds.includes(marker.id) || isDragged` かつ `prevPlayer` が存在する場合、距離 `< 1.0` でも `<PlayerGhostTrajectory>` をマウントする（初期表示可否は `PlayerGhostTrajectory` / `GhostTrajectoryArrow` の `visible={isMoved}` に委ねる）。
    2. `BallGhostTrajectory` は `hasPrevBall && prevBall` かつ `isSelected || isDragging` の場合、`isBallMoved` が `false` でもマウントし、`BallGhost` を `<Group ref={ghostGroupRef} visible={isBallMoved}>` で囲んで `GhostTrajectoryArrow` に `ghostGroupRef` を渡す。
    3. `PlayerConnectLines` は `ref` 登録時に `connectLineNodesRef.current` だけでなく `nodesRegistryRef?.current?.connectLineNodes.set(cl.id, { coreNode: node, fromPlayerId: cl.fromPlayerId, toPlayerId: cl.toPlayerId })` も同期登録・解除する。
    4. `ArrowObject` は `registry.arrowNodes.set(arrow.id, ...)` に `startDotNode`, `endDotNode`, `sourcePlayerId`, `targetPlayerId`, `arrowType`, `curveType`, `startMarker`, `endMarker`, `startPx`, `endPx`, `controlPointPx`, `sourceRadiusPx`, `targetRadiusPx`, `dotRadiusPx` を登録する。
- **Concrete Test Cases**:
  - `TASK-205d` の UI 統合テストで検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/pitch-ground-ghosts.tsx src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx src/features/tactical-unified/core/components/PlayerConnectLines.tsx src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`

### Phase 5: `PitchGroundLayer` から `PlayerConnectLines` への `nodesRegistryRef` 受け渡し
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (`PlayerConnectLines`, L220-L245)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `<PlayerConnectLines>` に `nodesRegistryRef={nodesRegistryRef}` を渡す。
- **Concrete Test Cases**:
  - `TASK-205d` の UI 統合テストで検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
