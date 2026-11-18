# TASK-210: エクスポート・共有画面プレビュー再生のカメラワーク同期修正

- **Status**: `DONE`
- **Commit**: `fix(tactical): apply directorCamera in export and share previews matching layout playback`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/export/export-modal-body.tsx): pitchTransform=\{activeSlide\?\.pitchTransform\}`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. タイムラインカメラワーク（`hasActiveDirectorCameraTrack(directorCamera) === true`）が設定されている場合、エクスポート画面のプレビュー・共有画面のプレビュー・動画エクスポートのいずれでもカメラワークの連続アニメーションが優先適用され、レイアウト画面の再生結果と一致すること。
  2. カメラワークが未設定（無効）の場合、従来通りスライド単体の `pitchTransform`（または静止視点）が適用されること。
  3. レイアウト画面（`TacticalSplitPreviewPanel`）の静止時ドラッグ／ホイールカメラ編集は維持されること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ExportModalBody`（`export-modal-body.tsx`）および `SharePageClientView`（`share-page-client-view.tsx`）では、`hasActiveDirectorCameraTrack(directorCamera)` が `true` のとき `ExportPreviewPlayer` へ `pitchTransform={null}` を渡し（`activeSlide?.pitchTransform` による上書きを廃止）、`directorCamera` が `renderTacticalPhaseFrameToCanvas` 内で優先評価されるようにする。
  2. `useSharePageExport`（`use-share-page-export.ts`）の動画書き出し時も、`hasActiveDirectorCameraTrack(shareData?.directorCamera)` が `true` なら `pitchTransform: null` を渡す。
  3. `useExportPreviewAnimation`（`use-export-preview-animation.ts`）で再生中（`effectiveIsPlaying === true`）かつ `hasActiveDirectorCameraTrack(directorCamera)` が `true` の場合は、万一外部から `pitchTransform` が渡されても `renderTacticalPhaseFrameToCanvas` の `directorPitchTransform` を上書きしないよう `pitchTransform: isDirectorActive ? null : pitchTransform` とし、プレビューと動画出力（`exportTacticalVideo`）のカメラ解決を単一ルールへ統一する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/components/share-page-client-view.tsx`
  - `src/features/tactical-unified/components/use-share-page-export.ts`

## 2. Implementation Phases

### Phase 1: エクスポートモーダル & 共有画面の `pitchTransform` 上書き解除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/export-modal-body.tsx` (L264-L281)
  - `[MODIFY]` `src/features/tactical-unified/components/share-page-client-view.tsx` (L95-L115)
  - `[MODIFY]` `src/features/tactical-unified/components/use-share-page-export.ts` (L108-L132)
  - `[ADD]` `src/features/tactical-unified/panels/export/__tests__/export-preview-camera-sync.test.tsx` (~130 lines)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `export-modal-body.tsx`: `hasActiveDirectorCameraTrack(activePhase?.directorCamera)` が `true` の場合は `ExportPreviewPlayer` の `pitchTransform` に `null` を渡し、`false` の場合のみ `activeSlide?.pitchTransform` を渡す。
    2. `share-page-client-view.tsx`: `hasActiveDirectorCameraTrack(shareData.directorCamera)` が `true` の場合は `ExportPreviewPlayer` の `pitchTransform` に `null` を渡す。
    3. `use-share-page-export.ts`: `hasActiveDirectorCameraTrack(shareData?.directorCamera)` が `true` の場合は `effectivePitchTransform` を `null` とし、`exportMultiSlideMp4Video` へ `directorCamera` を優先適用させる。
- **Concrete Test Cases**:
  - `export-preview-camera-sync.test.tsx`（実 `TacticalStoreProvider` 接続・内部モック禁止）:
    - `case 1`: `directorCamera` に `globalKeyframes`（`t=0ms: tilt=0` ➔ `t=1000ms: tilt=35`）を設定した状態で `ExportModalBody` から `ExportPreviewPlayer` 内のキャンバスを描画させたとき、`pitchTransform` 上書きなしで `directorCamera` が評価されること（`ExportPreviewPlayer` の再生シーク時刻で異なるカメラ変換が適用されること）。
    - `case 2`: `directorCamera` が空のときは従来通り `activeSlide.pitchTransform` が引き継がれること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/components/share-page-client-view.tsx src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/panels/export/__tests__/export-preview-camera-sync.test.tsx`

### Phase 2: `useExportPreviewAnimation` のカメラ解決統一 & レイアウト再生一致テスト
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (L128-L165)
  - `[ADD]` `src/features/tactical-unified/panels/export/__tests__/preview-layout-parity.test.ts` (~120 lines)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useExportPreviewAnimation` の `drawFrame` において、`hasActiveDirectorCameraTrack(directorCamera)` が `true` かつ `effectiveIsPlaying === true`（または `pitchTransform` が未指定）の場合は `renderTacticalPhaseFrameToCanvas` に `pitchTransform: undefined` を渡し、`directorPitchTransform` が確実に解決されるようにする。
    2. 停止時で `pitchTransform` が明示渡しされた場合（例：`TacticalSplitPreviewPanel` の `dragPitchTransform`）のみ `pitchTransformOverride: pitchTransform` を効かせる。
- **Concrete Test Cases**:
  - `preview-layout-parity.test.ts`:
    - `case 1`: `directorCamera` の `globalKeyframes` と `actionCues`（ズーム/パン）を設定したフェーズについて、`TacticalSplitPreviewPanel` 相当（`pitchTransform: null`）と修正後のエクスポートプレビュー設定で `renderTacticalPhaseFrameToCanvas` へ渡される実効カメラパラメータおよび描画フレーム結果が任意の時刻 `t` で完全一致すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/__tests__/preview-layout-parity.test.ts`
