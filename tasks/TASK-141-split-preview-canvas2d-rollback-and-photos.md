# TASK-141: スプリットプレビューの Canvas2D 描画復元と選手写真統合（高解像度・文字描画修正）

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-02
- **Depends On**: TASK-137, TASK-139（すべて `DONE`）
- **Goal**: コミット `adfd9c2`（TASK-140）で行われたスプリットプレビュー（`TacticalSplitPreviewPanel`）の Konva 化による変更を取り消し、高解像度・高精細な Canvas2D 映像レンダラー（`useExportPreviewAnimation` / `tactical-frame-renderer.ts`）に復元する。`core/` に追加された不要なカメラ投影コードを削除してアーキテクチャの責務を正常化し、`TASK-137` / `TASK-139` の成果（`usePlayerPhotoRegistry` / `preloadSlidePlayerPhotos`）を正しく繋ぎ込んで「高解像度（Retina対応）」「文字の太線アウトラインと正確な位置」「滑らかな3Dカメラ透視」「選手写真の完全表示」を両立させる。
- **Target Files**:
  - `src/features/tactical-unified/core/components/pitch-3d-background.tsx` (DELETE)
  - `src/features/tactical-unified/core/utils/preview-scene-projector.ts` (DELETE)
  - `src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts` (DELETE)
  - `src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts` (DELETE)
  - `src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts` (DELETE)
  - `src/features/tactical-unified/panels/split-preview/use-split-preview-playback.ts` (DELETE)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)

---

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. **高精細 Canvas2D レンダラーへの完全復元**:
  - `TacticalSplitPreviewPanel` が Full HD 解像度（1080x1350 for 4:5, 1920x1080 for 16:9）の `<canvas>` 描画（`useExportPreviewAnimation` / `renderTacticalFrameToCanvas`）に戻り、Retina / 高DPI ディスプレイでもガビガビにならず極めて鮮明に描画されること。
  - テキストが太線ダークアウトライン付きで正確なフォントスケール・位置に描画され、文字ズレが発生しないこと。
- [ ] 2. **選手写真の確実な解決・表示**:
  - `TacticalSplitPreviewPanel` において、`slides` の全選手に対して `usePlayerPhotoRegistry` または `preloadSlidePlayerPhotos` を介して選手写真が解決され、スプリットプレビュー内の選手マーカー（`insideContent === 'photo'`）で顔写真が確実に表示されること（背番号フォールバックに陥らないこと）。
- [ ] 3. **3D カメラ操作 UI & アニメーション補間再生の維持**:
  - `SplitPreviewCameraBar` の 6 プリセット選択、リセットボタン、ビューポート上の左ドラッグ（Tilt `0〜70`、Yaw `0〜360`）、Shift+ドラッグ（Pan）、ホイールズーム（`0.5〜2.5`）が正常に機能すること。
  - タイムライン再生時（`isPlaying === true`）に各スライドのアニメーション補間が 60fps で滑らかに再生されること。
- [ ] 4. **`core/` および `adapters/` の責務正常化（ロールバック）**:
  - `core/` から 3D カメラ投影関数（`preview-scene-projector.ts`）、`Pitch3DBackground`、`cameraTransform` 拡張が完全に削除され、純粋な Level 2 編集基盤（`CanvasStageContainer` / `CanvasDisplayStage`）としてクリーンに保たれること。
  - 一時的なプレビュー専用アダプター（`preview-canvas-store-adapter.ts`）および再生フック（`use-split-preview-playback.ts`）が削除されること。
- [ ] 5. **品質ゲートとテストの完全通過**:
  - `bun run ai:check src/features/tactical-unified/core/ src/features/tactical-unified/panels/split-preview/` が exit code 0 で全テスト PASS すること。

---

## 3. Context Snippets & Technical Details

### 3.1. なぜ Konva プレビューで劣化（ガビガビ・文字ズレ）が生じたか
- **解像度（DPI）の違い**:
  - 旧実装（Canvas2D）: 内部解像度 1080x1350 / 1920x1080 の高精細バッファに描画し、CSS で縮小表示。どのディスプレイでもピクセル密度が高くクッキリ表示。
  - Konva 実装: コンテナの CSS ピクセルサイズ（例: 400x300）の Stage 上で直接描画されたため、Retina ディスプレイで 2x〜3x に引き伸ばされ「ガビガビ」が発生。
- **テキスト描画・3D 幾何計算の差異**:
  - 旧実装: `text-renderer.ts` で `fontSize = Math.max(12, Math.round((t.fontSize || 16) * (w / 800)))` により基準幅に対するスケール計算を行い、太線アウトライン（`strokeText`）を施して描画。
  - Konva 実装: `<Text fontSize={text.fontSize}>` は固定ピクセルサイズ。コンテナが小さくなると文字が巨大化し、さらに透視変換後の座標と Konva テキスト配置アンカーの不一致により文字位置がズレた。

### 3.2. 写真解決の結合ポイント
- `useExportPreviewAnimation` は既に `playerPhotos?: Record<string, CanvasImageSource | null | undefined>` を受け取るインターフェースを備えている。
- `TacticalSplitPreviewPanel` 内で `allPhasePlayers = slides.flatMap(s => s.players ?? [])` を集約し、`playerPhotos = usePlayerPhotoRegistry(allPhasePlayers)` を呼び出して `useExportPreviewAnimation({ ..., playerPhotos })` へ渡すだけで、旧実装の最高画質を保ったまま写真表示が100%実現する。

---

## 4. Implementation Phases

### Phase 1: `core/` および `adapters/` のクリーンアップ（ロールバック）
- **Goal**: TASK-140 で追加された不要なコードを削除し、`core/` を元の健全な設計に戻す。
- **Files**:
  - `src/features/tactical-unified/core/components/pitch-3d-background.tsx` (DELETE)
  - `src/features/tactical-unified/core/utils/preview-scene-projector.ts` (DELETE)
  - `src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts` (DELETE)
  - `src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts` (DELETE)
  - `src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts` (DELETE)
  - `src/features/tactical-unified/panels/split-preview/use-split-preview-playback.ts` (DELETE)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
- **Testing Strategy**:
  - `bun run ai:check src/features/tactical-unified/core/` で Lint/型チェック/Vitest が PASS すること。
- **Tasks**:
  - [x] 1. 不要ファイル 6 件を物理削除。
  - [x] 2. `core/types.ts` から `cameraTransform` を削除。
  - [x] 3. `BackgroundImageLayer.tsx`, `canvas-display-stage.tsx`, `PlayerMarkerItem.tsx`, `core/index.ts` を `adfd9c2^` の状態に復元。
  - [x] 4. `bun run ai:check src/features/tactical-unified/core/` PASS。
- **Worker Handoff Log**:
  - Exports: `adfd9c2^` の core export に復元完了
  - Gotchas: N/A

---

### Phase 2: `TacticalSplitPreviewPanel` の Canvas2D 復元と写真統合
- **Goal**: スプリットプレビューを Canvas2D エンジンに戻し、`usePlayerPhotoRegistry` から写真リソースを注入する。
- **Files**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx`:
    1. Full HD 解像度（1080x1350 for 4:5, 1920x1080 for 16:9）の `<canvas>` 描画テスト
    2. カメラ操作（プリセット、左ドラッグのオービット、Shift+ドラッグのパン、ホイールズーム）
    3. `usePlayerPhotoRegistry` から取得した `playerPhotos` が `useExportPreviewAnimation` / `renderTacticalFrameToCanvas` に渡っていることの検証
  - `bun run ai:check src/features/tactical-unified/panels/split-preview/` で全 11+ 件のテストが PASS すること。
- **Tasks**:
  - [x] 1. `tactical-split-preview-panel.tsx` を Canvas2D 版に復元し、`usePlayerPhotoRegistry` を結合。
  - [x] 2. `tactical-split-preview-panel.test.tsx` を Canvas2D 版に復元し、写真連携テストを追加。
  - [x] 3. `bun run ai:check src/features/tactical-unified/panels/split-preview/` PASS。
  - [x] 4. `bun run ai:commit -m "fix(tactical): restore crisp canvas2d split preview with unified player photos"` で一括コミット。
- **Worker Handoff Log**:
  - Exports: `TacticalSplitPreviewPanel`
  - Gotchas: `usePlayerPhotoRegistry` の返り値 `PlayerPhotoMap` (ReadonlyMap) は `useExportPreviewAnimation` が要求する `Record<string, CanvasImageSource>` 形式に変換し `id` / `playerId` 両方で引けるよう対応 

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: 
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:

---

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
