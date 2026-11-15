# TASK-202a: 共有設定の中立モジュール分離と Domain 型・ACL 層の参照移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): extract shared tactical configs into neutral modules and migrate domain/ACL imports`
- **Execution Waves**:
  - Wave 1 (sequential): Phase 1
  - Wave 2 (sequential): Phase 2
  - Wave 3 (parallel): Phase 3, Phase 4, Phase 5
- **Negative Contracts**:
  - `rg(src/lib/types/tactical/domain-entities.ts,src/lib/types/tactical/domain-hierarchy.ts): types/tactical/(annotations|player|project|slide)(['"]|$)`
  - `rg(src/lib/tactical/acl,src/lib/tactical/effect-geometry.ts,src/lib/tactical/engine/projection-3d.ts,src/lib/tactical/compiler/compile-scene-graph.ts): types/tactical/(annotations|player|project|slide)(['"]|$)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 共有設定・値オブジェクト（カメラ、ピッチ境界線、視覚効果、ツールプリセット設定）の単一真実源（SSOT）を新設する4つの中立モジュールに集約し、`domain-entities.ts` と `domain-hierarchy.ts` がレガシー型定義ファイルに依存しない状態にする。
  2. Zod スキーマ・デフォルト定数・ランタイム関数の実装重複（二重定義）を一切作らない。後続タスク完了までビルド緑を維持するため、Phase 2 で旧4ファイル側の重複定義本体を撤去し中立モジュールからの一時 re-export のみに置換する（旧4ファイル自体は `TASK-202n` で物理削除する）。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 中立モジュールは `src/lib/types/tactical/` 直下に機能別 4 ファイル（`effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`）として配置する。
  2. `effect-config.ts`・`camera-config.ts`・`pitch-config.ts` はそれぞれ `primitives.ts` のみに依存し、`project-config.ts` は `primitives.ts`・`pitch-config.ts`・`camera-config.ts` に依存する（循環依存禁止）。
  3. 既存の全公開シンボル名・Zod バリデーション制約・デフォルト値は 100% 維持する。
- **Consumers (同期更新対象)**:
  - `src/lib/types/tactical/domain-entities.ts`, `domain-hierarchy.ts`
  - `src/lib/tactical/acl/*`, `src/lib/tactical/effect-geometry.ts`, `src/lib/tactical/engine/projection-3d.ts`, `src/lib/tactical/compiler/compile-scene-graph.ts`

## 2. Implementation Phases

### Phase 1: 共有設定・値オブジェクト用中立モジュール 4 本の新設
- **Target Files**:
  - `[ADD]` `src/lib/types/tactical/effect-config.ts` (~180 lines)
  - `[ADD]` `src/lib/types/tactical/camera-config.ts` (~85 lines)
  - `[ADD]` `src/lib/types/tactical/pitch-config.ts` (~200 lines)
  - `[ADD]` `src/lib/types/tactical/project-config.ts` (~125 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/annotations.ts` (L7-L30, L68-L74)
  - `src/lib/types/tactical/player.ts` (L9-L142)
  - `src/lib/types/tactical/slide.ts` (L19-L265)
  - `src/lib/types/tactical/project.ts` (L19-L57, L73-L79, L129-L234)
- **Contract**:
  ```ts
  // effect-config.ts: ArrowEffectTypeSchema, ArrowEffectConfigSchema, EffectEasingSchema, EffectExitActionSchema, ZoneEffectConfigSchema, MarkerEffectTypeSchema, MarkerEffectConfigSchema, MarkerStyleSchema, VisionConeSchema, ConnectLineSchema, PlayerBadgeSchema, PlayerFocusSchema, PlayerTrajectoryEffectConfigSchema
  // camera-config.ts: EasingSchema, CameraTransitionModeSchema, GlobalCameraKeyframeSchema, ActionCameraCueSchema, DirectorCameraTrackSchema, PitchTransformSchema
  // pitch-config.ts: BoundaryBoxSchema, BASE_BOX, DEFAULT_BOUNDARY_BOX_*, DEFAULT_PHASE_BOUNDARY_BOX, getDefaultBoundaryBoxForAspect, X_MEDIA_RATIOS, XMediaRatio, XMediaPresetConfig, X_MEDIA_PRESETS, createXBoundaryBox, PitchAppearanceConfigSchema, DEFAULT_PITCH_APPEARANCE, ScreenBackgroundConfigSchema, DEFAULT_SCREEN_BACKGROUND
  // project-config.ts: TeamColorSchema, ExportTargetSchema, ExportProgress, FormationPresetPlayerSchema, FormationPresetSchema, SeasonFormationPresetSchema, DrawingToolSchema
  ```
  - 振る舞い仕様・境界条件:
    1. 旧4ファイルから共有設定の定義・定数・関数をそのままの制約・デフォルト値で移設し、対応する推論型もエクスポートする。
    2. 4ファイル間で循環インポートを発生させない（`DEFAULT_PHASE_BOUNDARY_BOX` は `pitch-config.ts` へ配置し相互参照を断つ）。
- **Concrete Test Cases**:
  - Phase 2〜3 と合わせて既存テストおよび `bun run ai:check` の型検査で全シンボルの互換性を検証する。
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/effect-config.ts src/lib/types/tactical/camera-config.ts src/lib/types/tactical/pitch-config.ts src/lib/types/tactical/project-config.ts`

### Phase 2: 旧4ファイルの重複定義撤去と中立モジュールからの一時 re-export 化
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/annotations.ts`
  - `[MODIFY]` `src/lib/types/tactical/player.ts`
  - `[MODIFY]` `src/lib/types/tactical/slide.ts`
  - `[MODIFY]` `src/lib/types/tactical/project.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - 旧 Entity スキーマ（`ArrowAnnotationSchema`, `ZoneAnnotationSchema`, `TextAnnotationSchema`, `PlayerSchema`, `PlayerTrajectorySchema`, `SlideSchema`, `TacticalPhaseSchema`, `TacticalProjectSchema`, `attachProjectSlidesGetter`）のみ各ファイルに残す。
  - 共有設定の本体定義を上記4ファイルから削除し、`./effect-config`, `./camera-config`, `./pitch-config`, `./project-config` からの `export { ... } from '...'` に置き換える（SSOT 維持、二重定義禁止）。
- **Concrete Test Cases**:
  - `tests/lib/types/tactical/slide.test.ts`: `DEFAULT_BOUNDARY_BOX` が `DEFAULT_BOUNDARY_BOX_16_9` と同一であること。
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/annotations.ts src/lib/types/tactical/player.ts src/lib/types/tactical/slide.ts src/lib/types/tactical/project.ts tests/lib/types/tactical/slide.test.ts`

### Phase 3: Domain スキーマ本体 & `effect-geometry` の中立モジュール直接参照化
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/domain-entities.ts` (L1-L25)
  - `[MODIFY]` `src/lib/types/tactical/domain-hierarchy.ts` (L1-L26)
  - `[MODIFY]` `src/lib/tactical/effect-geometry.ts` (L1-L10)
  - `[MODIFY]` `src/lib/tactical/__tests__/effect-geometry.test.ts` (L1-L12)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - 上記4ファイルから `annotations`・`player`・`project`・`slide` への import を完全に除去し、対応する中立モジュールからの import へ変更する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`: 既存の純粋関数 I/O テストがすべてパスすること。
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/domain-entities.ts src/lib/types/tactical/domain-hierarchy.ts src/lib/tactical/effect-geometry.ts src/lib/tactical/__tests__/effect-geometry.test.ts`

### Phase 4: ACL Translator 群 (4ファイル) の中立モジュール直接参照化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/acl/legacy-project-translator.ts` (L1-L10)
  - `[MODIFY]` `src/lib/tactical/acl/match-project-translator.ts` (L15-L35)
  - `[MODIFY]` `src/lib/tactical/acl/match-squad-translator.ts` (L1-L15)
  - `[MODIFY]` `src/lib/tactical/acl/player-normalizer.ts` (L1-L10)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/effect-config.ts`, `pitch-config.ts`
- **Contract**:
  - 各ファイル冒頭の共有設定 import 先を `@/lib/types/tactical/effect-config` および `@/lib/types/tactical/pitch-config` へ変更する。変換ロジックは不変。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/acl-translators.test.ts` と `src/lib/tactical/acl/__tests__/match-project-translator.test.ts` が引き続きパスすること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/acl/legacy-project-translator.ts src/lib/tactical/acl/match-project-translator.ts src/lib/tactical/acl/match-squad-translator.ts src/lib/tactical/acl/player-normalizer.ts`

### Phase 5: `slide-normalizer`, Engine/Compiler, `slide.test.ts` の中立モジュール直接参照化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/acl/slide-normalizer.ts` (L1-L15)
  - `[MODIFY]` `src/lib/tactical/engine/projection-3d.ts` (L1-L12)
  - `[MODIFY]` `src/lib/tactical/compiler/compile-scene-graph.ts` (L1-L20)
  - `[MODIFY]` `tests/lib/types/tactical/slide.test.ts` (L1-L10)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`, `pitch-config.ts`
- **Contract**:
  - `slide-normalizer.ts` と `slide.test.ts` は `pitch-config` から、`projection-3d.ts` と `compile-scene-graph.ts` は `camera-config` から import する形へ切り替える。
- **Concrete Test Cases**:
  - `tests/lib/types/tactical/slide.test.ts`: `DEFAULT_BOUNDARY_BOX` が `DEFAULT_BOUNDARY_BOX_16_9` と同一であること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/acl/slide-normalizer.ts src/lib/tactical/engine/projection-3d.ts src/lib/tactical/compiler/compile-scene-graph.ts tests/lib/types/tactical/slide.test.ts`
