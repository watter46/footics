# TASK-200c: Preview・Split Preview・Share・Slide PNG・カメラパネルの単一パイプライン統合

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-panels,hooks): unify preview, share export, slide PNG, and timeline helpers onto SceneGraph pipeline`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (`export-preview-constants` + `use-export-preview-animation` + `export-preview-player` + `tactical-split-preview-panel`), Phase 2 (`use-share-page-export` + `konva-slide-export` + `top-bar`), Phase 3 (`director-camera-timeline` + `camera-control-panel` + `tactical-timeline` + `tactical-playback-controls`)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/,src/features/tactical-unified/panels/split-preview/,src/features/tactical-unified/panels/toolbar/top-bar.tsx,src/features/tactical-unified/panels/timeline/,src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx,src/features/tactical-unified/components/use-share-page-export.ts,src/features/tactical-unified/hooks/konva-slide-export.ts,src/features/tactical-unified/hooks/tactical-timeline.ts,src/features/tactical-unified/hooks/tactical-playback-controls.ts): \brenderTacticalFrameToCanvas\b|\bbuildExportMVPMatrix\b|\bgetInterpolatedUnifiedSlideFrame\b|unified-interpolation`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `ExportPreviewPlayer`・`useExportPreviewAnimation`・`TacticalSplitPreviewPanel`・`useSharePageExport`・`konva-slide-export`・`TopBar` はすべて `renderTacticalPhaseFrameToCanvas`（または `exportMultiSlideMp4Video`）を単一経路として使用し、`buildExportMVPMatrix` や `renderTacticalFrameToCanvas` を呼ばない。
  2. `DirectorCameraTimeline`・`CameraControlPanel`・`tactical-timeline.ts`・`tactical-playback-controls.ts` は `@/lib/tactical/unified-interpolation` ではなく `@/lib/tactical/engine/director-camera`（および `timeline-evaluator.ts`）のみを参照する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `export-preview-constants.ts` から `buildExportMVPMatrix` と `resolveExportPreviewMVPMatrix` を削除し、プレビュー側の停止中・再生中カメラ解決は `renderTacticalPhaseFrameToCanvas` の `pitchTransform` / `pitchTransformOverride` / `directorCamera` 引数へ渡すだけにする。
  2. `use-export-preview-animation.ts` の内部で参照していた fallback store（または未プロバイダ時動作）を維持しつつ、`renderTacticalFrameToCanvas` を `renderTacticalPhaseFrameToCanvas` へ完全置換する（単一スライド・停止時は `pitchTransformOverride` で即時反映、複数スライド再生時は時間に応じた補間）。
- **Consumers (同期更新対象)**:
  - `panels/export/*`, `panels/split-preview/tactical-split-preview-panel.tsx`, `components/use-share-page-export.ts`
  - `hooks/konva-slide-export.ts`, `hooks/tactical-timeline.ts`, `hooks/tactical-playback-controls.ts`
  - `panels/toolbar/top-bar.tsx`, `panels/timeline/director-camera-timeline.tsx`, `panels/right-panel/camera-control-panel.tsx`

---

## 2. Implementation Phases

### Phase 1: `panels/export/*` と `TacticalSplitPreviewPanel` の単一パイプライン統合

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-constants.ts` (128 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (298 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-player.tsx` (218 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (277 lines)
- **Contract**:
  1. `export-preview-constants.ts`: `buildExportMVPMatrix` と `resolveExportPreviewMVPMatrix` を削除し、`ResolveSyntheticDirectorCameraOptions` / `hasActiveDirectorCameraTrack` のインポート元を `@/lib/tactical/engine/director-camera` へ変更する。
  2. `use-export-preview-animation.ts`: `renderTacticalFrameToCanvas` と `resolvePlaybackDurationMs`（`unified-interpolation`）を削除し、`renderTacticalPhaseFrameToCanvas` と `resolvePlaybackDurationMs`（`@/lib/tactical/engine/director-camera`）を使ってフレームを描画する（停止中は `pitchTransformOverride` に有効カメラを渡す）。
  3. `export-preview-player.tsx`・`tactical-split-preview-panel.tsx`: `unified-interpolation` インポートを `@/lib/tactical/engine/director-camera` へ切り替え、Props/HUD 連携を維持する。
- **Concrete Test Cases**:
  - `TASK-200d` の `use-export-preview-animation.test.ts`・`export-preview-player.test.tsx`・`tactical-split-preview-panel.test.tsx` で全インタラクション・カメラ操作・クロップ表示を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/export-preview-constants.ts src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`

---

### Phase 2: `use-share-page-export`・`konva-slide-export`・`top-bar` の `renderTacticalPhaseFrameToCanvas` 統合

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/components/use-share-page-export.ts` (225 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/konva-slide-export.ts` (183 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (223 lines)
- **Contract**:
  1. `use-share-page-export.ts`: `buildExportMVPMatrix` のインポート・呼び出しおよび `mvpMatrix` オプション渡しを削除し、`exportMultiSlideMp4Video` へ `pitchTransform`・`directorCamera` 等のみを渡す。
  2. `konva-slide-export.ts`: `renderTacticalFrameToCanvas` を撤去し、`normalizePhases` + `renderTacticalPhaseFrameToCanvas` で `boundaryBox` / `aspectRatio` / `baseWidth` / `baseHeight` を渡して PNG/ZIP 生成を行う。
  3. `top-bar.tsx`: `renderTacticalFrameToCanvas` を撤去し、ドキュメント内のアクティブ Phase（または `selectDomainRenderSnapshot` から構築した `DomainTacticalPhase`）を用いて `renderTacticalPhaseFrameToCanvas` で画像エクスポート・クリップボードコピーを行う。
- **Concrete Test Cases**:
  - `TASK-200d` の `konva-export-helpers.test.ts` 等で `renderSlideToPngBlob` / `exportSingleSlidePng` / `exportAllSlidesZip` を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/hooks/konva-slide-export.ts src/features/tactical-unified/panels/toolbar/top-bar.tsx`

---

### Phase 3: カメラパネル・タイムライン・再生ヘルパーの `engine/director-camera` 移行

- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (135 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (298 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/tactical-timeline.ts` (123 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (264 lines)
- **Contract**:
  1. `director-camera-timeline.tsx`・`camera-control-panel.tsx`・`tactical-timeline.ts`: `@/lib/tactical/unified-interpolation` からのインポートを `@/lib/tactical/engine/director-camera` へ置換する。
  2. `tactical-playback-controls.ts`: `resolveEffectiveSlideSegments` と `SlideTimingLike` は `@/lib/tactical/engine/director-camera` からインポートし、旧 `getInterpolatedUnifiedSlideFrame` への不要参照を完全に除去する（`applyFrameToCanvas(snapTime, ...)` で十分なため不要呼び出しを持たない）。
- **Concrete Test Cases**:
  - `TASK-200d` の `tactical-animation-canvas.test.ts` でタイムライン生成・再生制御ヘルパー（`getSlideSnapTime`, `stopPlayback`, `pausePlayback`, `seekPlayback`）を検証する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts`
