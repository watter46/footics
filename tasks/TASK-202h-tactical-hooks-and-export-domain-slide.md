# TASK-202h: Hooks & Export 境界の `DomainSlide` 純化と共有設定移行

- **Status**: `DONE`
- **Commit**: `refactor(tactical): purify tactical hooks and export pipeline to DomainSlide and neutral configs`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3
  - Wave 2 (sequential): Phase 4, Phase 5
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/hooks,src/features/tactical-unified/components/use-share-page-export.ts,src/lib/tactical/export): types/tactical/(annotations|player|project|slide)(['"]|/|$)|\b(ExportSlide|ExportableSlide|Slide\s*\|\s*DomainSlide)\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. 過渡期のユニオン型（`Slide | DomainSlide`, `ExportableSlide`, `ExportSlide`）を全面撤去し、`DomainSlide` のみを受け取るように純化する。
  2. Export 領域の共有設定（`DirectorCameraTrack`, `BoundaryBox`, `PitchTransform`, `PitchAppearanceConfig`, `ScreenBackgroundConfig`, `ArrowEffectConfig`, `ZoneEffectConfig`, `MarkerEffectConfig`, `ExportTarget`）はすべて中立モジュールから import する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `tactical-timeline.ts` と `tactical-playback-controls.ts` の `readonly (Slide | DomainSlide | SlideTimingLike)[]` / `readonly (Slide | DomainSlide)[]` から `Slide` を除去する。
  2. `konva-export-helpers.ts` / `tactical-frame-effects.ts` のエイリアス `ExportableSlide` / `ExportSlide` を削除し直接 `DomainSlide` を使用する。
  3. `video-export.test.ts` でテスト用スライドを作成する際は `DomainSlide` 型（`toScreenNormCoord` / `Easing` 等）に合わせる（`createDefaultSlide` の返り値に `backgroundType` 等がない前提に適合）。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/hooks/*`, `src/features/tactical-unified/components/use-share-page-export.ts`
  - `src/lib/tactical/export/*` および関連テスト

## 2. Implementation Phases

### Phase 1: アニメーション・エクスポート Hooks (4ファイル) の `DomainSlide` 純化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/tactical-timeline.ts` (123 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (276 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/konva-export-helpers.ts` (157 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/konva-slide-export.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/lib/types/tactical/camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - 4ファイルから `Slide` および `project`/`slide` への import を除去し、`DomainSlide` と中立設定モジュールへ統一する。
- **Concrete Test Cases**:
  - Phase 2 の `konva-export-helpers.test.ts` および `tactical-animation.test.ts` の契約を維持する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/features/tactical-unified/hooks/konva-export-helpers.ts src/features/tactical-unified/hooks/konva-slide-export.ts`

### Phase 2: `konva-export-helpers.test.ts` & `use-share-page-export.ts` の移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`
  - `[MODIFY]` `src/features/tactical-unified/components/use-share-page-export.ts` (215 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - `Slide` import を `DomainSlide`（`@/lib/types/tactical/domain-hierarchy`）へ変更する。
- **Concrete Test Cases**:
  - `konva-export-helpers.test.ts` が全通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts src/features/tactical-unified/components/use-share-page-export.ts`

### Phase 3: Export Engine / Effects / SharePayload (4ファイル) の `DomainSlide` 純化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/tactical-frame-effects.ts` (230 lines)
  - `[MODIFY]` `src/lib/tactical/export/share-payload.ts` (141 lines)
  - `[MODIFY]` `src/lib/tactical/export/video-export-types.ts` (50 lines)
  - `[MODIFY]` `src/lib/tactical/export/tactical-video-exporter.ts` (286 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/lib/types/tactical/effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`
- **Contract**:
  - `tactical-frame-effects.ts` から `ExportSlide` ユニオンを撤去し `DomainSlide` のみに統一する。
  - 4ファイルすべての共有設定 import 元を中立モジュールへ変更する。
- **Concrete Test Cases**:
  - Phase 4 の `tactical-video-exporter.test.ts`, `video-export-engine.test.ts` で検証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/tactical-frame-effects.ts src/lib/tactical/export/share-payload.ts src/lib/tactical/export/video-export-types.ts src/lib/tactical/export/tactical-video-exporter.ts`

### Phase 4: Export 単体テスト 2 本の Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/tactical-video-exporter.test.ts`
  - `[MODIFY]` `src/lib/tactical/__tests__/video-export-engine.test.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `domain-entities.ts`
  - `src/lib/tactical/domain/formation-placement.ts`
- **Contract**:
  - `Player` / `Slide` を `DomainPlayer` / `DomainSlide` へ変更し、テストフィクスチャを Domain 準拠へ更新する。
- **Concrete Test Cases**:
  - `tactical-video-exporter.test.ts` と `video-export-engine.test.ts` が全通過すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/tactical-video-exporter.test.ts src/lib/tactical/__tests__/video-export-engine.test.ts`

### Phase 5: `video-export.test.ts` の Domain 型移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/video-export.test.ts` (669 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `branded.ts`
  - `src/lib/types/tactical/pitch-config.ts`, `project-config.ts`
- **Contract**:
  - `Slide` を `DomainSlide` へ変更し、テストスライド生成が `DomainSlide` の必須構造（`id`, `index`, `players`, `arrows`, `zones`, `texts`, `ball`, `transitionDurationMs`, `pauseMs`, `easing`）に適合するように更新する。
- **Concrete Test Cases**:
  - `video-export.test.ts` 内の全テストケース（2K/60fps・BoundaryCrop・動的カメラワーク・Pause フレームエフェクト）が通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/video-export.test.ts`
