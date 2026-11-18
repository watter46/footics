# TASK-212c: pitch-geometry の共通ディレクトリ (`shared/`) 切り出し

- **Status**: `TODO`
- **Commit**: `refactor(tactical): move pitch-geometry into shared tactical directory`
- **Execution Waves**:
  - Wave 1: Phase 1
  - Wave 2: Phase 2, Phase 3 (parallel after Wave 1)
  - Wave 3: Phase 4 (sequential after Wave 2)
  - Wave 4: Phase 5 (sequential after Wave 3)
- **Negative Contracts**:
  - `absent: src/lib/tactical/pitch-geometry.ts`
  - `rg: @/lib/tactical/pitch-geometry`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `pitch-geometry.ts` は `src/lib/types/tactical/primitives.ts` と `src/lib/tactical/domain/boundary-box.ts`、さらに `engine/`, `export/`, `core/` の全層から参照されるため、Context 4 (`engine/`) には置かず最下位共通ディレクトリ `src/lib/tactical/shared/` へ配置し、単方向依存を守る。
  2. 16:9 外枠・アスペクト比別ピッチ枠（`getScreenOuterPitchRect`, `getScreenPitchBounds`, `calculatePitchRect` 等）の計算結果は1pxも変更しない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. Wave 1 (Phase 1) で `src/lib/tactical/shared/pitch-geometry.ts` を新設し、最下位層（`types/`, `domain/`, `engine/`）を更新する。
  2. Wave 2 (Phase 2, Phase 3) で残りの視覚・描画・コア層の Consumers を並列更新し、Wave 3 (Phase 4) でテスト4件の更新と旧 `src/lib/tactical/pitch-geometry.ts` の物理削除を行う。
- **Consumers (同期更新対象)**:
  - `src/lib/types/tactical/primitives.ts`, `src/lib/tactical/domain/boundary-box.ts`, `src/lib/tactical/engine/projection-3d.ts`
  - `src/lib/tactical/pitch-svg.ts`, `src/lib/tactical/export/renderers/{pitch-markings-2d,pitch-markings-3d,pitch-renderer,renderer-context}.ts`
  - `src/features/tactical-unified/core/components/{BackgroundImageLayer,pitch-marble-background}.tsx`, `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts`

## 2. Implementation Phases

### Phase 1: `shared/pitch-geometry.ts` 新設と下位層 (`types`, `domain`, `engine`) 更新
- **Target Files**:
  - `[ADD]` `src/lib/tactical/shared/pitch-geometry.ts` (~296 lines)
  - `[MODIFY]` `src/lib/types/tactical/primitives.ts` (L1-L5, import path)
  - `[MODIFY]` `src/lib/tactical/domain/boundary-box.ts` (L1-L10, import path)
  - `[MODIFY]` `src/lib/tactical/engine/projection-3d.ts` (L1-L10, import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/pitch-geometry.ts`
- **Contract**:
  ```ts
  export type PitchOrientation = 'horizontal' | 'vertical';
  export const DEFAULT_PITCH_MARGIN_PERCENT: number;
  export const PITCH_BOUNDARY_CONFIGS: Record<AspectRatio, PitchBoundaryConfig>;
  export function getScreenOuterPitchRect(aspectRatio: AspectRatio): { left: number; top: number; width: number; height: number };
  export function getScreenPitchBounds(aspectRatio: AspectRatio, marginPercent?: number): ScreenPitchBounds;
  export function calculateNormalizedPitchBounds(marginPercent?: number): PitchBounds;
  export function calculatePitchGeometry(width: number, height: number, marginPercent?: number, orientation?: PitchOrientation): PitchLayoutGeometry;
  export function calculatePitchGeometryForAspect(aspectRatio: AspectRatio, marginPercent?: number): PitchLayoutGeometry & { config: PitchBoundaryConfig };
  export function calculatePitchRect(stageSize: { width: number; height: number }, aspectRatio: AspectRatio | string): { x: number; y: number; width: number; height: number };
  ```
  - 振る舞い仕様・境界条件:
    1. `pitch-geometry.ts` の全公開型・定数・関数を `src/lib/tactical/shared/pitch-geometry.ts` に移植する。
    2. `primitives.ts`、`boundary-box.ts`、`projection-3d.ts` の import 先を `@/lib/tactical/shared/pitch-geometry` に更新する。
- **Concrete Test Cases**:
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts`（既存テスト実行・Phase 4 にて import 更新）:
    - `case 1`: `primitives.ts` 経由のピッチ境界・座標変換が正常に動作すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/shared/pitch-geometry.ts src/lib/types/tactical/primitives.ts src/lib/tactical/domain/boundary-box.ts src/lib/tactical/engine/projection-3d.ts`

### Phase 2: `pitch-svg.ts` および Export レンダラ更新 (Part 1)
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/pitch-svg.ts` (L15-L25, import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/pitch-markings-2d.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/pitch-markings-3d.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/pitch-renderer.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/shared/pitch-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 4ファイルの `@/lib/tactical/pitch-geometry` import を `@/lib/tactical/shared/pitch-geometry` へ更新する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/pitch-svg.test.ts`（純粋関数 I/O）:
    - `case 1`: 各アスペクト比の SVG 生成が従来通り一致すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/pitch-svg.ts src/lib/tactical/export/renderers/pitch-markings-2d.ts src/lib/tactical/export/renderers/pitch-markings-3d.ts src/lib/tactical/export/renderers/pitch-renderer.ts src/lib/tactical/__tests__/pitch-svg.test.ts`

### Phase 3: Export `renderer-context.ts` および Core 層 Consumers 更新 (Part 2)
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/renderers/renderer-context.ts` (import path)
  - `[MODIFY]` `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (import path)
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-marble-background.tsx` (import path)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/shared/pitch-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 4ファイルの `@/lib/tactical/pitch-geometry` import を `@/lib/tactical/shared/pitch-geometry` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 背景・大理石ピッチ描画がエラーなく行われること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/renderers/renderer-context.ts src/features/tactical-unified/core/components/BackgroundImageLayer.tsx src/features/tactical-unified/core/components/pitch-marble-background.tsx src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`

### Phase 4: 関連テスト更新と旧 `pitch-geometry.ts` 物理削除
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/pitch-geometry.test.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/__tests__/canvas-frame-renderer.test.ts` (import path)
  - `[MODIFY]` `src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts` (import path)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/shared/pitch-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 対象4件のテストファイルの import を `@/lib/tactical/shared/pitch-geometry` へ更新する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/pitch-geometry.test.ts`（純粋関数 I/O）:
    - `case 1`: `getScreenOuterPitchRect` / `getScreenPitchBounds` / `calculatePitchRect` の全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/pitch-geometry.test.ts src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts src/lib/tactical/export/renderers/__tests__/canvas-frame-renderer.test.ts src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts`

### Phase 5: 型テスト更新と旧 `pitch-geometry.ts` 物理削除
- **Target Files**:
  - `[MODIFY]` `src/lib/types/__tests__/tactical-phase-and-coords.test.ts` (L11, import path)
  - `[DELETE]` `src/lib/tactical/pitch-geometry.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/shared/pitch-geometry.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `tactical-phase-and-coords.test.ts` の import を `@/lib/tactical/shared/pitch-geometry` へ更新する。
    2. 全 Consumer・テスト更新後に旧 `src/lib/tactical/pitch-geometry.ts` を物理削除する。
- **Concrete Test Cases**:
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts`（純粋関数 I/O）:
    - `case 1`: フェーズ座標およびピッチ境界のテストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/types/__tests__/tactical-phase-and-coords.test.ts`
