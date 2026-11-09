# TASK-170: 戦術ボード〜レイアウト〜エクスポート〜iOS出力のデータ一元化・境界線仕様修正・不要ファイル一掃

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-09
- **Target Files**:
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts` (MODIFY)
  - `src/lib/tactical/export/video-crop-calc.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/export/video-media-recorder-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-image-tab.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-tab.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-json-tab.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-modal-footer.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-morphing-section.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/use-video-morphing-config.ts` (DELETE)
  - `src/features/tactical-unified/panels/export/export-target-builder.ts` (DELETE)
  - `src/features/tactical-unified/panels/export/use-export-event-listener.ts` (DELETE)
  - `src/features/tactical-unified/core/components/BoundaryBoxOverlay.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/BoundaryBoxTiltControls.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/ViewportCropOverlay.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/toolbar/ToolbarBoundaryBoxToggle.tsx` (DELETE)
  - `src/features/tactical-unified/core/hooks/use-boundary-box-drag.ts` (DELETE)
  - `src/features/tactical-unified/core/components/CanvasOverlays.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/index.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **単一データ取得契約（`selectTacticalRenderSnapshot` / `selectActiveBoundaryBox`）**: レイアウト画面、PCエクスポート画面、PNG/ZIP出力、トップバーCopy、iOS共有データ作成のすべてで、境界線が常に `activeSlide?.boundaryBox ?? activePhase?.boundaryBox ?? project.boundaryBox ?? DEFAULT_BOUNDARY_BOX_16_9` の優先順で解決され、`pitchTransform`・`directorCamera`・`pitchAppearance`・`screenBackground`・`teamVisibility` が漏れなく一貫して渡されること。
- [x] 2. **境界線（BoundaryBox）の内部保持・常時適用と表示スイッチ（`visible`）の分離**:
  - 右パネル（`screen-boundary-section.tsx`）のON/OFFスイッチは `visible`（停止中の編集画面での枠・マスク表示フラグ）のみを切り替え、`enabled` は常に `true` かつ座標（`x, y, width, height`）を維持すること。
  - クロップ有効判定 `isBoundaryCropActive(box)` は `enabled` や `visible` に依存せず、座標値 `box != null && box.width > 0 && box.height > 0 && (box.width < 100 || box.height < 100 || box.x > 0 || box.y > 0)` のみで判定すること。
  - レイアウト画面（停止中）では `Boolean(boundaryBox?.visible) && !isPlaying` のときのみ `PreviewBoundaryOverlay` を表示し、枠線色を水色（`#00A8FF` / `sky-600`）から**薄いグレー（`border-neutral-300/80` / `border-neutral-400`）**に変更すること。
- [x] 3. **1080p単一基準解像度（`1920×1080`, `scale: 1`）とキャンバス全体基準クロップの統一**: プレビュー・動画出力（Mediabunny / MediaRecorder / iOS出力）・画像出力（PNG / ZIP / Copy）のすべてで基準サイズを `1920×1080`（`scale: 1`、キャンバス全体 `{ x: 0, y: 0, width: 1920, height: 1080 }` 基準）に統一し、`pitchRect` 基準の分岐や `scale: 2` 倍化によるズレを廃止すること。
- [x] 4. **iOSプレビュー画面の高さ0px崩壊修正**: `share-page-client-view.tsx` のプレビューラッパーを `flex-col` に修正し、`ExportPreviewPlayer` のルート要素に `h-full` を付与することで、内部の `containerType: 'size'` コンテナが高さ `0px` に潰れず映像が表示されること。
- [x] 5. **不要ファイル15件の完全削除とボード画面の2D専念化**: エクスポート周辺の未使用死にファイル9件およびボード画面の境界線・3D操作UIファイル6件を物理削除し、呼び出し元・バレルファイル（`index.ts`）・テストからの参照を完全除去して全テスト・型チェック・LintがPASSすること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一データ取得契約（Single Scene Snapshot Selector）**:
     - レイアウト画面、エクスポート画面、PNG/ZIP出力、トップバーCopy、iOS共有データ作成において、ストアから個別に `boundaryBox` 等を拾い集めることを禁止し、`selectTacticalRenderSnapshot(state)` または `selectActiveBoundaryBox(state)` を通じて取得する。
     - *Why*: 画面ごとに `activeSlide.boundaryBox` と `activePhase.boundaryBox` の優先順位が逆転したり、`teamVisibility`・`screenBackground`・`directorCamera` を渡し忘れるデグレを根絶するため。
  2. **境界線（BoundaryBox）の「内部保持・常時適用」と「表示スイッチ（`visible`）」の分離**:
     - ON/OFFスイッチは「停止中のレイアウト画面に境界線枠とマスクを表示するか（`visible`）」のスイッチであり、OFFにしても座標をリセットせず内部保持し、再生時・エクスポート画面・iOS出力では常に `isBoundaryCropActive(box)` により適用する。
     - *Why*: 編集時に枠線を消して画面全体を確認しつつ、設定した切り抜き範囲を再生・出力で維持するドメイン仕様を守るため。
  3. **1080p単一基準解像度（`1920×1080`, `scale: 1`）とキャンバス全体基準クロップ**:
     - すべてのオフスクリーン描画・クロップ計算は `baseWidth = 1920, baseHeight = 1080, scale = 1`、クロップ基準矩形 `{ x: 0, y: 0, width: 1920, height: 1080 }` に統一する。
     - *Why*: プレビュー（`useExportPreviewAnimation`）で見えている1080pフレームと、PC/iOSで書き出される画像・MP4動画の画角・3Dカメラ投影・切り抜き範囲を1ピクセルの狂いもなく完全一致させるため。
  4. **キャンバスの箱（コンポーネント構造）の保護とホスト境界の厳守**:
     - 各画面のキャンバスコンテナ構造自体は壊さず、Level 2 / Level 3 の境界（`chrome.*` 非依存、Store Provider / Props 優先）を厳守する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` — レイアウト画面プレビュー＆境界線オーバーレイ表示条件
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` & `export-modal-body.tsx` — PCエクスポートモーダル状態＆PNG/ZIP出力呼び出し
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` — PNG/ZIPオフスクリーン描画
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` — クリップボード画像コピー
  - `src/features/tactical-unified/panels/export/use-export-share.ts` — iOS共有ペイロード生成
  - `src/features/tactical-unified/components/share-page-client-view.tsx` & `use-share-page-export.ts` — iOS共有プレビュー＆MP4動画出力
  - `src/lib/tactical/export/tactical-video-exporter.ts`, `video-mediabunny-export.ts`, `video-media-recorder-export.ts` — MP4/WebM動画エンコーダ
  - `src/features/tactical-unified/core/components/CanvasOverlays.tsx`, `HtmlHudOverlay.tsx`, `CoreDrawingToolbar.tsx`, `canvas-stage.tsx`, `core/index.ts`, `tactical-unified/index.ts` — 削除された境界線・3D UIの参照除去

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/features/tactical-unified/stores/tactical-unified-selectors.ts
import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_16_9,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
  type SelectedObject,
  type Slide,
  type TacticalPhase,
  type TacticalProject,
} from '@/lib/types/tactical-unified';

// src/lib/tactical/export/video-crop-calc.ts
import type { BoundaryBox } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/stores/tactical-unified-selectors.ts
export interface TacticalRenderSnapshot {
  slides: Slide[];
  activeSlide: Slide | undefined;
  aspectRatio: AspectRatio;
  boundaryBox: BoundaryBox;
  pitchTransform: PitchTransform | null;
  directorCamera: DirectorCameraTrack | null;
  pitchAppearance: PitchAppearanceConfig | undefined;
  screenBackground: ScreenBackgroundConfig | undefined;
  teamVisibility: 'both' | 'home' | 'away';
}

export const selectActiveBoundaryBox = <
  T extends Pick<SelectorStateContext, 'project'> & {
    activePhaseId?: string;
    activeSlideId?: string;
  },
>(
  s: T,
): BoundaryBox => {
  const activePhase = selectActivePhase(s);
  const activeSlide =
    s.activeSlideId != null
      ? selectActiveSlide(s as SelectorStateContext)
      : activePhase?.slides?.[0];
  return (
    activeSlide?.boundaryBox ??
    activePhase?.boundaryBox ??
    s.project?.boundaryBox ??
    DEFAULT_BOUNDARY_BOX_16_9
  );
};

// src/lib/tactical/export/video-crop-calc.ts
export function isBoundaryCropActive(
  box: BoundaryBox | undefined | null,
): box is BoundaryBox {
  if (!box || box.width <= 0 || box.height <= 0) return false;
  return box.width < 100 || box.height < 100 || box.x > 0 || box.y > 0;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. selectActivePhaseBoundaryBox(s) も後方互換のため内部で selectActiveBoundaryBox(s) を呼ぶように統一する（activeSlideId が state に存在する場合は activeSlide?.boundaryBox を最優先）。
// 2. calculateBoundaryCrop(box, stageWidth = 1920, stageHeight = 1080, scale = 1, pitchRect?) では:
//    - `!box || !box.enabled` ではなく `!isBoundaryCropActive(box)` で非クロップ判定を行う。
//    - デフォルトの scale を 2 から 1 に変更する。
// 3. video-mediabunny-export.ts と video-media-recorder-export.ts では calculatePitchRect を calculateBoundaryCrop の第5引数に渡していた箇所を削除し、キャンバス全体（pitchRect 省略 = { x: 0, y: 0, width: stageWidth, height: stageHeight }）基準に統一する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 単一RenderSnapshotセレクタ ＆ 境界線1080pクロップ計算・ON/OFF表示仕様統一
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts` (MODIFY)
  - `src/lib/tactical/export/video-crop-calc.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/video-crop-calc.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/stores/tactical-unified-selectors.ts`:
     - `SelectorStateContext` に `teamVisibility?: 'both' | 'home' | 'away'`（オプショナル）を追加。
     - `selectActiveBoundaryBox` を新設・export し、`selectActivePhaseBoundaryBox` も同一ロジック（`activeSlide?.boundaryBox ?? activePhase?.boundaryBox ?? s.project?.boundaryBox ?? DEFAULT_BOUNDARY_BOX_16_9`）を返すよう統一。
     - `TacticalRenderSnapshot` 型と `selectTacticalRenderSnapshot(s)` を新設・export:
       ```ts
       export const selectTacticalRenderSnapshot = <
         T extends Pick<SelectorStateContext, 'project' | 'activeSlideId'> & {
           activePhaseId?: string;
           teamVisibility?: 'both' | 'home' | 'away';
         },
       >(
         s: T,
       ): TacticalRenderSnapshot => {
         const activePhase = selectActivePhase(s);
         const activeSlide = selectActiveSlide(s);
         return {
           slides: activePhase?.slides ?? [],
           activeSlide,
           aspectRatio: activePhase?.aspectRatio ?? s.project?.aspectRatio ?? '16:9',
           boundaryBox: selectActiveBoundaryBox(s),
           pitchTransform: activeSlide?.pitchTransform ?? null,
           directorCamera: activePhase?.directorCamera ?? null,
           pitchAppearance: s.project?.pitchAppearance,
           screenBackground: s.project?.screenBackground,
           teamVisibility: s.teamVisibility ?? 'both',
         };
       };
       ```
  2. `src/lib/tactical/export/video-crop-calc.ts`:
     - `isBoundaryCropActive(box: BoundaryBox | undefined | null): box is BoundaryBox` を実装・export:
       `Boolean(box && box.width > 0 && box.height > 0 && (box.width < 100 || box.height < 100 || box.x > 0 || box.y > 0))`
     - `calculateBoundaryCrop(box, stageWidth = 1920, stageHeight = 1080, scale = 1, pitchRect?)`:
       - デフォルト引数 `scale = 1` に変更。
       - 冒頭の判定を `if (!isBoundaryCropActive(box))` に変更（`enabled: false` や `visible: false` でも座標が 100×100 未満または x/y > 0 なら `isCropped: true` としてクロップ計算を実行）。
  3. `src/lib/tactical/export/tactical-frame-renderer.ts`:
     - `isBoundaryCropActive` を `./video-crop-calc` から import し、`const isBoundaryActive = isBoundaryCropActive(boundaryBox);` に統一。
  4. `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx`:
     - スイッチ表示判定を `const isBoundaryVisible = boundaryBox?.visible ?? false;` に変更。
     - `handleToggleBoundary`: 現在の `boundaryBox` の座標（`x: boundaryBox?.x ?? 0, y: boundaryBox?.y ?? 0, width: boundaryBox?.width ?? 100, height: boundaryBox?.height ?? 100`）を維持したまま、`enabled: true, visible: !isBoundaryVisible` で `commitBoundaryBox` を呼ぶ。
     - `handleSelectPreset(presetRatio)`: `presetRatio === '16:9'` の場合は `{ enabled: true, visible: true, x: 0, y: 0, width: 100, height: 100 }`、それ以外は `{ ...computeCenteredBoundaryBox(presetRatio), enabled: true, visible: true }` で `commitBoundaryBox` を呼ぶ。
     - `activePreset`: `isBoundaryEnabled` ガードを外し、`boundaryBox` の `width, height` から常時プリセット比率を判定する。
  5. `src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx`:
     - 188行目付近の `data-testid="boundary-box-frame"` の枠線色を水色（`border-[#00A8FF]`）から薄いグレー（ドラッグ中: `'border-neutral-200/90 shadow-[0_0_12px_rgba(255,255,255,0.2)]'`、通常時: `'border-neutral-300/80 hover:border-neutral-200/90'`）に変更。
     - 234行目付近の4隅リサイズハンドルの枠線色を `border-sky-600` から `border-neutral-400` に変更。
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/export/__tests__/video-crop-calc.test.ts`:
    - 入力: `box = { x: 28.9, y: 3, width: 42.2, height: 94, enabled: false, visible: false }`（9:16 保持・表示OFF）
      ➔ `isBoundaryCropActive(box) === true`
      ➔ `calculateBoundaryCrop(box, 1920, 1080)`（デフォルト `scale = 1`）が `isCropped: true, exportWidth: 1080, exportHeight: 1920` を返すこと。
    - 入力: `box = { x: 0, y: 0, width: 100, height: 100, enabled: true, visible: true }`（16:9 全画面）
      ➔ `isBoundaryCropActive(box) === false`
      ➔ `calculateBoundaryCrop(box, 1920, 1080)` が `isCropped: false, exportWidth: 1920, exportHeight: 1080` を返すこと。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/video-crop-calc.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/tactical-unified-selectors.ts src/lib/tactical/export/video-crop-calc.ts src/lib/tactical/export/tactical-frame-renderer.ts src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx src/features/tactical-unified/panels/split-preview/preview-boundary-overlay.tsx src/lib/tactical/export/__tests__/video-crop-calc.test.ts` PASS
- **Worker Handoff Log**:
  - `selectActiveBoundaryBox`, `selectTacticalRenderSnapshot`, `isBoundaryCropActive` を export 確定。`calculateBoundaryCrop` デフォルト `scale = 1` 統一。
  - 右パネルON/OFFは `visible` のみを切り替え座標保持、停止中の境界枠線色をグレー系（`border-neutral-300/80`）へ変更完了。

---

### Phase 2: レイアウト画面・PCエクスポート画面・PNG/ZIP出力・TopBar Copyの一元化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`:
     - `selectActiveBoundaryBox`（または `selectTacticalRenderSnapshot`）で `boundaryBox` を取得。
     - `isBoundaryCropActive` を `@/lib/tactical/export/video-crop-calc` から import し、再生時のクロップ有効判定を `const isBoundaryActive = isBoundaryCropActive(boundaryBox);` に統一（`visible: false` でも再生時はクロップ適用）。
     - 停止中の `PreviewBoundaryOverlay` 表示条件（357行目付近）を `{Boolean(boundaryBox?.visible) && !isPlaying && (<PreviewBoundaryOverlay ... />)}` に変更（`visible: false` のときは停止中に枠と暗転マスクを出さない）。
  2. `src/features/tactical-unified/panels/export/use-export-modal-state.ts` & `export-modal-body.tsx`:
     - `useExportModalState` および `ExportModalBody` で `selectActivePhaseBoundaryBox` の代わりに `selectActiveBoundaryBox`（または `selectTacticalRenderSnapshot`）を使用し、`activeSlide?.boundaryBox` が最優先で `ExportPreviewPlayer`・動画出力・PNG/ZIP出力に渡るようにする。
     - `export-modal-body.tsx` の `handleExportPng` / `handleExportZip` に `pitchTransform: activeSlide?.pitchTransform ?? null`, `directorCamera: activePhase?.directorCamera ?? null`, `pitchAppearance`, `screenBackground`, `teamVisibility` をすべて渡す。
  3. `src/features/tactical-unified/hooks/konva-slide-export.ts`:
     - `RenderSlideImageOptions` および `ExportSlidesArchiveOptions` に以下を追加:
       ```ts
       pitchTransform?: PitchTransform | null;
       directorCamera?: DirectorCameraTrack | null;
       pitchAppearance?: PitchAppearanceConfig;
       screenBackground?: ScreenBackgroundConfig;
       teamVisibility?: 'both' | 'home' | 'away';
       ```
     - `renderSlideToBlob` のデフォルトを `scale = 1, stageWidth = 1920, stageHeight = 1080` に変更し、`calculateBoundaryCrop(boundaryBox, stageWidth, stageHeight, scale)`（`pitchRect` を渡さずキャンバス全体基準）でクロップ計算を行う。
     - `renderTacticalFrameToCanvas` に `baseWidth: stageWidth, baseHeight: stageHeight, pitchTransform: options.pitchTransform ?? slide.pitchTransform ?? null, directorCamera: options.directorCamera ?? null, pitchAppearance: options.pitchAppearance, screenBackground: options.screenBackground, teamVisibility: options.teamVisibility` を渡す。
  4. `src/features/tactical-unified/panels/toolbar/top-bar.tsx`:
     - `handleCopySlideImage` 内で `selectActiveBoundaryBox(state)`（または `selectTacticalRenderSnapshot(state)`）を使用し、`baseW = 1920, baseH = 1080`、`calculateBoundaryCrop(boundaryBox, baseW, baseH, 1)`、`renderTacticalFrameToCanvas`（`baseWidth: 1920, baseHeight: 1080, directorCamera, pitchAppearance, screenBackground, teamVisibility` 付き）でクリップボード画像を生成する。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx`:
    - `PreviewBoundaryOverlay` の `data-testid="boundary-box-frame"` の `className` に `#00A8FF` が含まれず、`border-neutral-300/80` が含まれることを検証。
    - 4隅ハンドル `data-testid="boundary-handle-tl"` の `className` に `border-neutral-400` が含まれることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/export/use-export-modal-state.ts src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/hooks/konva-slide-export.ts src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/panels/split-preview/__tests__/preview-boundary-overlay.test.tsx` PASS
- **Worker Handoff Log**:
  - `selectActiveBoundaryBox` / `selectTacticalRenderSnapshot` で `activeSlide?.boundaryBox` を最優先解決し、プレビュー・エクスポート・Copy で 1080p キャンバス全体基準クロップ（`scale: 1`）を統一。
  - 停止中オーバーレイ表示条件を `Boolean(boundaryBox?.visible) && !isPlaying` に変更し、枠線色（`border-neutral-300/80`）およびハンドル（`border-neutral-400`）へ統一完了。

---

### Phase 3: iOS共有送信・iOSプレビュー表示（高さ0px崩壊修正）・1080p動画出力の完全一致化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/panels/export/use-export-share.ts`:
     - `selectTacticalRenderSnapshot(state)` を使用してスナップショットを取得し、ペイロードの `boundaryBox: snapshot.boundaryBox`（`activeSlide?.boundaryBox` 最優先）、`pitchTransform: snapshot.pitchTransform`、`directorCamera: snapshot.directorCamera`、`screenBackground: snapshot.screenBackground ?? null`、`pitchAppearance: snapshot.pitchAppearance`、`teamVisibility: snapshot.teamVisibility` を送信する。
  2. `src/features/tactical-unified/components/share-page-client-view.tsx`:
     - 96行目の `ExportPreviewPlayer` の親 `div` を `className="w-full h-[45vh] min-h-[300px] max-h-[520px] flex flex-col items-stretch justify-center"` に変更。
     - `ExportPreviewPlayer` に `teamVisibility={shareData.teamVisibility}` を追加で渡す。
  3. `src/features/tactical-unified/panels/export/export-preview-player.tsx`:
     - 162行目のルート `div` のクラスに `h-full` を追加（`relative flex flex-col w-full h-full flex-1 min-h-0 select-none overflow-hidden bg-[#0a0a0c]`）し、内部の `containerType: 'size'` コンテナの高さ `0px` 崩壊を防止。
     - `isBoundaryActive` の計算を `isBoundaryCropActive(boundaryBox)` に統一。
  4. `src/features/tactical-unified/components/use-share-page-export.ts`:
     - `stageWidth = 1920`, `stageHeight = 1080`（`PREVIEW_DIMENSIONS['16:9']` と同一の1080p基準キャンバス）、`scale: 1` に統一。
     - `exportMultiSlideMp4Video` 呼び出しに `stageWidth: 1920, stageHeight: 1080, scale: 1, teamVisibility: shareData?.teamVisibility ?? 'both'` を渡す。
  5. `src/lib/tactical/export/tactical-video-exporter.ts` & `src/lib/tactical/export/video-mediabunny-export.ts`:
     - `MultiSlideVideoExportOptions` に `teamVisibility?: 'both' | 'home' | 'away'` を追加し、`exportTacticalVideo` に `teamVisibility: options.teamVisibility` を渡す。
     - `exportMultiSlideVideo` のデフォルトを `scale = 1, stageWidth = 1920, stageHeight = 1080` に統一。
     - `video-mediabunny-export.ts` のデフォルト `scale = 1` に変更し、`calculateBoundaryCrop(boundaryBox, options.stageWidth, options.stageHeight, scale)` から第5引数 `pitchRect` を削除してキャンバス全体基準に統一（`calculatePitchRect` の不要 import も削除）。
- **Testing Strategy (Concrete Test Values)**:
  - `bun run ai:check src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/components/share-page-client-view.tsx src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/components/use-share-page-export.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/export/video-mediabunny-export.ts`
  - `activeSlide.boundaryBox` が設定されている状態で `useExportShare` を実行した際、フェーズ初期値ではなく `activeSlide.boundaryBox` が送信ペイロードに含まれること。
- **Tasks**:
  - [x] 1. TDD実装・検証: `bun run ai:check src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/components/share-page-client-view.tsx src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/components/use-share-page-export.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/export/video-mediabunny-export.ts` PASS
- **Worker Handoff Log**:
  - iOS共有送信で `selectTacticalRenderSnapshot` を適用し、`activeSlide.boundaryBox` 最優先および `teamVisibility` 送信を保証。
  - プレビューの親ラッパー・ルートの高さ（`h-full`）を修正し、動画出力（Mediabunny / WebCodecs）を 1080p（1920×1080, `scale: 1`）キャンバス全体基準クロップへ完全一致化。

---

### Phase 4: MediaRecorder出力同期 ＆ エクスポート周辺の未使用死にファイル（9ファイル）完全削除
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-media-recorder-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-target-builder.ts` (DELETE)
  - `src/features/tactical-unified/panels/export/export-image-tab.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-tab.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `src/lib/tactical/export/video-media-recorder-export.ts`:
     - デフォルト `scale = 1` に変更し、`calculateBoundaryCrop(boundaryBox, options.stageWidth, options.stageHeight, scale)` から第5引数 `pitchRect` を削除してキャンバス全体基準に統一。
     - `renderTacticalFrameToCanvas` に `baseWidth: options.stageWidth, baseHeight: options.stageHeight, marbleTexture: options.marbleTexture, screenBackground: options.screenBackground, directorCamera: options.directorCamera, directorCameraOptions: options.directorCameraOptions, teamVisibility: options.teamVisibility` を渡す。
  2. エクスポート関連の未使用死にファイル9件をすべて物理削除:
     - `src/features/tactical-unified/components/shared-export-view.tsx`
     - `src/features/tactical-unified/panels/export/export-image-tab.tsx`
     - `src/features/tactical-unified/panels/export/export-video-tab.tsx`
     - `src/features/tactical-unified/panels/export/export-json-tab.tsx`
     - `src/features/tactical-unified/panels/export/export-modal-footer.tsx`
     - `src/features/tactical-unified/panels/export/export-video-morphing-section.tsx`
     - `src/features/tactical-unified/panels/export/use-video-morphing-config.ts`
     - `src/features/tactical-unified/panels/export/export-target-builder.ts`
     - `src/features/tactical-unified/panels/export/use-export-event-listener.ts`
  3. `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`:
     - 削除した `../export-target-builder`（`buildExportTarget`）の import および `describe('buildExportTarget with boundaryBox crop integration', ...)` ブロックを削除。
     - `useExportShare` のテストで、`activeSlide.boundaryBox` が設定されている場合に `activePhase.boundaryBox`（デフォルト16:9）よりも `activeSlide.boundaryBox` が優先してペイロードに含まれること、および `teamVisibility` が送信されることを検証するテストケースを追加。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`:
    - `activeSlide.boundaryBox = { enabled: false, visible: false, x: 28.9, y: 3, width: 42.2, height: 94 }`, `activePhase.boundaryBox = { enabled: true, visible: false, x: 0, y: 0, width: 100, height: 100 }` のとき、送信された JSON body の `boundaryBox.width === 42.2` であること。
- **Tasks**:
  - [x] 1. TDD実装・不要ファイル削除: 9ファイルを物理削除し `use-export-share.test.ts` と `video-media-recorder-export.ts` を更新 ➔ `bun run ai:check src/lib/tactical/export/video-media-recorder-export.ts src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` PASS
- **Worker Handoff Log**:
  - `video-media-recorder-export.ts` を 1080p キャンバス全体基準クロップ（`scale: 1`）へ統一し、全フレーム描画オプション（`teamVisibility` 等）を同期。
  - エクスポート周辺の死にファイル9件を完全削除し、`use-export-share.test.ts` から削除モジュール参照を除去して全PASS確認。

---

### Phase 5: ボード画面からの境界線・3D操作UIファイル（6ファイル）撤去とバレル・テスト整理
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/CanvasOverlays.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/index.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. ボード画面から撤去する境界線・3D操作UIファイル6件をすべて物理削除:
     - `src/features/tactical-unified/core/components/BoundaryBoxOverlay.tsx`
     - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx`
     - `src/features/tactical-unified/core/components/BoundaryBoxTiltControls.tsx`
     - `src/features/tactical-unified/core/components/ViewportCropOverlay.tsx`
     - `src/features/tactical-unified/core/components/toolbar/ToolbarBoundaryBoxToggle.tsx`
     - `src/features/tactical-unified/core/hooks/use-boundary-box-drag.ts`
  2. 呼び出し元およびバレルファイルから削除ファイルの import / 描画 / re-export を完全除去:
     - `src/features/tactical-unified/core/components/CanvasOverlays.tsx`: `BoundaryBoxOverlay`, `BoundaryBoxHud` の import と JSX 描画を削除（未使用となった props/変数があれば整理）。
     - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`: `BoundaryBoxHud` の import と JSX 描画を削除。
     - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx`: `ToolbarBoundaryBoxToggle` の import と JSX 描画を削除。
     - `src/features/tactical-unified/core/components/canvas-stage.tsx`: `ViewportCropOverlay` の import と JSX 描画を削除。
     - `src/features/tactical-unified/core/components/toolbar/index.ts`: `export { ToolbarBoundaryBoxToggle } from './ToolbarBoundaryBoxToggle';` を削除。
     - `src/features/tactical-unified/core/index.ts`: `BoundaryBoxHud`, `BoundaryBoxHudProps`, `BoundaryBoxOverlay`, `BoundaryBoxOverlayProps`, `ViewportCropOverlay`, `ViewportCropOverlayProps`, `useBoundaryBoxDrag` の export を削除。
     - `src/features/tactical-unified/index.ts`: `BoundaryBoxOverlay as BoundaryBox` の export を削除。
  3. 既存テストから削除済みコンポーネントの import とテストブロックを同期整理:
     - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`: `ViewportCropOverlay` の import と `describe('ViewportCropOverlay', ...)` ブロックを削除。
     - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`: `BoundaryBoxHud` の import と `describe('BoundaryBoxHud', ...)` ブロックを削除。
     - `src/features/tactical-unified/core/components/__tests__/toolbar.test.tsx`: `ToolbarBoundaryBoxToggle` の import と該当アサーションを削除（`ToolbarPitchLock` のテストは維持）。
     - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`: `core` から `BoundaryBoxOverlay`, `BoundaryBoxHud`, `ViewportCropOverlay` が export されていないことを確認。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`:
    - `expect((core as Record<string, unknown>)['BoundaryBoxOverlay']).toBeUndefined()`
    - `expect((core as Record<string, unknown>)['BoundaryBoxHud']).toBeUndefined()`
    - `expect((core as Record<string, unknown>)['ViewportCropOverlay']).toBeUndefined()`
  - 関連テスト一式が `bun run ai:check` でエラーゼロで PASS すること。
- **Tasks**:
  - [x] 1. 不要6ファイルの削除と呼び出し元・バレル・テストの整理 ➔ `bun run ai:check src/features/tactical-unified/core/components/CanvasOverlays.tsx src/features/tactical-unified/core/components/HtmlHudOverlay.tsx src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/index.ts src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` PASS
- **Worker Handoff Log**:
  - ボード画面の境界線・3D操作UI 6ファイルを完全物理削除。
  - CanvasOverlays, HtmlHudOverlay, CoreDrawingToolbar, canvas-stage, core/tacticalバレル・テストを同期整理し全PASS確認。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-09 18:38
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  単一データ取得契約（`selectTacticalRenderSnapshot` / `selectActiveBoundaryBox`）の導入、境界線内部保持・常時適用と表示スイッチ（`visible`）の分離、1080p（1920×1080, `scale: 1`）キャンバス全体基準クロップの完全統一、iOSプレビュー高さ0px崩壊修正、不要ファイル15件の物理削除とバレル・テスト整理のすべてが要件・Invariantsを満たして整合性高く実装されていることを確認。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
