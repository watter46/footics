# TASK-212b: effect-geometry と trajectory の engine コンテキスト移設

- **Status**: `TODO`
- **Commit**: `refactor(tactical): move effect-geometry and trajectory into engine context`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 3 (parallel)
  - Wave 2: Phase 2, Phase 4 (parallel; Phase 2 after Phase 1, Phase 4 after Phase 3)
- **Negative Contracts**:
  - `absent: src/lib/tactical/effect-geometry.ts`
  - `absent: src/lib/tactical/trajectory.ts`
  - `rg: @/lib/tactical/effect-geometry|@/lib/tactical/trajectory`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. Context 4 (`engine/`) は `compiler/` と `export/` と `features/` からのみ参照され、`domain/` や `types/` への逆依存を生まないこと。
  2. ベジェ軌道計算およびエフェクト幾何計算の数値出力は移設前後で完全に一致すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `effect-geometry.ts`（295行未満）と `trajectory.ts`（192行）をそれぞれ `src/lib/tactical/engine/` へ移設する。
  2. 全 Consumer とテストを `@/lib/tactical/engine/effect-geometry` / `@/lib/tactical/engine/trajectory` へ更新した上で、各トラックの最終 Phase で旧ファイルを物理削除する（re-export シム禁止）。
- **Consumers (同期更新対象)**:
  - `effect-geometry`: `engine/timeline-evaluator.ts`, `export/tactical-frame-effects.ts`, `compiler/compile-billboards.ts`, `compiler/geometry-primitives.ts`
  - `trajectory`: `engine/slide-interpolator.ts`, `compiler/compile-scene-graph.ts`, `core/utils/drag-konva-sync.ts`, `objects/arrow/components/ghost-trajectory-arrow.tsx`, `objects/arrow/hooks/use-ghost-trajectory-arrow.ts`

## 2. Implementation Phases

### Phase 1: `engine/effect-geometry.ts` 移設（定義・Engine/Export・テスト更新）
- **Target Files**:
  - `[ADD]` `src/lib/tactical/engine/effect-geometry.ts` (~285 lines)
  - `[MODIFY]` `src/lib/tactical/engine/timeline-evaluator.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/tactical-frame-effects.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/effect-geometry.test.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/effect-geometry.ts`
- **Contract**:
  ```ts
  export interface ArrowEffectState { progress: number; opacity: number; visible: boolean; dashOffset?: number; }
  export interface TrimmedPointsResult { trimmedPoints: NormalizedPoint[]; tipAngle: number; }
  export interface RippleRing { radius: number; opacity: number; color?: string; }
  export const computeArrowFlowDashOffset: (timeInSlideMs: number, _config?: Partial<ArrowEffectConfig>, speed?: number) => number;
  export function computeZonePulseOpacity(timeInSlideMs: number, config?: ZoneEffectConfig, baseOpacity?: number): number;
  export function computeArrowEffectState(timeInSlideMs: number, config?: Partial<ArrowEffectConfig>): ArrowEffectState;
  export function trimRenderPoints(points: NormalizedPoint[], progress: number, isWavy?: boolean): TrimmedPointsResult;
  export function computeRippleRings(timeInSlideMs: number, config?: MarkerEffectConfig, baseRadius?: number): RippleRing[];
  ```
  - 振る舞い仕様・境界条件:
    1. `src/lib/tactical/effect-geometry.ts` の全公開関数・型を `src/lib/tactical/engine/effect-geometry.ts` へ移植する（`applyEasing` は `./easing` から参照）。
    2. `timeline-evaluator.ts` は `./effect-geometry`、`tactical-frame-effects.ts` と `effect-geometry.test.ts` は `@/lib/tactical/engine/effect-geometry` へ import を切り替える。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: 既存のエフェクト幾何テスト全ケースが `@/lib/tactical/engine/effect-geometry` 参照で通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/effect-geometry.ts src/lib/tactical/engine/timeline-evaluator.ts src/lib/tactical/export/tactical-frame-effects.ts src/lib/tactical/__tests__/effect-geometry.test.ts`

### Phase 2: `effect-geometry` Compiler Consumers 更新と旧ファイル削除
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/compiler/compile-billboards.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/compiler/geometry-primitives.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/timeline-evaluator.test.ts` (import 確認・無修正可なら除外)
  - `[DELETE]` `src/lib/tactical/effect-geometry.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/engine/effect-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `compile-billboards.ts` と `geometry-primitives.ts` の `@/lib/tactical/effect-geometry` import を `@/lib/tactical/engine/effect-geometry` へ更新する。
    2. 旧 `src/lib/tactical/effect-geometry.ts` を物理削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/timeline-evaluator.test.ts`（純粋関数 I/O）:
    - `case 1`: 既存タイムライン評価・ビルボードコンパイルテストがすべて通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/compiler/compile-billboards.ts src/lib/tactical/compiler/geometry-primitives.ts src/lib/tactical/__tests__/timeline-evaluator.test.ts`

### Phase 3: `engine/trajectory.ts` 移設（定義・Engine/Compiler・テスト更新）
- **Target Files**:
  - `[ADD]` `src/lib/tactical/engine/trajectory.ts` (~192 lines)
  - `[MODIFY]` `src/lib/tactical/engine/slide-interpolator.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/trajectory.test.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/trajectory.ts`
- **Contract**:
  ```ts
  export type TrajectoryType = 'straight' | 'arc_left' | 'arc_right' | 'custom';
  export interface Point2D { x: number; y: number; }
  export function getBezierControlPoint(p0: Point2D, p1: Point2D, trajectory?: DomainPlayerTrajectory): Point2D;
  export function getBezierControlPointPx(p0Px: Point2D, p1Px: Point2D, trajectory: DomainPlayerTrajectory | undefined, stageSize: { width: number; height: number }): Point2D;
  export function calculateBezierPoint(p0: Point2D, p1: Point2D, t: number, trajectory?: DomainPlayerTrajectory): Point2D;
  export function getBezierMidpoint(p0: Point2D, p1: Point2D, cp: Point2D): Point2D;
  export function getControlPointFromMidpoint(p0: Point2D, p1: Point2D, mid: Point2D): Point2D;
  export function getQuadraticBezierPoints(startX: number, startY: number, cpX: number, cpY: number, endX: number, endY: number, steps?: number): number[];
  ```
  - 振る舞い仕様・境界条件:
    1. `src/lib/tactical/trajectory.ts` の全公開型・関数を `src/lib/tactical/engine/trajectory.ts` へ移植する。
    2. `slide-interpolator.ts`、`compile-scene-graph.ts`、`trajectory.test.ts` の import パスを `engine/trajectory` へ更新する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/trajectory.test.ts`（純粋関数 I/O）:
    - `case 1`: 既存のベジェ制御点・中点逆算・ポイント補間の全テストケースが `@/lib/tactical/engine/trajectory` 参照で通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/trajectory.ts src/lib/tactical/engine/slide-interpolator.ts src/lib/tactical/compiler/compile-scene-graph.ts src/lib/tactical/__tests__/trajectory.test.ts`

### Phase 4: `trajectory` Feature Consumers 更新と旧ファイル削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/drag-konva-sync.ts` (import path)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx` (import path)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/__tests__/timeline-evaluator-trajectory.test.ts` (import path 確認)
  - `[DELETE]` `src/lib/tactical/trajectory.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/engine/trajectory.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. ドラッグ同期ユーティリティとゴースト軌道コンポーネント/フック（および関連テスト）の `@/lib/tactical/trajectory` import を `@/lib/tactical/engine/trajectory` へ更新する。
    2. 旧 `src/lib/tactical/trajectory.ts` を物理削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/timeline-evaluator-trajectory.test.ts`（純粋関数 I/O）:
    - `case 1`: 軌道評価の既存テストがすべて通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/drag-konva-sync.ts src/features/tactical-unified/objects/arrow/components/ghost-trajectory-arrow.tsx src/features/tactical-unified/objects/arrow/hooks/use-ghost-trajectory-arrow.ts src/lib/tactical/__tests__/timeline-evaluator-trajectory.test.ts`
