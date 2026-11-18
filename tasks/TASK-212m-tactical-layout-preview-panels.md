# TASK-212m: レイアウトプレビュー (`layout-preview/`) 構築と Store/ページ更新

- **Status**: `TODO`
- **Commit**: `refactor(tactical): rename split-preview panels and store state to layout-preview`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 3 (parallel)
  - Wave 2: Phase 2 (sequential after Phase 1), Phase 4 (sequential after Phase 2 and Phase 3)
- **Negative Contracts**:
  - `none` (旧 `panels/split-preview/` 全削除と残テスト更新は `TASK-212n` で完結)

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ユビキタス言語に基づき、レイアウト画面のプレビュー領域は `LayoutPreview`（`panels/layout-preview/`）、エクスポート画面のプレビューは `ExportPreview`（既存通り）として明確に区別する。
  2. `LayoutPreview` の3Dオービット・6大カメラプリセット・境界線クロップオーバーレイ・再生同期の振る舞いを一切変えない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `panels/layout-preview/` に6ファイルを新設し、`TacticalSplitPreviewPanel` ➔ `LayoutPreviewPanel`、`SplitPreviewCameraBar` ➔ `LayoutPreviewCameraBar`、`useSplitPreviewCommands` ➔ `useLayoutPreviewCommands`、`SPLIT_CAMERA_PRESETS` ➔ `LAYOUT_CAMERA_PRESETS` へ改名する。
  2. `session-ui-state.ts`, `session-ui-transitions.ts`, `session-store.ts` の `splitPreviewOpen` / `toggleSplitPreview` / `setSplitPreviewOpen` / `splitPreviewTransition` を `layoutPreviewOpen` / `toggleLayoutPreview` / `setLayoutPreviewOpen` / `layoutPreviewTransition` へ置換する。
- **Consumers (同期更新対象)**:
  - `tactical-unified-page.tsx`, `camera-control-panel.tsx`, `export-modal-body.tsx`

## 2. Implementation Phases

### Phase 1: `panels/layout-preview/` 補助ファイル4件の新設
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/preview-boundary-overlay.tsx` (~90 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/preview-player-photos.ts` (~40 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/use-preview-wheel-zoom.ts` (~80 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/use-layout-preview-commands.ts` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx`
  - `src/features/tactical-unified/panels/split-preview/preview-player-photos.ts`
  - `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`
  - `src/features/tactical-unified/panels/split-preview/use-split-preview-commands.ts`
- **Contract**:
  ```ts
  export function useLayoutPreviewCommands(params: UseLayoutPreviewCommandsParams): LayoutPreviewCommandsResult;
  ```
  - 振る舞い仕様・境界条件:
    1. 旧 `split-preview/` の補助4ファイルを `layout-preview/` へ移植し、`useSplitPreviewCommands` 系シンボルを `useLayoutPreviewCommands` へ統一する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/layout-preview/__tests__/use-preview-wheel-zoom.test.ts`（`TASK-212n` で移設・検証）:
    - `case 1`: ホイールズーム・境界線オーバーレイ計算が既存通り動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/layout-preview/preview-boundary-overlay.tsx src/features/tactical-unified/panels/layout-preview/preview-player-photos.ts src/features/tactical-unified/panels/layout-preview/use-preview-wheel-zoom.ts src/features/tactical-unified/panels/layout-preview/use-layout-preview-commands.ts`

### Phase 2: `LayoutPreviewCameraBar` と `LayoutPreviewPanel` の新設
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/layout-preview-camera-bar.tsx` (~180 lines)
  - `[ADD]` `src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx` (~281 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/split-preview-camera-bar.tsx`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
- **Contract**:
  ```ts
  export const LAYOUT_CAMERA_PRESETS: readonly CameraPreset[];
  export interface LayoutPreviewCameraBarProps { /* 既存同一 */ }
  export function LayoutPreviewCameraBar(props: LayoutPreviewCameraBarProps): React.ReactNode;
  export function LayoutPreviewPanel(): React.ReactNode;
  ```
  - 振る舞い仕様・境界条件:
    1. `LAYOUT_CAMERA_PRESETS`、`LayoutPreviewCameraBar`、`LayoutPreviewPanel` を定義し、同一ディレクトリ内の新モジュール（`useLayoutPreviewCommands` 等）を参照する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/layout-preview/__tests__/layout-preview-panel.test.tsx`（`TASK-212n` で検証）:
    - `case 1`: レイアウトモード時のパネル描画とカメラ操作が正常に動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/layout-preview/layout-preview-camera-bar.tsx src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx`

### Phase 3: Session Store の `layoutPreview` 状態・アクション完全置換
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts` (layoutPreviewOpen)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-transitions.ts` (layoutPreviewTransition)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (toggleLayoutPreview, setLayoutPreviewOpen)
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts` (layoutPreviewTransition)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-ui-transitions.ts`
- **Contract**:
  ```ts
  export function layoutPreviewTransition(panels: PanelState, open: boolean): Partial<SessionUiState>;
  // SessionStore actions:
  readonly toggleLayoutPreview: () => void;
  readonly setLayoutPreviewOpen: (open: boolean) => void;
  ```
  - 振る舞い仕様・境界条件:
    1. `splitPreviewOpen`、`toggleSplitPreview`、`setSplitPreviewOpen`、`splitPreviewTransition` を置換し、開く際に `isRightPanelOpen: false` となる既存遷移を維持する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`（純粋関数 I/O）:
    - `case 1`: `layoutPreviewTransition(panels, true)` で `layoutPreviewOpen: true` かつ `isRightPanelOpen: false` を返すこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/session-ui-state.ts src/features/tactical-unified/stores/session-ui-transitions.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`

### Phase 4: Page・右パネル・Export モーダル参照切替
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/tactical-unified-page.tsx` (L35, L259, LayoutPreviewPanel)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (L5, L226, LAYOUT_CAMERA_PRESETS)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-modal-body.tsx` (L8, layout-preview/preview-player-photos)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/layout-preview/layout-preview-panel.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 3ファイルの `@/features/tactical-unified/panels/split-preview/*` 参照および `TacticalSplitPreviewPanel` / `SPLIT_CAMERA_PRESETS` 利用をすべて新名称へ切り替える。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `export-modal-body` が `layout-preview/preview-player-photos` 経由で選手写真を解決できること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/export/export-modal-body.tsx`
