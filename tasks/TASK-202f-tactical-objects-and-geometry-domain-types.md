# TASK-202f: Player / Ball Objects & 幾何計算の Domain 型移行

- **Status**: `TODO`
- **Commit**: `refactor(tactical): migrate player/ball Konva objects and geometry helpers to DomainPlayer and DomainPlayerTrajectory`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3, Phase 4
- **Negative Contracts**:
  - `rg(src/lib/tactical/marker-geometry.ts,src/lib/tactical/trajectory.ts,src/features/tactical-unified/objects): \b(Player|PlayerTrajectory|BallState)\b`
  - `rg(src/features/tactical-unified/core/utils/canvas-registry.ts): \bPlayerTrajectory\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `marker-geometry.ts`・`objects/player/**`・`objects/ball/**`・`canvas-registry.ts` はレガシー型 `Player` / `PlayerTrajectory` / `BallState` を参照せず、`DomainPlayer` (`PitchPlayer`)・`DomainPlayerTrajectory`・`DomainBallState` のみを使用する。
  2. `src/lib/tactical/trajectory.ts` 内の独自重複定義 `interface PlayerTrajectory` を廃止し、`DomainPlayerTrajectory`（`@/lib/types/tactical/domain-entities`）へ統一する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 視野角（`visionCone`）とスポットライト（`focus`）は `PitchPlayer` のみに存在するプロパティであるため、`player-vision-cone.tsx`・`player-vision-cone-handles.tsx`・`player-focus-spotlight.tsx` では `NonNullable<PitchPlayer['visionCone']>` / `NonNullable<PitchPlayer['focus']>` を使用する。
  2. サークル・ラベル・リング系コンポーネントは `DomainPlayer` を受け取り（共通フィールド参照）、`player-ghost-trajectory.tsx` は `DomainPlayer`（または `PitchPlayer`）と `DomainPlayerTrajectory` を使用する。
  3. 共有設定（`MarkerStyle` 等）を import している箇所があれば `effect-config` 経由にする。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/marker-geometry.ts`, `trajectory.ts`
  - `src/features/tactical-unified/objects/player/**`, `objects/arrow/types.ts`, `objects/ball/components/ball-ghost-trajectory.tsx`
  - `src/features/tactical-unified/core/utils/canvas-registry.ts`

## 2. Implementation Phases

### Phase 1: `marker-geometry` & `trajectory` 純粋関数とテストの Domain 型化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/marker-geometry.ts` (90 lines)
  - `[MODIFY]` `src/lib/tactical/marker-geometry.test.ts`
  - `[MODIFY]` `src/lib/tactical/trajectory.ts` (176 lines)
  - `[MODIFY]` `src/lib/tactical/__tests__/trajectory.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts` (L35-L73)
- **Contract**:
  ```ts
  export function getPlayerMarkerRadius(player: DomainPlayer, stageSize: { width: number; height: number }): number;
  export function getMarkerBoundaryPoint(center: { x: number; y: number }, target: { x: number; y: number }, player: DomainPlayer, stageSize: { width: number; height: number }, onlyRing?: boolean): { x: number; y: number };
  export function getBezierControlPoint(p0: Point2D, p1: Point2D, trajectory?: DomainPlayerTrajectory): Point2D;
  export function calculateBezierPoint(p0: Point2D, p1: Point2D, t: number, trajectory?: DomainPlayerTrajectory): Point2D;
  ```
  - 振る舞い仕様・境界条件:
    1. `trajectory.ts` 内の `PlayerTrajectory` 定義を削除し、`DomainPlayerTrajectory` を import して使用する（`TrajectoryType` は維持可）。
    2. テストファイル内のモックフィクスチャも `DomainPlayer` / `DomainPlayerTrajectory` 準拠にする。
- **Concrete Test Cases**:
  - `marker-geometry.test.ts` / `trajectory.test.ts`: 既存の純粋関数 I/O テスト全通過。
- **Verification**:
  - `bun run ai:check src/lib/tactical/marker-geometry.ts src/lib/tactical/marker-geometry.test.ts src/lib/tactical/trajectory.ts src/lib/tactical/__tests__/trajectory.test.ts`

### Phase 2: 選手マーカー基本描画 4 コンポーネントの Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-circle.tsx` (93 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-label.tsx` (70 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (128 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx` (157 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - 各コンポーネント Props の `player: Player` を `player: DomainPlayer` へ変更する。
- **Concrete Test Cases**:
  - `player-marker-circle.test.tsx`, `player-marker-ring-fade.test.tsx` が既存の入力・描画通り通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/components/player-marker-circle.tsx src/features/tactical-unified/objects/player/components/player-marker-label.tsx src/features/tactical-unified/objects/player/components/player-marker-ring.tsx src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx`

### Phase 3: 選手視野角・スポットライト・ゴースト軌道 4 コンポーネントの Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-vision-cone.tsx` (128 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx` (278 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (177 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx` (107 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - `visionCone` / `focus` の型参照を `PitchPlayer` に切り替え、`player-ghost-trajectory.tsx` は `DomainPlayer`（または `PitchPlayer`）と `DomainPlayerTrajectory` を使用する。
- **Concrete Test Cases**:
  - 既存の視野角・スポットライト・ゴースト軌道の計算および props 型契約が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/components/player-vision-cone.tsx src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx src/features/tactical-unified/objects/player/components/player-ghost-trajectory.tsx`

### Phase 4: Objects 型定義・ボールゴースト・`canvas-registry` の Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/player/types.ts` (103 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/types.ts` (15 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (74 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-registry.ts` (63 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - `PlayerTrajectory` ➔ `DomainPlayerTrajectory`、`BallState` ➔ `DomainBallState`、`Player` ➔ `DomainPlayer`（または `PitchPlayer`）へ置換する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/objects/ball/components/__tests__/ball-ghost-trajectory.test.tsx` ほか対象ファイル群で `bun run ai:check` が通ること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/player/types.ts src/features/tactical-unified/objects/arrow/types.ts src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx src/features/tactical-unified/core/utils/canvas-registry.ts`
