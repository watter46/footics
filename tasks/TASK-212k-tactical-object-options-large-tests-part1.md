# TASK-212k: ObjectOptions 命名統一 (Part 3: 大型テスト前半4件)

- **Status**: `TODO`
- **Commit**: `refactor(tactical): update first batch of large test suites to ObjectOptions naming`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4 (parallel)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/__tests__/context-hud.test.tsx`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 300行超の大型テストファイルはすべて 1 Phase = 1 テストファイル（`1+1` 規約）で単独処理し、テストロジックの欠落やアサーション緩和を禁止する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `context-hud.test.tsx`（471行）を `object-options.test.tsx` へ移設・置換し、旧ファイルを削除する。
  2. `arrow-object-interaction.test.tsx`（357行）、`player-connect-lines.test.tsx`（334行）、`clean-render.test.tsx`（386行）の `isHudOpen` / `setIsHudOpen` / `ContextHud` 参照を新名称へ更新する。
- **Consumers (同期更新対象)**:
  - 4本の大型テストファイル

## 2. Implementation Phases

### Phase 1: `object-options.test.tsx`（旧 `context-hud.test.tsx`）移行
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/__tests__/object-options.test.tsx` (~471 lines)
  - `[DELETE]` `src/features/tactical-unified/__tests__/context-hud.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ObjectOptions.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `context-hud.test.tsx` 内の `ContextHud`・`isHudOpen` 参照をすべて `ObjectOptions`・`isObjectOptionsOpen` へ更新し、`object-options.test.tsx` として保存する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/object-options.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: Player / Ball / Arrow / Zone / Text / ConnectLine 各選択時の `ObjectOptions` 描画と操作が全件通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/object-options.test.tsx`

### Phase 2: `arrow-object-interaction.test.tsx` の `isObjectOptionsOpen` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx` (357 lines; L299-L355, isObjectOptionsOpen)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-store.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `case 5` 内の `isHudOpen` 購読と期待値検証を `isObjectOptionsOpen` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 矢印ドラッグ時の `isDragging` と `isObjectOptionsOpen: false` 遷移テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`

### Phase 3: `player-connect-lines.test.tsx` の `setIsObjectOptionsOpen` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx` (334 lines; L282, setIsObjectOptionsOpen)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useMarkerDragHandlers` 呼び出し引数の `setIsHudOpen` を `setIsObjectOptionsOpen` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 接続線描画・ドラッグ同期テスト全ケースが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/player-connect-lines.test.tsx`

### Phase 4: `clean-render.test.tsx` の `ObjectOptions` コメント・検証整合
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (386 lines; L105 等)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/ObjectOptions.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `clean-render.test.tsx` 内の `ContextHud` 表記を `ObjectOptions` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `cleanRender={true}` 時に `ObjectOptions` を含む編集オーバーレイが描画されないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
