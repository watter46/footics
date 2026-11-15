# TASK-199b: FullTacticalCanvas・再生時計ホスト・結合テストの 3-frequency 直接接続化

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-unified): wire FullTacticalCanvas directly to 3-frequency stores and host RAF playback clock in PlaybackControls`
- **Execution Waves**:
  - Wave 1 (直列): Phase 1 (`FullTacticalCanvas.tsx` + `playback-controls.tsx`)
  - Wave 2 (並列, Wave 1 後): Phase 2 (`full-tactical-canvas.test.tsx`), Phase 3 (`full-tactical-canvas-integration.test.tsx`)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/views/FullTacticalCanvas.tsx): CanvasStoreProvider|createCanvasStore|useTacticalUnifiedStoreApi|useTacticalAnimation`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `FullTacticalCanvas.tsx` から `CanvasStoreProvider`・`createCanvasStore()`・`useTacticalUnifiedStoreApi`・`useTacticalAnimation`・双方向同期 `useEffect` を完全撤去し、3-frequency store（`TacticalStoreProvider` の `documentStore` / `sessionStore` / `playbackStore`）のみで完結させる。
  2. 再生時計 `useTacticalAnimation()`（引数なし）は常時マウントされる `playback-controls.tsx` 側へ移設し、`playbackStore.isPlaying === true` の間 `timeMs` を進行させる責務を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 外側 `FullTacticalCanvas` は既存通り `<TacticalStoresContext.Consumer>` で未ラップ時のみ `<TacticalStoreProvider>` でラップし、二重プロバイダー生成を防止する。
  2. `initialProject` 受け取り時は `normalizeTacticalProject(initialProject)` により `documentStore.getState().loadProject(...)` および `sessionStore.getState().resetSession()` を呼んで初期同期する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`

---

## 2. Implementation Phases

### Phase 1: `FullTacticalCanvas` のブリッジ撤去と `PlaybackControls` への再生時計移設

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (298 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (89 lines)
- **Contract**:
  1. `src/features/tactical-unified/views/FullTacticalCanvas.tsx`:
     - `useTacticalUnifiedStoreApi`・`createCanvasStore`・`CanvasStoreProvider`・`useTacticalAnimation` のインポートと呼び出しを削除する。
     - `FullTacticalCanvasInner` は `useDocumentStore` / `useSessionStore` / `usePlaybackStore` / `useTacticalStoresContext` のみを購読し、`CanvasStageContainer` へ直接レンダリングする。
     - `initialProject` の同期は `normalizeTacticalProject` -> `loadProject` + `resetSession` で行い、`CanvasStore` や `TacticalUnifiedStore` との双方向 `useEffect` を持たない。
  2. `src/features/tactical-unified/panels/timeline/playback-controls.tsx`:
     - 引数なしで `useTacticalAnimation()` を呼び出し、`isPlaying === true` の間 RAF ループで `playbackStore.timeMs` を更新する再生時計を駆動する。
- **Concrete Test Cases**:
  - 既存 `FullTacticalCanvas` および `PlaybackControls` の公開 Props 契約を維持し、Phase 2・Phase 3 の実 `TacticalStoreProvider` テストで再生時計進行とステージ連動を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/panels/timeline/playback-controls.tsx`

---

### Phase 2: `full-tactical-canvas.test.tsx` の 3-frequency store 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` (225 lines)
- **Contract**:
  - `useTacticalUnifiedStore` / `TacticalUnifiedStoreContext` / `CanvasStore` 依存を完全撤去し、実 `TacticalStoreProvider`（`createDocumentStore` / `createSessionStore` / `createPlaybackStore`）のみで検証する（内部ストア・フックの `vi.mock` 禁止）。
- **Concrete Test Cases**:
  - `FullTacticalCanvas` へ `initialProject` を渡して描画した際、`documentStore` に正規化済みプロジェクトがロードされ、ツールバー・タイムライン・ステージが正しく描画されることを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx`

---

### Phase 3: `full-tactical-canvas-integration.test.tsx` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (322 lines)
- **Contract**:
  - `TacticalUnifiedStoreContext` / `createTacticalUnifiedStore` / `CanvasStore` 参照をすべて削除し、`TacticalStoreProvider` による統合テストへ移行する（内部ストアの `vi.mock` 禁止）。
- **Concrete Test Cases**:
  - スライド切替・フェーズ切替・`PlaybackControls` での再生開始と `playbackStore.timeMs` 更新・オブジェクト選択と HUD 連動・`documentStore` の Undo/Redo 履歴を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`
