# TASK-202c: ベンチマークプリセットの Domain 型移行と `attachSlidesGetter` 削除

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate benchmark-presets to DomainTacticalProject and remove attachSlidesGetter`
- **Execution Waves**:
  - Wave 1 (sequential): Phase 1
  - Wave 2 (sequential): Phase 2
- **Negative Contracts**:
  - `rg(src/lib/tactical/benchmark-presets.ts): attachSlidesGetter|\bTacticalProject\b|createDefaultPlayer|types/tactical-unified`
  - `rg(src/features/tactical-unified/__tests__/benchmark-presets.test.ts): project\.slides\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `src/lib/tactical/benchmark-presets.ts` 内の独自 `attachSlidesGetter` 関数および `TacticalProject` / `Slide` への依存を完全に撤去し、`DomainTacticalProject` / `DomainTacticalPhase` / `DomainSlide` / `PitchPlayer` の正規構造のみを生成する。
  2. 生成される各ベンチマーク（Low Block, High Press, 10-Slide Full Sequence, 6-Slide）は `DomainTacticalProjectSchema.safeParse(...)` に違反しないこと（`version: '3.0.0'`, `createdAt`/`updatedAt` ISO datetime, `phases` に `aspectRatio` / `boundaryBox`, 選手座標は `clampToScreenNorm`、各スライドに `ball` と `easing` 等を保持）。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `createDefaultPlayer` の呼び出しは `src/lib/tactical/domain/formation-placement.ts` の `createDefaultDomainPlayer(team, x, y, color, 'pitch')` に統一し、返却された `PitchPlayer` ベースにカスタムフィールド（`id`, `shirtNo`, `position`, `name`, `trajectory`, `markerEffect`, `focus` 等）を上書き構築する。
  2. `benchmark-presets.ts` は 1091 行の大ファイルであるため、大ファイル特例（1 Phase = 1 プロダクションファイル）に従い Phase 1 単独で更新し、呼び出し元とテスト確認を Phase 2 に分離する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu-sections.tsx`
  - `src/features/tactical-unified/__tests__/benchmark-presets.test.ts`

## 2. Implementation Phases

### Phase 1: `benchmark-presets.ts` の Domain 型全面移行（大ファイル 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/benchmark-presets.ts` (1091 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/branded.ts`
  - `src/lib/tactical/domain/formation-placement.ts`
- **Contract**:
  ```ts
  export function createLowBlockBenchmarkProject(): DomainTacticalProject;
  export function createHighPressBenchmarkProject(): DomainTacticalProject;
  export function createTenSlideFullSequenceBenchmarkProject(): DomainTacticalProject;
  export function createSixSlideBenchmarkProject(): DomainTacticalProject;
  ```
  - 振る舞い仕様・境界条件:
    1. ローカル関数 `attachSlidesGetter` を物理削除する。
    2. 全4関数の返却値を `DomainTacticalProject` とし、各要素を `DomainTacticalPhase` / `DomainSlide` / `DomainPlayer` / `DomainArrowAnnotation` / `DomainZoneAnnotation` / `DomainBallState` 準拠にする（`ScreenNormCoord` / `ScreenNormPoint` は `clampToScreenNorm` / `toScreenNormPoint` で生成）。
    3. `DomainSlide` に不要な旧フィールド（`aspectRatio`, `boundaryBox`, `backgroundType`, `pitchAppearance` 等）や `Zone` の `isComplete` を持たせない（プロジェクト・フェーズ階層へ配置）。
- **Concrete Test Cases**:
  - Phase 2 で `benchmark-presets.test.ts` による検証および `DomainTacticalProjectSchema.safeParse()` 適合を保証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/benchmark-presets.ts`

### Phase 2: ベンチマークプリセットテストの Domain 検証追加と呼び出し元確認
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/benchmark-presets.test.ts` (78 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical/panels/toolbar/top-bar-more-menu-sections.tsx`
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - `benchmark-presets.test.ts` で全ベンチマークの `phases[].slides` 参照を維持しつつ、`DomainTacticalProjectSchema.safeParse(project).success === true` を検証するテストケースを追加する。
- **Concrete Test Cases**:
  - `benchmark-presets.test.ts`: Low Block (3 slides), High Press (2 slides), 10-Slide (~16.2s), 6-Slide すべて `DomainTacticalProjectSchema` 検証に合格し、`calculateUnifiedTotalDuration` が期待値を返すこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/benchmark-presets.test.ts src/features/tactical-unified/panels/toolbar/top-bar-more-menu-sections.tsx`
