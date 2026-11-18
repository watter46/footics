# TASK-205e: `SessionStore` からの `activeDragDelta` 削除と関連ストアテスト更新

- **Status**: `DONE`
- **Commit**: `refactor(tactical): remove activeDragDelta from session store`
- **Execution Waves**:
  - Wave 1: Phase 1 (sequential)
  - Wave 2: Phase 2, Phase 3 (parallel after Wave 1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/stores): activeDragDelta|setActiveDragDelta`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 3頻度ストア（Cold: `DocumentStore` / Hot: `SessionStore` / Stream: `PlaybackStore`）の購読独立性が保たれ、Hot/Stream ストアの連続更新で `DocumentStore` の `past` / `isDirty` / リスナーが発火しないこと。
  2. `SessionStore` の他アクション（選択、ツール切替、カラー・線幅設定、パネル切替）の挙動を一切変更しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `SessionStoreState`、`CreateSessionStoreOptions`、`createSessionStore` から `activeDragDelta` と `setActiveDragDelta`、および `EphemeralDragDelta` の import を完全に削除する。
  2. `three-frequency-stores.test.ts` の 3 頻度独立性検証は `setActiveDragDelta` の代わりに `setMousePos` / `selectObjects` / `setTimeMs` 等の現行 Hot/Stream アクションで検証する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`

## 2. Implementation Phases

### Phase 1: `session-store.ts` から `activeDragDelta` 削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L1-L45, L85-L130)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `EphemeralDragDelta` の import を削除する。
    2. `SessionStoreState` から `activeDragDelta` と `setActiveDragDelta` を削除する。
    3. `CreateSessionStoreOptions` と `createSessionStore` 初期化・アクション定義から `activeDragDelta` / `setActiveDragDelta` を削除する。
- **Concrete Test Cases**:
  - Phase 2 の `three-frequency-stores.test.ts` で検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/session-store.ts`

### Phase 2: `three-frequency-stores.test.ts` 更新（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` (L226-L262, L393-L458)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `activeDragDelta` / `setActiveDragDelta` 参照をすべて削除する。
    2. Hot Store（`selectObject`, `setConnectingPlayerId` 等）および Stream Store（`setTimeMs`）を高頻度で 100 回更新しても `documentStore` の `past.length === 0`・`isDirty === false`・購読者発火ゼロであることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`（実 Store 接続）:
    - `case 1`: `sessionStore` の `selectObject` / `setConnectingPlayerId` 等を連続更新しても `documentStore` のリスナーは 0 回、`past.length === 0` であること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

### Phase 3: `tactical-animation.test.ts` の `activeDragDelta: null` 削除（300行超テスト単独Phase）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-animation.test.ts` (L157-L205)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `EphemeralSessionState` リテラルから `activeDragDelta: null` を削除し、次タスク `TASK-205f` での DTO フィールド削除に備える。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`:
    - `case 1`: 既存の静止フレーム・再生補間フレームテストがすべて PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-animation.test.ts`
