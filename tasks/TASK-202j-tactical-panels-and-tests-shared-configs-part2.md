# TASK-202j: Export / LeftPanel / Timeline テスト & SplitPreview の共有設定移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate split-preview and export/timeline/left-panel tests to DomainSlide and neutral configs`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3, Phase 4
  - Wave 2 (sequential): Phase 5
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/split-preview,src/features/tactical-unified/panels/export/__tests__,src/features/tactical-unified/panels/left-panel/__tests__,src/features/tactical-unified/panels/timeline/__tests__): types/tactical/(annotations|player|project|slide)|\bSlide\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `panels/split-preview/**` および `export` / `timeline` / `left-panel` 配下のテストが旧型サブファイル（`project`, `slide`）へ直接依存しないようにする。
  2. `use-preview-wheel-zoom.ts` に残る `Slide` 型注釈を `DomainSlide` へ統一する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 300 行超の大型テストファイル（`use-export-preview-animation.test.ts`, `left-panel.test.tsx`, `tactical-split-preview-panel.test.tsx`）は、それぞれ単独 Phase（1+1 特例）として分離する。
  2. テストロジックやアサーション内容は一切弱めない。
- **Consumers (同期更新対象)**:
  - `panels/export/__tests__/*`, `panels/timeline/__tests__/director-tracks-popover.test.tsx`, `panels/left-panel/__tests__/left-panel.test.tsx`
  - `panels/split-preview/*` および `tactical-split-preview-panel.test.tsx`

## 2. Implementation Phases

### Phase 1: Export / Timeline 小型テスト 3 本の中立設定移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx` (108 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx` (224 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`, `pitch-config.ts`
- **Contract**:
  - 3テストファイル内の `project` / `slide` import 元を `camera-config` / `pitch-config` へ変更する。
- **Concrete Test Cases**:
  - 3テストファイル全通過（既存アサーション維持）。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx`

### Phase 2: `use-export-preview-animation.test.ts` の import 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (524 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/pitch-config.ts`, `camera-config.ts`
- **Contract**:
  - `slide` からの import 元を `pitch-config` / `camera-config` へ変更する。
- **Concrete Test Cases**:
  - `use-export-preview-animation.test.ts` 全通過。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

### Phase 3: `left-panel.test.tsx` の import 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` (383 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/pitch-config.ts`
- **Contract**:
  - `getDefaultBoundaryBoxForAspect` の import 元を `@/lib/types/tactical/pitch-config` へ変更する。
- **Concrete Test Cases**:
  - `left-panel.test.tsx` 全通過。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`

### Phase 4: SplitPreview プロダクションコード (4ファイル) の `DomainSlide` & 中立設定移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx` (246 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (277 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts` (105 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/use-split-preview-commands.ts` (84 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `camera-config.ts`, `pitch-config.ts`
- **Contract**:
  - `use-preview-wheel-zoom.ts` の `Slide` を `DomainSlide` へ変更し、4ファイルすべての共有設定 import 元を `camera-config` / `pitch-config` へ切り替える。
- **Concrete Test Cases**:
  - Phase 5 の `tactical-split-preview-panel.test.tsx` および `use-preview-wheel-zoom.test.ts` が維持されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts src/features/tactical-unified/panels/split-preview/use-split-preview-commands.ts`

### Phase 5: `tactical-split-preview-panel.test.tsx` の import 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (689 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/camera-config.ts`
- **Contract**:
  - `PitchTransform` の import 元を `@/lib/types/tactical/camera-config` へ変更する。
- **Concrete Test Cases**:
  - `tactical-split-preview-panel.test.tsx` 全通過。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
