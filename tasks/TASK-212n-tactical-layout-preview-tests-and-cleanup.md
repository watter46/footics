# TASK-212n: レイアウトプレビューテスト移行と旧 split-preview 物理削除

- **Status**: `TODO`
- **Commit**: `refactor(tactical): migrate layout-preview tests and delete legacy split-preview directory`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 3 (parallel)
  - Wave 2: Phase 2 (sequential after Phase 1)
  - Wave 3: Phase 4 (sequential after Phase 2 and Phase 3)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `absent: src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx`
  - `absent: src/features/tactical-unified/panels/split-preview/use-split-preview-commands.ts`
  - `rg: split-preview|TacticalSplitPreviewPanel|SplitPreviewCameraBar|useSplitPreviewCommands|SPLIT_CAMERA_PRESETS|toggleSplitPreview|setSplitPreviewOpen|splitPreviewOpen|splitPreviewTransition`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 大型テスト（`layout-preview-panel.test.tsx` 689行、`three-frequency-stores.test.ts` 560行）は 1 Phase = 1 テストファイルで処理し、アサーションを1件も削減しない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 旧 `panels/split-preview/__tests__/` の4テストを `panels/layout-preview/__tests__/` へ移設し、旧 `split-preview/` 配下全10ファイルを物理削除する。
  2. `preview-layout-parity.test.ts` のコメント表記および `three-frequency-stores.test.ts` L326 の `toggleSplitPreview()` を `toggleLayoutPreview()` へ更新する。
- **Consumers (同期更新対象)**:
  - `panels/layout-preview/__tests__/*`
  - `panels/export/__tests__/preview-layout-parity.test.ts`
  - `stores/__tests__/three-frequency-stores.test.ts`

## 2. Implementation Phases

### Phase 1: 小〜中規模テスト4件の `layout-preview` 移行
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/__tests__/layout-camera-time-sync.test.tsx` (~175 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/__tests__/preview-boundary-overlay.test.tsx` (~35 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/__tests__/use-preview-wheel-zoom.test.ts` (~173 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/preview-layout-parity.test.ts` (L132 コメント整合)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx`
  - `src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx`
  - `src/features/tactical-unified/panels/split-preview/__tests__/use-preview-wheel-zoom.test.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 3テストを `layout-preview/__tests__/` へ移植し、`LayoutPreviewPanel` 等を参照する。
    2. `preview-layout-parity.test.ts` の `TacticalSplitPreviewPanel` コメントを `LayoutPreviewPanel` に更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/layout-preview/__tests__/layout-camera-time-sync.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: タイムライン再生時刻とカメラ補間の同期テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/layout-preview/__tests__/layout-camera-time-sync.test.tsx src/features/tactical-unified/panels/layout-preview/__tests__/preview-boundary-overlay.test.tsx src/features/tactical-unified/panels/layout-preview/__tests__/use-preview-wheel-zoom.test.ts src/features/tactical-unified/panels/export/__tests__/preview-layout-parity.test.ts`

### Phase 2: 大型テスト `layout-preview-panel.test.tsx` 移設と旧小テスト削除
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx` (~689 lines)
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/__tests__/layout-camera-time-sync.test.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/__tests__/use-preview-wheel-zoom.test.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `tactical-split-preview-panel.test.tsx` の `TacticalSplitPreviewPanel` / `createSplitPreviewHarness` を `LayoutPreviewPanel` / `createLayoutPreviewHarness` に更新して保存する。
    2. 旧小テスト3件を物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `LayoutPreviewPanel` の全インタラクション・カメラ・境界線テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx`

### Phase 3: `three-frequency-stores.test.ts` 更新と旧 `split-preview/` 削除 (Part 1)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` (560 lines; L326, toggleLayoutPreview)
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/preview-player-photos.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-store.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `three-frequency-stores.test.ts` の `toggleSplitPreview()` 呼び出しを `toggleLayoutPreview()`（およびテスト文言「レイアウトプレビュー」）へ更新する。
    2. 旧テスト1件と旧補助2ファイルを物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`（実 StoreProvider 接続）:
    - `case 1`: `toggleLayoutPreview()` 呼び出し時に右パネルが閉じること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

### Phase 4: 旧 `split-preview/` 残存4ファイルの完全物理削除 (Part 2)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx` (最終参照整合確認)
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/use-split-preview-commands.ts`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 旧 `panels/split-preview/` 配下の残存4ファイルを物理削除し、空となった旧ディレクトリを消滅させる。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 旧ファイル削除後も全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx`
