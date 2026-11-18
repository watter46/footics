# TASK-212l: ObjectOptions 命名統一 (Part 4: 大型テスト後半3件と旧ファイル削除)

- **Status**: `TODO`
- **Commit**: `refactor(tactical): finish ObjectOptions migration across remaining large tests and delete legacy ContextHud`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Wave 1)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/ContextHud.tsx`
  - `absent: src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
  - `rg: ContextHud|HtmlHudOverlay|isHudOpen|setIsHudOpen|reopenHudOnEnd`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 300行超の大型テスト3本（`hud-and-editor.test.tsx`, `five-layer-architecture.test.tsx`, `pitch-bench-transition.test.ts`）は 1 Phase = 1 テストファイル単独で更新する。
  2. 全 Phase 完了時点で `ContextHud`, `HtmlHudOverlay`, `isHudOpen`, `setIsHudOpen`, `reopenHudOnEnd` の残存参照をゼロにする。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `hud-and-editor.test.tsx`、`five-layer-architecture.test.tsx`、`pitch-bench-transition.test.ts` の各テストを `ObjectOptions` / `HtmlObjectOptionsOverlay` / `isObjectOptionsOpen` へ更新する。
  2. 最終 Phase 3 で旧 `ContextHud.tsx` と `HtmlHudOverlay.tsx` を物理削除する。
- **Consumers (同期更新対象)**:
  - 3本の大型テストファイル

## 2. Implementation Phases

### Phase 1: `hud-and-editor.test.tsx` の `ObjectOptions` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` (771 lines; ContextHud 参照箇所)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ObjectOptions.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `hud-and-editor.test.tsx` 内の `ContextHud` import および JSX 利用箇所（L28, L219-L580）を `ObjectOptions` へ置換する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 矢印・ゾーン・マーカー選択時の `ObjectOptions` 表示と色・太さ変更テストが全件通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`

### Phase 2: `five-layer-architecture.test.tsx` の `HtmlObjectOptionsOverlay` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (1002 lines; L29, L937-L990)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/HtmlObjectOptionsOverlay.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `five-layer-architecture.test.tsx` 内の `HtmlHudOverlay` import およびテストを `HtmlObjectOptionsOverlay` へ置換する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `HtmlObjectOptionsOverlay` の `cleanRender` 制御および接続ガイダンスバッジテストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`

### Phase 3: `pitch-bench-transition.test.ts` 更新と旧2ファイル物理削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (545 lines; L12, L379-L415)
  - `[DELETE]` `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ObjectOptions.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `pitch-bench-transition.test.ts` の `ContextHud` 参照を `ObjectOptions` へ置換する。
    2. 旧 `ContextHud.tsx` と `HtmlHudOverlay.tsx` を物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`（実 StoreProvider 接続）:
    - `case 1`: ベンチ選手選択時に `ObjectOptions` が `null` を返し描画をガードすること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
