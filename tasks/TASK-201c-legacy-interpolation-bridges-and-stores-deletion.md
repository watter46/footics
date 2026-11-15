# TASK-201c: 旧ストア (`TacticalUnifiedStore` / `*-slice`)・旧補間・旧ブリッジの完全物理削除 & Wave F 最終検証

- **Status**: `TODO`
- **Assign**: `worker`
- **Commit**: `chore(tactical): delete legacy TacticalUnifiedStore, slices, bridges, interpolation modules, and obsolete store tests`
- **Execution Waves**:
  - Wave 1 (直列): Phase 1 (旧補間・旧ブリッジ群 `[DELETE]`), Phase 2 (`TacticalUnifiedStore` & `*-slice` 群 `[DELETE]`), Phase 3 (旧ストア専用テスト群 `[DELETE]` + 3-frequency store 最終チェック)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/stores/tactical-unified-store.ts`
  - `absent: src/features/tactical-unified/stores/tactical-unified-store-provider.tsx`
  - `absent: src/stores/tactical-unified-store.ts`
  - `absent: src/lib/tactical/unified-interpolation.ts`
  - `absent: src/lib/tactical/match-to-tactical-bridge.ts`
  - `absent: src/lib/tactical/squad-to-tactical-bridge.ts`
  - `rg(src/,extension/): tactical-unified-store|unified-interpolation|match-to-tactical-bridge|squad-to-tactical-bridge`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. 旧 `TacticalUnifiedStore`・旧 `*-slice.ts`・旧 `unified-interpolation.ts` / `interpolation-*.ts`・旧 `*-to-tactical-bridge.ts` はすべて物理削除し、後方互換シムや再エクスポートを一切残さない。
  2. 現用 3-frequency ストア群（`document-store.ts`, `session-store.ts`, `playback-store.ts`, `tactical-store-provider.tsx`, `domain-selectors.ts`, `reset-tactical-project.ts`, `session-ui-*.ts`）およびパネル等から参照される共有ヘルパー（`slide-flip-helpers.ts`, `slide-reset-helpers.ts`, `store-helpers.ts` 等）とそのテスト（`three-frequency-stores.test.ts`, `domain-selectors.test.ts`, `tactical-store-provider.test.ts`, `session-ui-transitions.test.ts`, `slide-flip-helpers.test.ts`, `slide-reset-helpers.test.ts`, `store-helpers.test.ts`）は破壊せず全通過を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `stores/` 配下で旧 `*-slice.ts` のみから参照されていたアクションモジュール（`project-slice-actions.ts`, `project-slice-config-actions.ts`, `phase-crud-actions.ts`, `director-camera-actions.ts`）も同時に `[DELETE]` する。
  2. 削除完了後、3-frequency store テストおよび全 Wave F Negative Contracts を検証する。
- **Consumers (同期更新対象)**:
  - 全 Wave F 物理削除対象ファイルと現用 3-frequency ストア検証ファイル

---

## 2. Implementation Phases

### Phase 1: 旧補間モジュール群・旧ブリッジ群・専用テストの物理削除

- **Target Files**:
  - `[DELETE]` `src/lib/tactical/unified-interpolation.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-annotation.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-ball.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-camera.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-director.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-geometry.ts`
  - `[DELETE]` `src/lib/tactical/interpolation-player.ts`
  - `[DELETE]` `src/lib/tactical/match-to-tactical-bridge.ts`
  - `[DELETE]` `src/lib/tactical/squad-to-tactical-bridge.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/unified-interpolation.test.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/interpolation-camera.test.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/interpolation-director.test.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts`
- **Contract**:
  - 上記 14 ファイルをすべて物理削除する。`src/lib/tactical/engine/timeline-evaluator.ts` テストでエンジン契約が代替維持されていること。
- **Concrete Test Cases**:
  - `bun run ai:check src/lib/tactical/__tests__/timeline-evaluator.test.ts src/lib/tactical/__tests__/acl-translators.test.ts` で型・ドメイン変換・タイムライン評価が通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/timeline-evaluator.test.ts src/lib/tactical/__tests__/acl-translators.test.ts`

---

### Phase 2: 旧 `TacticalUnifiedStore` と全 `*-slice` ファイルの物理削除

- **Target Files**:
  - `[DELETE]` `src/stores/tactical-unified-store.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/tactical-unified-store.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/tactical-unified-store-provider.tsx`
  - `[DELETE]` `src/features/tactical-unified/stores/tactical-unified-selectors.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/annotation-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/clipboard-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/history-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/pitch-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/project-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/project-slice-actions.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/project-slice-config-actions.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/phase-crud-actions.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/director-camera-actions.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-attachment-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-ball-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-crud-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-formation-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-playback-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-player-crud-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-player-move-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-player-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-transition-slice.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/tool-slice.ts`
- **Contract**:
  - 上記 24 ファイルをすべて物理削除する。現用 3-frequency store（`document-store.ts`, `session-store.ts`, `playback-store.ts`, `tactical-store-provider.tsx`）に型・インポートエラーが出ないこと。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/stores/tactical-store-provider.tsx src/features/tactical-unified/stores/document-store.ts` で 3-frequency store の整合を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/tactical-store-provider.tsx src/features/tactical-unified/stores/document-store.ts`

---

### Phase 3: 旧ストア専用テスト群の物理削除 & 3-frequency store 統合チェック

- **Target Files**:
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/batch-delete-and-clone.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/history.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/phase-aspect-and-boundary.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/phase-match-init.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/project-slice-pitch-appearance.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-crud-slice.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-slices.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/step5-bench-and-custom-player.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/tactical-unified-store-aspect-boundary.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/tactical-unified-store-objects-lock.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/tactical-unified-store-players.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/tactical-unified-store-project-slide.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/tactical-unified-store-provider.test.tsx`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/workspace-mode.test.ts`
- **Contract**:
  - 旧モノリシックストア・旧スライスのみを対象とした上記 16 テストファイルを物理削除する（3-frequency store 検証は `three-frequency-stores.test.ts`, `domain-selectors.test.ts`, `tactical-store-provider.test.ts`, `session-ui-transitions.test.ts` 等で継続保証）。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts` が全通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts`
