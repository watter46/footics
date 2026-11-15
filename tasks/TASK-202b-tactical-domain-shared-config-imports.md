# TASK-202b: Domain 層の共有設定 import 先を中立モジュールへ統一

- **Status**: `TODO`
- **Commit**: `refactor(tactical): point tactical domain modules to neutral shared config modules`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3
- **Negative Contracts**:
  - `rg(src/lib/tactical/domain): types/tactical/(annotations|player|project|slide)`
  - `rg(src/lib/tactical/__tests__/director-camera-commands.test.ts,src/lib/tactical/__tests__/slide-modes-and-reset.test.ts): types/tactical/(annotations|player|project|slide)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `src/lib/tactical/domain/**` 配下の全モジュールは、`project`・`slide`・`player`・`annotations` ではなく中立設定モジュール（`effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`）のみから共有型・定数を import する。
  2. コマンド・リデューサー・境界線計算のランタイム挙動は一切変更しない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. import パスと型参照のみを切り替える。テスト側でも旧サブファイルへの直接 import があれば中立モジュールへ統一する。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/domain/*` 内の全対象ファイルおよび対応テスト

## 2. Implementation Phases

### Phase 1: Domain コマンド・ディレクターカメラ層の import 切替
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts` (L20-L30)
  - `[MODIFY]` `src/lib/tactical/domain/commands-director.ts` (L1-L5)
  - `[MODIFY]` `src/lib/tactical/domain/director-camera.ts` (L8-L12)
  - `[MODIFY]` `src/lib/tactical/__tests__/director-camera-commands.test.ts` (L5-L10)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/effect-config.ts`, `camera-config.ts`
- **Contract**:
  - `commands.ts`（`VisionCone`, `MarkerStyle`, `PlayerBadge`, `PlayerFocus`, `PlayerTrajectoryEffectConfig`, `MarkerEffectConfig`, `ArrowEffectConfig`, `ZoneEffectConfig`, `Easing` 等）は `effect-config`・`camera-config` へ切り替える。
  - `commands-director.ts`・`director-camera.ts`・`director-camera-commands.test.ts` の import 元を `camera-config` へ統一する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/director-camera-commands.test.ts`: 既存テスト全通過（`vi.mock` なし）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/domain/commands.ts src/lib/tactical/domain/commands-director.ts src/lib/tactical/domain/director-camera.ts src/lib/tactical/__tests__/director-camera-commands.test.ts`

### Phase 2: Domain 背景・境界線・フェーズ・スライドハンドラの import 切替
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/domain/background-image.ts` (L15-L20)
  - `[MODIFY]` `src/lib/tactical/domain/boundary-box.ts` (L10-L18)
  - `[MODIFY]` `src/lib/tactical/domain/project-phase-handlers.ts` (L4-L10)
  - `[MODIFY]` `src/lib/tactical/domain/project-slide-handlers.ts` (L4-L10)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/pitch-config.ts`
- **Contract**:
  - 上記4ファイルのレガシー設定 import をすべて `@/lib/types/tactical/pitch-config` へ変更する。
- **Concrete Test Cases**:
  - Phase 3 の `slide-modes-and-reset.test.ts` および `phase-project-commands.test.ts` の動作が維持されること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/domain/background-image.ts src/lib/tactical/domain/boundary-box.ts src/lib/tactical/domain/project-phase-handlers.ts src/lib/tactical/domain/project-slide-handlers.ts`

### Phase 3: Domain スカッド配置とモード/リセットテストの import 切替
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/domain/squad-placement.ts` (L8-L14)
  - `[MODIFY]` `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts` (L10-L16)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/project-config.ts`, `pitch-config.ts`
- **Contract**:
  - `squad-placement.ts` の `SeasonFormationPreset` を `@/lib/types/tactical/project-config` へ変更し、`slide-modes-and-reset.test.ts` の設定 import を `@/lib/types/tactical/pitch-config` へ変更する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`: 既存テスト全通過。
- **Verification**:
  - `bun run ai:check src/lib/tactical/domain/squad-placement.ts src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`
