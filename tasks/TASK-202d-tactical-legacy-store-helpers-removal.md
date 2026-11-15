# TASK-202d: 旧ストア補助モジュール & 未使用バレルの物理削除

- **Status**: `TODO`
- **Commit**: `refactor(tactical): delete legacy store helpers, dead types barrel, and migrate remaining utility callers`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2
  - Wave 2 (sequential): Phase 3
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/stores/store-helpers.ts`
  - `absent: src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `absent: src/features/tactical-unified/stores/slide-flip-helpers.ts`
  - `absent: src/features/tactical-unified/stores/slide-player-move-helper.ts`
  - `absent: src/features/tactical-unified/types/index.ts`
  - `rg(src/,extension/): store-helpers|slide-reset-helpers|slide-flip-helpers|slide-player-move-helper|isVerticalPitch|tactical-unified/types`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 3-frequency store と Domain ハンドラ（`slide-flip`, `slide-reset`, `squad-placement`）が既に責務を引き継いでいるため、旧ストア時代の名残である補助ファイルとテストは温存せず物理削除する。
  2. `isVerticalPitch(aspectRatio)` の判定仕様（`9:16`, `4:5`, `1:1` で `true`、未指定や `16:9` 等は `false`）は `primitives.ts` の `isVerticalAspectRatio` と整合させる。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `formation-panel.tsx` と `top-bar-center.tsx` の `isVerticalPitch(aspectRatio)` 呼び出しは、`@/lib/types/tactical/primitives` の `isVerticalAspectRatio` へ直接置換する。
  2. `slide-player-move-helper.ts` 内の純粋関数 `findSafePitchPosition` は `src/lib/tactical/domain/squad-placement.ts` へ移設し、`pitch-bench-transition.test.ts` の import 元を切り替える。
  3. `step5-defaults-and-bench-grid.test.ts` 内の `resetSlideKeepSquadData` 参照は `src/lib/tactical/domain/slide-reset.ts` の `resetSlideKeepSquadPositions` に切り替える。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
  - `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`

## 2. Implementation Phases

### Phase 1: UI 呼び出し元の置換と `findSafePitchPosition` の Domain 層移設
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (L10-L45)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (L14-L85)
  - `[MODIFY]` `src/lib/tactical/domain/squad-placement.ts`
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts` (L10-L18, L260-L285)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/slide-player-move-helper.ts` (L97-L139)
  - `src/lib/types/tactical/primitives.ts` (L33-L35)
  - `src/lib/tactical/domain/slide-reset.ts` (L83-L150)
- **Contract**:
  ```ts
  export function findSafePitchPosition(
    existingPlayers: ReadonlyArray<{ x: number; y: number; area: string }>,
    team?: 'home' | 'away' | 'neutral',
  ): { x: number; y: number };
  ```
  - 振る舞い仕様・境界条件:
    1. `formation-panel.tsx` と `top-bar-center.tsx` から `slide-flip-helpers` への依存を排除し、`isVerticalAspectRatio` を使う。
    2. `findSafePitchPosition` の探索ロジック（Home/Away 基準点と螺旋/グリッド探索、ベンチ選手無視）を `squad-placement.ts` へそのまま移設する。
    3. `step5-defaults-and-bench-grid.test.ts` は `resetSlideKeepSquadPositions`（`DomainSlide` 入力）を検証する形に更新する。
- **Concrete Test Cases**:
  - `step5-defaults-and-bench-grid.test.ts`: `resetSlideKeepSquadPositions` がフルピッチ座標を維持すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/formation-panel.tsx src/features/tactical-unified/panels/toolbar/top-bar-center.tsx src/lib/tactical/domain/squad-placement.ts src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`

### Phase 2: `pitch-bench-transition.test.ts` の import 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (579 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/domain/squad-placement.ts`
- **Contract**:
  - `slide-player-move-helper` への import を除去し、`@/lib/tactical/domain/squad-placement` からの `findSafePitchPosition` へ切り替える。
- **Concrete Test Cases**:
  - `pitch-bench-transition.test.ts` 内の全テストケースがパスすること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`

### Phase 3: 旧ストア補助モジュール・未使用バレル・旧ヘルパーテストの物理削除
- **Target Files**:
  - `[DELETE]` `src/features/tactical-unified/stores/store-helpers.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-flip-helpers.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/slide-player-move-helper.ts`
  - `[DELETE]` `src/features/tactical-unified/types/index.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/store-helpers.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-reset-helpers.test.ts`
  - `[DELETE]` `src/features/tactical-unified/stores/__tests__/slide-flip-helpers.test.ts`
- **Contract**:
  - 上記 8 ファイルをすべて物理削除する。3-frequency store および全パネルの型整合・既存テストが維持されること。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts`
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts`
