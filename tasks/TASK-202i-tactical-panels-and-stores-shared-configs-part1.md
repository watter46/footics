# TASK-202i: Stores / Core Hooks / Export Panels / Timeline / Toolbar の共有設定移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate stores, core hooks, export/timeline/toolbar/left panels to neutral configs`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3, Phase 4
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/stores,src/features/tactical-unified/core/hooks,src/features/tactical-unified/panels/export,src/features/tactical-unified/panels/timeline,src/features/tactical-unified/panels/toolbar,src/features/tactical-unified/panels/left-panel): from '@/lib/types/tactical/(annotations|player|project|slide)'`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `stores/`, `core/hooks/`, `panels/export/`, `panels/timeline/`, `panels/toolbar/`, `panels/left-panel/` の全プロダクションコードが旧サブファイル（`project`, `slide`, `player`, `annotations`）から直接 import しない状態にする。
  2. `use-export-preview-textures.ts` に残る `Slide` 型注釈も `DomainSlide` へ純化する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 各ファイルの共有設定・定数 import 元を `camera-config`, `pitch-config`, `project-config`, `effect-config` へ切り替える。
  2. UI コンポーネントおよび Store セレクタの振る舞いは一切変更しない。
- **Consumers (同期更新対象)**:
  - `stores/domain-selectors.ts`, `stores/session-ui-state.ts`, `core/hooks/use-canvas-zoom-pan.ts`
  - `panels/export/*`, `panels/timeline/*`, `panels/toolbar/*`, `panels/left-panel/scene-canvas-thumbnail.tsx`

## 2. Implementation Phases

### Phase 1: Store セレクタ・UI 状態・Canvas Zoom/Pan Hook の import 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/domain-selectors.ts` (126 lines)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts` (119 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts` (180 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - `domain-selectors.ts` の `DirectorCameraTrack` を `camera-config`、境界線・外観系を `pitch-config` / `camera-config` へ変更する。
  - `session-ui-state.ts` の `DrawingTool`, `ExportTarget` を `project-config` へ、`use-canvas-zoom-pan.ts` の `PitchTransform` を `camera-config` へ変更する。
- **Concrete Test Cases**:
  - `domain-selectors.test.ts` および `three-frequency-stores.test.ts` が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/domain-selectors.ts src/features/tactical-unified/stores/session-ui-state.ts src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts`

### Phase 2: Export パネル群 (4ファイル) の `DomainSlide` & 中立設定移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-constants.ts` (93 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-player.tsx` (218 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-modal-body.tsx` (282 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-textures.ts` (105 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - 4ファイルの共有設定 import 元を中立モジュールへ変更し、`use-export-preview-textures.ts` の `Slide` を `DomainSlide` へ置換する。
- **Concrete Test Cases**:
  - Export プレビューおよびモーダル描画の型整合と既存テストが維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/export-preview-constants.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/panels/export/use-export-preview-textures.ts`

### Phase 3: Timeline パネル群 (4ファイル) の中立設定移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (247 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-action-track.tsx` (230 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-global-track.tsx` (120 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`
- **Contract**:
  - `Easing`, `ActionCameraCue`, `GlobalCameraKeyframe` の import 元を `@/lib/types/tactical/camera-config` へ変更する。
- **Concrete Test Cases**:
  - `slide-transition-popover.test.tsx`, `director-tracks-popover.test.tsx`, `director-camera-timeline.test.tsx` の動作が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx src/features/tactical-unified/panels/timeline/director-action-track.tsx src/features/tactical-unified/panels/timeline/director-global-track.tsx`

### Phase 4: Toolbar & LeftPanel (3ファイル) の中立設定移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts` (19 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx` (269 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (109 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/project-config.ts`, `pitch-config.ts`
- **Contract**:
  - `DrawingTool` を `project-config` へ、`BoundaryBox`, `X_MEDIA_PRESETS` 等を `pitch-config` へ変更する。
- **Concrete Test Cases**:
  - `x-media-preset-menu.test.tsx` の挙動が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`
