# TASK-200b: 動画エクスポーター群 (`mediabunny` / `media-recorder` / `tactical-video-exporter`) 単一パイプライン化

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-export): migrate video exporters and auto-benchmark to renderTacticalPhaseFrameToCanvas`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`video-export-types` + `video-mediabunny-export` + `video-media-recorder-export`), Phase 2 (`tactical-video-exporter` + `auto-benchmark-engine`)
  - Wave 2 (並列, Wave 1 後): Phase 3 (`video-export-engine.test.ts` 1+1), Phase 4 (`tactical-video-exporter.test.ts` 1+1), Phase 5 (`video-export.test.ts` 1+1)
- **Negative Contracts**:
  - `rg(src/lib/tactical/export/video-export-types.ts,src/lib/tactical/export/video-mediabunny-export.ts,src/lib/tactical/export/video-media-recorder-export.ts,src/lib/tactical/export/tactical-video-exporter.ts,src/lib/tactical/export/auto-benchmark-engine.ts): \bmvpMatrix\b|\bprecomputedFrame\b|\bgetInterpolatedUnifiedSlideFrame\b|\brenderTacticalFrameToCanvas\b|\bbuildExportMVPMatrix\b|unified-interpolation`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `video-mediabunny-export.ts` および `video-media-recorder-export.ts` は `normalizePhases` で構築した単一 `DomainTacticalPhase` を `renderTacticalPhaseFrameToCanvas` へ直接渡し、フレーム毎の `getInterpolatedUnifiedSlideFrame` 事前評価や `buildExportMVPMatrix` 外部構築を行わない。
  2. ポーズフレーム再利用最適化（静的カメラかつ `hasActiveFrameEffects(slides) === false` 時の重複描画スキップ）は `tactical-frame-effects.ts` の `isPauseFrame`・`hasActiveFrameEffects` をそのまま使い維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `VideoExportOptions` / `MultiSlideVideoExportOptions` から `mvpMatrix` オプションを完全に削除し（二重持ち・フォールバック禁止）、カメラ状態は `pitchTransform`・`directorCamera`・`directorCameraOptions` のみに統一する。
  2. `matchSlidePlayers` 等の純粋ユーティリティは `@/lib/tactical/engine/director-camera`（または `slide-interpolator.ts` / `tactical-video-exporter.ts` 内）から供給し、`unified-interpolation` を一切参照しない。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/export/video-export-types.ts`, `video-mediabunny-export.ts`, `video-media-recorder-export.ts`, `tactical-video-exporter.ts`, `auto-benchmark-engine.ts`

---

## 2. Implementation Phases

### Phase 1: `video-export-types`・`video-mediabunny-export`・`video-media-recorder-export` のパイプライン統合

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/video-export-types.ts` (51 lines)
  - `[MODIFY]` `src/lib/tactical/export/video-mediabunny-export.ts` (280 lines)
  - `[MODIFY]` `src/lib/tactical/export/video-media-recorder-export.ts` (253 lines)
- **Contract**:
  1. `video-export-types.ts`: `ResolveSyntheticDirectorCameraOptions` のインポート元を `@/lib/tactical/engine/director-camera` へ変更し、`mvpMatrix` フィールドを削除する。
  2. `video-mediabunny-export.ts`:
     - `buildExportMVPMatrix`、`getInterpolatedUnifiedSlideFrame`、`renderTacticalFrameToCanvas`、`hasCameraDelta` の旧インポートを撤去する。
     - 開始時に `normalizePhases` で単一 `DomainTacticalPhase` を構築し、各フレーム（およびポーズ非スキップフレーム）で `renderTacticalPhaseFrameToCanvas` に `phase`, `timeMs`, `width`, `height`, `baseWidth`, `baseHeight`, `aspectRatio`, `boundaryBox`, `pitchTransform`, `directorCamera`, `directorCameraOptions`, `pitchAppearance`, `marbleTexture`, `screenBackground`, `transparent`, `playerPhotos`, `teamVisibility`, `applyEffects: true` を直接渡す。
     - ポーズ最適化時は `isPauseFrame` と `hasActiveFrameEffects`（エフェクト有りなら毎フレーム描画）を維持する。
  3. `video-media-recorder-export.ts`:
     - `buildExportMVPMatrix` と `renderTacticalFrameToCanvas` を撤去し、`normalizePhases` + `renderTacticalPhaseFrameToCanvas` で描画する。
- **Concrete Test Cases**:
  - Phase 3〜5 のテスト移行で MP4 / WebM 出力、境界クロップ、ポーズ最適化、エラー時のキャンセル・クリーンアップを検証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/video-export-types.ts src/lib/tactical/export/video-mediabunny-export.ts src/lib/tactical/export/video-media-recorder-export.ts`

---

### Phase 2: `tactical-video-exporter` と `auto-benchmark-engine` の脱レガシー

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/tactical-video-exporter.ts` (289 lines)
  - `[MODIFY]` `src/lib/tactical/export/auto-benchmark-engine.ts` (220 lines)
- **Contract**:
  1. `tactical-video-exporter.ts`:
     - `../unified-interpolation` インポートを廃止し、`calculateUnifiedTotalDuration` / `ResolveSyntheticDirectorCameraOptions` は `../engine/director-camera` へ切り替える（`mvpMatrix` フィールド・引数を削除）。
     - `matchSlidePlayers` が外部エクスポートとして必要な場合は `engine/` 側の純粋関数またはローカル純粋関数として提供し、`unified-interpolation` に依存しない。
  2. `auto-benchmark-engine.ts`: `calculateUnifiedTotalDuration` のインポート元を `../engine/director-camera` へ変更する。
- **Concrete Test Cases**:
  - Phase 4 で `applySlideTimelineOverrides` / `calculateUnifiedTotalDuration` / `exportMultiSlideVideo` の全テストを検証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/export/auto-benchmark-engine.ts`

---

### Phase 3: `video-export-engine.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/video-export-engine.test.ts` (838 lines)
- **Contract**:
  - `renderTacticalFrameToCanvas` テスト・スパイ・インポートを撤去し、`renderTacticalPhaseFrameToCanvas`（`normalizePhases` 経由）で 16:9 / 9:16 レンダリング、Worker フォールバック、直接 Mediabunny パイプライン、キャンセル処理、ポーズ中エフェクト描画テストを検証する（旧 `tactical-frame-renderer.test.ts` のうち Mediabunny ポーズフレーム最適化検証ケースもここへ集約する）。
- **Concrete Test Cases**:
  - `renderTacticalPhaseFrameToCanvas` の 16:9 / 9:16 描画・クロップ・ポーズ時エフェクト有り無しでの描画スキップ判定（`exportVideoWithMediabunny`）を通過させる。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/video-export-engine.test.ts`

---

### Phase 4: `tactical-video-exporter.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/tactical-video-exporter.test.ts` (631 lines)
- **Contract**:
  - `calculateUnifiedTotalDuration`・`applySlideTimelineOverrides`・`exportMultiSlideVideo`（MP4 / WebM / ImageBitmap close 検証）が `unified-interpolation` / `mvpMatrix` 非依存の単一パイプライン上で動作することを検証する。
- **Concrete Test Cases**:
  - 既存の `describe("tactical-video-exporter")` 全ケースを新パイプライン契約で維持・検証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/tactical-video-exporter.test.ts`

---

### Phase 5: `video-export.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/video-export.test.ts` (702 lines)
- **Contract**:
  - `buildExportMVPMatrix` と `tactical-frame-renderer` へのスパイ・アサーションを撤去し、`renderTacticalPhaseFrameToCanvas`（`tactical-phase-frame-renderer.ts`）と `ExportPreviewPlayer` / `useExportPreviewAnimation` / `exportVideoWithMediabunny` の単一パイプライン動作（`pitchTransform`, `directorCamera`, `boundaryBox`, ポーズ時アローエフェクト再描画、ImageBitmap ライフサイクル）を検証する。
- **Concrete Test Cases**:
  - `renderTacticalFrameToCanvas` ではなく `renderTacticalPhaseFrameToCanvas` が正しいパラメータで呼ばれ、`hasActiveFrameEffects` と ImageBitmap 破棄契約が保たれることをアサートする。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/video-export.test.ts`
