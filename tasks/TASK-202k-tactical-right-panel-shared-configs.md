# TASK-202k: RightPanel 全 12 ファイルの共有設定 import 先を中立モジュールへ統一

- **Status**: `TODO`
- **Commit**: `refactor(tactical): point all right-panel components to neutral shared config modules`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/right-panel): from '@/lib/types/tactical/(annotations|player|project|slide)'`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `src/features/tactical-unified/panels/right-panel/**` の全コンポーネント・設定データからレガシー型サブファイルへの直接 import を完全に除去する。
  2. サイドパネルのUI・入力値制約・初期値・ストア接続の挙動を一切変更しない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 効果設定（`ArrowEffect*`, `ZoneEffect*`, `MarkerEffect*`, `PlayerTrajectoryEffect*`, `EffectExitAction`）は `effect-config` へ切り替える。
  2. カメラ・ピッチ変換・外観・背景・境界線系は `camera-config` / `pitch-config` へ切り替える。
  3. フォーメーションプリセット系（`SeasonFormationPreset`）は `project-config` へ切り替える。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/right-panel/*` の対象 12 ファイル

## 2. Implementation Phases

### Phase 1: RightPanel 効果インスペクタ系 4 コンポーネントの import 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx` (173 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx` (102 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx` (186 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx` (107 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/effect-config.ts`
- **Contract**:
  - 4ファイルすべての効果型・設定 import 元を `@/lib/types/tactical/effect-config` へ統一する。
- **Concrete Test Cases**:
  - `effect-inspector-panel.test.tsx` による効果インスペクタ描画・更新テストが維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx`

### Phase 2: RightPanel カメラ・外観・背景 4 コンポーネントの import 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (298 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx` (142 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/pitch-appearance-panel.tsx` (243 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx` (131 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`, `pitch-config.ts`
- **Contract**:
  - `PitchTransform`, `ActionCameraCue` は `camera-config` へ、`PitchAppearanceConfig`, `DEFAULT_PITCH_APPEARANCE`, `ScreenBackgroundConfig`, `DEFAULT_SCREEN_BACKGROUND` は `pitch-config` へ切り替える。
- **Concrete Test Cases**:
  - `camera-control-panel.test.tsx` と `screen-background-panel.test.tsx` の動作が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx src/features/tactical-unified/panels/right-panel/pitch-appearance-panel.tsx src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx`

### Phase 3: RightPanel 境界線・シェル・フォーメーションデータ 4 ファイルの import 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx` (189 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (167 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx` (195 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-presets-data.ts` (58 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/pitch-config.ts`, `project-config.ts`
- **Contract**:
  - `screen-boundary-section.tsx` と `right-panel.tsx` を `pitch-config` へ、`formation-custom-manager.tsx` と `formation-presets-data.ts` を `project-config` へ切り替える。
- **Concrete Test Cases**:
  - `right-panel-tabs.test.tsx` と `formation-panel-step5.test.tsx` の動作が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx src/features/tactical-unified/panels/right-panel/right-panel.tsx src/features/tactical-unified/panels/right-panel/formation-custom-manager.tsx src/features/tactical-unified/panels/right-panel/formation-presets-data.ts`
