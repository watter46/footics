# TASK-200d: Preview・Split Preview・Konva Slide Export テスト群の単一パイプライン移行

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `test(tactical-export): migrate preview, split-preview, tilt, and konva slide export tests to single pipeline`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`use-export-preview-animation.test.ts` 1+1), Phase 2 (`export-preview-player.test.tsx` + `pitch-tilt-export.test.ts`), Phase 3 (`tactical-split-preview-panel.test.tsx` 1+1), Phase 4 (`konva-export-helpers.test.ts` 1+1), Phase 5 (`tactical-animation-canvas.test.ts` 1+1)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/__tests__/,src/features/tactical-unified/panels/split-preview/__tests__/,src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts,src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts): \brenderTacticalFrameToCanvas\b|\bmvpMatrix\b|tactical-frame-renderer|unified-interpolation`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. テストはすべて新パイプライン（`renderTacticalPhaseFrameToCanvas`・`@/lib/tactical/engine/projection-3d`・`@/lib/tactical/engine/director-camera`）に対する振る舞い検証へ統一し、旧 `tactical-frame-renderer`・`buildExportMVPMatrix`・`mvpMatrix` 前提のモック/スパイを撤去する。
  2. >300行のテストファイルは `1+1` ルールを厳守し、各 Phase で対象テストを独立して完了させる。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `use-export-preview-animation.test.ts` / `export-preview-player.test.tsx` / `tactical-split-preview-panel.test.tsx` / `konva-export-helpers.test.ts` のスパイ対象を `renderTacticalPhaseFrameToCanvas`（`@/lib/tactical/export/tactical-phase-frame-renderer`）へ統一し、`pitchTransform` / `pitchTransformOverride` / `directorCamera` / `boundaryBox` / `screenBackground` / `playerPhotos` 伝播をアサートする。
  2. `pitch-tilt-export.test.ts` の `buildExportMVPMatrix`・`REFERENCE_STAGE_HEIGHT` インポート元を `@/lib/tactical/engine/projection-3d` へ移行する。
- **Consumers (同期更新対象)**:
  - `panels/export/__tests__/*`, `panels/split-preview/__tests__/*`, `hooks/__tests__/konva-export-helpers.test.ts`, `hooks/__tests__/tactical-animation-canvas.test.ts`, `__tests__/pitch-tilt-export.test.ts`

---

## 2. Implementation Phases

### Phase 1: `use-export-preview-animation.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (519 lines)
- **Contract & Concrete Test Cases**:
  - `tactical-frame-renderer` スパイを `@/lib/tactical/export/tactical-phase-frame-renderer`（`renderTacticalPhaseFrameToCanvas`）へ変更する。
  - `mvpMatrix` 期待値を廃し、停止時/複数スライド時の `pitchTransformOverride`・`pitchTransform` 渡し、変更時再描画、`boundaryBox` クロップ・シネマティックマスク制御、`baseWidth`/`baseHeight`、ディレクターカメラ、`applyEffects` 時の RAF ループ・アンマウント解除・`phase` 伝播を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

---

### Phase 2: `export-preview-player.test.tsx` と `pitch-tilt-export.test.ts` の移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx` (225 lines)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts` (253 lines)
- **Contract & Concrete Test Cases**:
  1. `export-preview-player.test.tsx`: `renderTacticalPhaseFrameToCanvas` スパイへ変更し、キーボードショートカット（Space トグル・input 中無視・アンマウント解除）、ビューポートアスペクト比・クロップレイアウト、`screenBackground` 伝播を検証する。
  2. `pitch-tilt-export.test.ts`: `buildExportMVPMatrix`・`REFERENCE_STAGE_HEIGHT` のインポート元を `@/lib/tactical/engine/projection-3d` へ切り替え、解像度非依存パンスケーリング（`360` 基準）や既存変換テストを維持する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx src/features/tactical-unified/__tests__/pitch-tilt-export.test.ts`

---

### Phase 3: `tactical-split-preview-panel.test.tsx` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (675 lines)
- **Contract & Concrete Test Cases**:
  - `renderTacticalFrameToCanvas` スパイを `renderTacticalPhaseFrameToCanvas` へ置換し、`mvpMatrix` 関連アサーションを `pitchTransform` / `pitchTransformOverride` 基準へ更新する（正面カメラ時はオフセット/チルト/ヨーが初期値、ドラッグ/Shiftパン/ホイールズーム/4辺ドラッグ/ディレクターカメラトラック操作を実 `TacticalStoreProvider` で検証）。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`

---

### Phase 4: `konva-export-helpers.test.ts` の 1+1 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` (420 lines)
- **Contract & Concrete Test Cases**:
  - `frameRenderer`（`tactical-frame-renderer`）スパイを `@/lib/tactical/export/tactical-phase-frame-renderer`（`renderTacticalPhaseFrameToCanvas`）へ変更し、`renderSlideToPngBlob`（`calculateBoundaryCrop` + 4:5 既定寸法）・`exportSingleSlidePng`・`exportAllSlidesZip`・`stageToBlob`・`exportZipSlides` の全ケースを通過させる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`

---

### Phase 5: `tactical-animation-canvas.test.ts` の 1+1 確認・更新

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (307 lines)
- **Contract & Concrete Test Cases**:
  - `tactical-timeline.ts` / `tactical-playback-controls.ts` が `@/lib/tactical/engine/director-camera` へ切り替わった状態で、`calculatePitchDimensions`・`createTacticalTimeline`・`pausePlayback`・`stopPlayback`・`seekPlayback`・モジュール境界チェック（`'use client'`・循環回避）の全ケースが通過することを確認・必要に応じ調整する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
