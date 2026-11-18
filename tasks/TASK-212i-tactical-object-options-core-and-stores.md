# TASK-212i: ObjectOptions 命名統一 (Part 1: Coreコンポーネント・Store・ドラッグ基盤)

- **Status**: `TODO`
- **Commit**: `refactor(tactical): rename ContextHud/HtmlHudOverlay/isHudOpen to ObjectOptions in core and stores`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Wave 1)
- **Negative Contracts**:
  - `none` (旧ファイル削除・全置換完了の `rg:` 検証は最終タスク `TASK-212l` で実施)

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 画面上および設計書上の正式名称「オブジェクトオプション（`ObjectOptions`）」に合わせて、公開コンポーネント・オーバーレイ・Store 状態名を一貫化する。
  2. ドラッグ中のオブジェクトオプション非表示化・ドラッグ終了時の選択解除/再表示遷移の動作を1つも変えない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ObjectOptions.tsx`（`ObjectOptions`, `ObjectOptionsProps`, `OBJECT_OPTIONS_RENDERERS`）、`HtmlObjectOptionsOverlay.tsx`（`HtmlObjectOptionsOverlay`, `HtmlObjectOptionsOverlayProps`）を新設し、`core/index.ts` と `CanvasStageContainer.tsx` を新シンボルへ切り替える。
  2. `session-ui-state.ts`, `session-ui-transitions.ts`, `session-store.ts` の `isHudOpen` / `setIsHudOpen` を `isObjectOptionsOpen` / `setIsObjectOptionsOpen` に置換する（フォールバックの並列プロパティは持たない）。
  3. `use-object-drag-lifecycle.ts` の `reopenHudOnEnd` を `reopenObjectOptionsOnEnd` へ、`use-marker-drag-handlers.ts` と `pitch-ground-helpers.ts` のパラメータ `setIsHudOpen` を `setIsObjectOptionsOpen` へ置換する。
- **Consumers (同期更新対象)**:
  - 後続タスク `TASK-212j`, `TASK-212k`, `TASK-212l` にて残りの Layer・Object・テスト群を一括更新し、旧 `ContextHud.tsx` / `HtmlHudOverlay.tsx` を削除する。

## 2. Implementation Phases

### Phase 1: `ObjectOptions`・`HtmlObjectOptionsOverlay` 新設と Core 境界切替
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/components/ObjectOptions.tsx` (~183 lines)
  - `[ADD]` `src/features/tactical-unified/core/components/HtmlObjectOptionsOverlay.tsx` (~82 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (L26-L48, ObjectOptions / HtmlObjectOptionsOverlay 公開)
  - `[MODIFY]` `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (L31, L60, L146, L164, L196)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
- **Contract**:
  ```ts
  export interface ObjectOptionsProps { /* ContextHudProps 同一構造 */ }
  export const OBJECT_OPTIONS_RENDERERS: Map<SelectedObjectKind, HudContentRenderer>;
  export function ObjectOptions(props: ObjectOptionsProps): React.ReactNode;
  export interface HtmlObjectOptionsOverlayProps { /* HtmlHudOverlayProps 同一構造 */ }
  export function HtmlObjectOptionsOverlay(props: HtmlObjectOptionsOverlayProps): React.ReactNode;
  ```
  - 振る舞い仕様・境界条件:
    1. `ObjectOptions.tsx` は `useSessionStore((s) => s.isObjectOptionsOpen)` を購読する。
    2. `CanvasStageContainer.tsx` は `HtmlObjectOptionsOverlay` と `setIsObjectOptionsOpen` を使用する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `CanvasStageContainer` が `HtmlObjectOptionsOverlay` を含めて正常にマウントされること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/ObjectOptions.tsx src/features/tactical-unified/core/components/HtmlObjectOptionsOverlay.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/components/CanvasStageContainer.tsx`

### Phase 2: Session Store の `isObjectOptionsOpen` 完全置換
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts` (L72, L97, isObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-transitions.ts` (L67, L70, L88, isObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L44, L124-L125, setIsObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts` (L74, L111)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-ui-state.ts`
- **Contract**:
  ```ts
  // SessionUiState / SessionStore 変更点
  readonly isObjectOptionsOpen: boolean;
  readonly setIsObjectOptionsOpen: (open: boolean) => void;
  ```
  - 振る舞い仕様・境界条件:
    1. `isHudOpen` / `setIsHudOpen` を完全に置換し、初期値 `isObjectOptionsOpen: true` とする。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`（純粋関数 I/O）:
    - `case 1`: `selectObjectTransition` / `selectObjectsTransition` で単一選択時に `isObjectOptionsOpen: true` を返すこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/session-ui-state.ts src/features/tactical-unified/stores/session-ui-transitions.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`

### Phase 3: ドラッグライフサイクルとマーカー/ピッチヘルパー更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts` (reopenObjectOptionsOnEnd, setIsObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/core/components/pitch-ground-helpers.ts` (L23, L33, setIsObjectOptionsOpen)
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (L31, L45, L73, L119, L229)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx` (全アサーション更新)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-store.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `UseObjectDragLifecycleOptions.reopenHudOnEnd` を `reopenObjectOptionsOnEnd?: boolean` に改名する。
    2. `UseMarkerDragHandlersParams.setIsHudOpen` および `buildSelectHandlerMap` の引数を `setIsObjectOptionsOpen` に改名する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 未選択ドラッグ開始で `isObjectOptionsOpen` が `false` になり、`reopenObjectOptionsOnEnd: true` の選択済みドラッグ終了で `true` に戻ること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts src/features/tactical-unified/core/components/pitch-ground-helpers.ts src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/core/hooks/__tests__/use-object-drag-lifecycle.test.tsx`
