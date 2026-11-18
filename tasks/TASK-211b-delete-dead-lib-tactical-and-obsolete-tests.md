# TASK-211b: Delete Dead `src/lib/tactical/` Modules and Obsolete/Transitional Tests

- **Status**: `TODO`
- **Commit**: `refactor(tactical): remove dead lib/tactical modules and obsolete transitional tests`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
- **Negative Contracts**:
  - `absent: src/lib/tactical/engine/eraser-hit-test.ts`
  - `absent: src/lib/tactical/__tests__/eraser-hit-test.test.ts`
  - `absent: src/lib/tactical/export/auto-benchmark-engine.ts`
  - `absent: src/lib/tactical/export/auto-benchmark-report.ts`
  - `absent: src/lib/tactical/acl/formation-placements.ts`
  - `absent: src/lib/tactical/acl/formation-translator.ts`
  - `absent: src/lib/tactical/acl/match-squad-translator.ts`
  - `absent: src/lib/tactical/__tests__/acl-presets.test.ts`
  - `absent: src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`
  - `rg: eraser-hit-test|findEraseTargetIds|runAutoBenchmark|auto-benchmark|formation-placements|formation-translator|match-squad-translator`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 拡張機能（QuickAnnotationCanvas / QuickTacticalCanvas）から利用中の `src/lib/tactical/acl/screenshot-translator.ts` および `match-project-translator.ts`, `legacy-project-translator.ts` は削除しない。
  2. 現行の消しゴム正本 `src/lib/tactical/domain/erase-entities.ts` およびフォーメーション正本 `src/lib/tactical/domain/formation-placement.ts`, `squad-placement.ts` は維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `step5-defaults-and-bench-grid.test.ts` のうち有効だった検証（`DomainPlayerSchema`, `computeDomainBenchGridPositions`, `buildMatchToDomainProject`, `RESET_SLIDE_KEEP_SQUAD`）は既に `domain-schemas.test.ts`, `formation-placement.test.ts`, `match-project-translator.test.ts`, `slide-modes-and-reset.test.ts` で網羅済みのため、重複した移行期テストファイルごと完全削除する。
  2. `auto-benchmark-engine.ts` / `auto-benchmark-report.ts` は全リポジトリから未参照のため完全削除する。
- **Consumers (同期更新対象)**:
  - なし（削除対象はいずれも本番コードから未参照）

## 2. Implementation Phases

### Phase 1: Delete Duplicate `eraser-hit-test` Module & Test
- **Target Files**:
  - `[DELETE]` `src/lib/tactical/engine/eraser-hit-test.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/eraser-hit-test.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/domain/erase-entities.ts`
  - `src/lib/tactical/domain/__tests__/erase-entities.test.ts`
- **Contract**:
  - 現行の `eraseEntitiesAtPoint` と完全に重複している旧 `eraser-hit-test.ts` とその専用テストを削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/domain/__tests__/erase-entities.test.ts`: 既存の消しゴム判定テストがすべて PASS。
- **Verification**:
  - `bun run ai:check src/lib/tactical/domain/__tests__/erase-entities.test.ts`

### Phase 2: Delete Unused `auto-benchmark` Export Modules
- **Target Files**:
  - `[DELETE]` `src/lib/tactical/export/auto-benchmark-engine.ts`
  - `[DELETE]` `src/lib/tactical/export/auto-benchmark-report.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/export/tactical-video-exporter.ts`
- **Contract**:
  - 未参照の自動ベンチマーク計測・Markdownレポート生成モジュールを削除する。
- **Concrete Test Cases**:
  - 既存のエクスポート関連テストに悪影響がないこと（後続 `ai:commit` の全体 `tsc` / `vitest` で確認）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/tactical-video-exporter.ts`

### Phase 3: Delete Dead ACL Translators & Obsolete Preset/Transitional Tests
- **Target Files**:
  - `[DELETE]` `src/lib/tactical/acl/formation-placements.ts`
  - `[DELETE]` `src/lib/tactical/acl/formation-translator.ts`
  - `[DELETE]` `src/lib/tactical/acl/match-squad-translator.ts`
  - `[DELETE]` `src/lib/tactical/__tests__/acl-presets.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/domain/__tests__/formation-placement.test.ts`
  - `src/lib/tactical/acl/__tests__/match-project-translator.test.ts`
  - `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`
- **Contract**:
  - 本番コードから未参照の旧 ACL 変換群（`formation-placements`, `formation-translator`, `match-squad-translator`）およびそれらのみに依存する `acl-presets.test.ts`, `step5-defaults-and-bench-grid.test.ts` を削除する。
- **Concrete Test Cases**:
  - `src/lib/tactical/domain/__tests__/formation-placement.test.ts`, `src/lib/tactical/acl/__tests__/match-project-translator.test.ts`, `src/lib/tactical/__tests__/slide-modes-and-reset.test.ts` がすべて PASS。
- **Verification**:
  - `bun run ai:check src/lib/tactical/domain/__tests__/formation-placement.test.ts src/lib/tactical/acl/__tests__/match-project-translator.test.ts src/lib/tactical/__tests__/slide-modes-and-reset.test.ts`
