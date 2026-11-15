# TASK-201a: `types/index.ts`・`lib/tactical/index.ts`・外部モジュールテスト群のレガシー依存撤去

- **Status**: `TODO`
- **Assign**: `worker`
- **Commit**: `refactor(tactical): detach tactical-unified/types, lib/tactical barrel, and external feature tests from legacy stores and bridges`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`types/index.ts` + `lib/tactical/index.ts`), Phase 2 (`tactical-page.test.tsx` + `use-team-squad-client.test.tsx` + `trajectory.test.ts`), Phase 3 (`squad-panel-step5.test.tsx` 1+1), Phase 4 (`step5-defaults-and-bench-grid.test.ts`)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/types/index.ts,src/lib/tactical/index.ts,src/app/tactical/__tests__/tactical-page.test.tsx,src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx,src/lib/tactical/__tests__/trajectory.test.ts,src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx,src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts): tactical-unified-store|unified-interpolation|match-to-tactical-bridge|squad-to-tactical-bridge|-slice`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. レガシー `*-slice.ts`、`unified-interpolation.ts`、`match-to-tactical-bridge.ts`、`squad-to-tactical-bridge.ts` を Wave F（`TASK-201c`）で物理削除してもプロダクション型および外部テストが一切壊れないよう、先に参照を完全除去する。
  2. `vi.mock` で旧ブリッジを差し替えるテストを廃し、実 ACL モジュール（`buildMatchToDomainProject`・`translateSquadToDomainPlayers`）および純粋関数（`engine/`）へ移行する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `src/features/tactical-unified/types/index.ts` からは `TacticalUnifiedState`・全 `*Slice` 型・`TacticalClipboard` の再エクスポートを削除する（`MarkerOptionTab`, `PanelState`, `SelectedObject`, `SelectedObjectKind` が外部利用中であれば `../stores/tool-types` 等から再エクスポートする）。
  2. `src/lib/tactical/index.ts` から `export * from './unified-interpolation'` を削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/types/index.ts`, `src/lib/tactical/index.ts`
  - `tactical-page.test.tsx`, `use-team-squad-client.test.tsx`, `trajectory.test.ts`, `squad-panel-step5.test.tsx`, `step5-defaults-and-bench-grid.test.ts`

---

## 2. Implementation Phases

### Phase 1: バレル `types/index.ts` と `lib/tactical/index.ts` のレガシー型・再エクスポート撤去

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/types/index.ts` (86 lines)
  - `[MODIFY]` `src/lib/tactical/index.ts` (10 lines)
- **Contract**:
  1. `src/features/tactical-unified/types/index.ts`: `clipboard-helpers` / `clipboard-slice` / `history-slice` / `slide-slice` / `tactical-unified-store` / `tool-slice` からの型再エクスポートを削除する（`MarkerOptionTab`, `PanelState`, `SelectedObject`, `SelectedObjectKind` を維持する場合は `../stores/tool-types` 等、レガシーストアに依存しない定義元へ切り替える）。
  2. `src/lib/tactical/index.ts`: `export * from './unified-interpolation';` を削除する。
- **Concrete Test Cases**:
  - `ai:check` で `tsc` エラーおよびバレル循環がないことを検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/types/index.ts src/lib/tactical/index.ts`

---

### Phase 2: `tactical-page.test.tsx`・`use-team-squad-client.test.tsx`・`trajectory.test.ts` の脱レガシー

- **Target Files**:
  - `[MODIFY]` `src/app/tactical/__tests__/tactical-page.test.tsx` (173 lines)
  - `[MODIFY]` `src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx` (120 lines)
  - `[MODIFY]` `src/lib/tactical/__tests__/trajectory.test.ts` (149 lines)
- **Contract & Concrete Test Cases**:
  1. `tactical-page.test.tsx`: `import type { TacticalUnifiedState }` を撤去し、`DomainTacticalProject` または `TacticalPage` 契約に沿ったモック型で既存アサーションを維持する。
  2. `use-team-squad-client.test.tsx`: 不要となった `squad-to-tactical-bridge` のインポートおよび `vi.mock('@/lib/tactical/squad-to-tactical-bridge', ...)` を完全削除する。
  3. `trajectory.test.ts`: `unified-interpolation` 依存を除去し、`matchSlidePlayers` 検証は `export/tactical-video-exporter`（または `slide-interpolator` のプレイヤーマッチング）対象へ切り替えて既存ベジェ軌道テスト全件を維持する。
- **Verification**:
  - `bun run ai:check src/app/tactical/__tests__/tactical-page.test.tsx src/features/teams/hooks/__tests__/use-team-squad-client.test.tsx src/lib/tactical/__tests__/trajectory.test.ts`

---

### Phase 3: `squad-panel-step5.test.tsx` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` (470 lines)
- **Contract & Concrete Test Cases**:
  - `@/lib/tactical/match-to-tactical-bridge` インポート・モックを完全撤去し、実 `TacticalStoreProvider` ＋ `@/lib/tactical/acl/match-project-translator`（`buildMatchToDomainProject`）に置き換える。
  - 全 11 ケース（サブキャンバス描画・ベンチ3列整理・matchId連動プリセット表示切替・再初期化・選択・ピッチ移動・フォームUI確認）を通過させる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

---

### Phase 4: `step5-defaults-and-bench-grid.test.ts` の ACL 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts` (240 lines)
- **Contract & Concrete Test Cases**:
  - `match-to-tactical-bridge`（`buildMatchTacticalPlayers`）および `squad-to-tactical-bridge`（`convertSquadToTacticalPlayers`）への依存を、実 ACL 変換（`buildMatchToDomainProject` from `@/lib/tactical/acl/match-project-translator` および `translateSquadToDomainPlayers` from `@/lib/tactical/acl/match-squad-translator`）＋ ドメインの `resetSlideKeepSquadData` 検証へ移行する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`
