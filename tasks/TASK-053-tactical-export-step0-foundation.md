# TASK-053: tactical-export-step0-foundation

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-25
- **Target Files**:
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/video-export-engine.test.ts` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/benchmark-presets.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. 共有ページのビルドエラー解消: `src/app/export/share/[shareId]/page.tsx` から削除済みの `@/lib/tactical/export/video-export-worker` (`executeOffThreadVideoExport`) 参照を撤去し、`exportMultiSlideMp4Video` (`@/lib/tactical/export/tactical-video-exporter`) に差し替えて本番ビルド (`bun run build`) が成功すること。
- [x] 2. 裏側 Canvas レンダラーによる単体 PNG 保存配線: モーダル (`useExportModalState`) で `png` 選択時に、現在選択中のスライド（未選択時は先頭スライド）の静止状態（`timeMs: 0`）を `renderTacticalFrameToCanvas` + `calculateBoundaryCrop` で描画し、`tactical-slide-${String(slide.index + 1).padStart(2, '0')}.png` として自動ダウンロードを発火させ、完了後に `closeExportModal()` でモーダルを閉じること。
- [x] 3. 裏側 Canvas レンダラーによる全スライド連番 ZIP 保存配線: モーダルで `zip` 選択時に、プロジェクト内の全スライド（シーン 1〜N）を `renderTacticalFrameToCanvas` で描画し、`fflate` (`zipSync`) で `slide-01.png`, `slide-02.png`... の連番 PNG を格納した `tactical-slides.zip` を自動ダウンロードさせ、完了後に `closeExportModal()` でモーダルを閉じること。
- [x] 4. 既存テスト3ファイルの修正と全件合格:
  - `video-export-engine.test.ts`: `createMockCanvasContext` に `translate`, `scale`, `rect`, `clip` モックを追加し全テストが PASS すること。
  - `full-tactical-canvas-integration.test.tsx`: キャンバス幅 1000px の右端クランプ期待値（`x: 1000`）および GSAP ベースの unmount 停止検証（`isPlaying === false`）に整合させ全テストが PASS すること。
  - `benchmark-presets.test.ts`: `calculateUnifiedTotalDuration`（到着スライド `slides.slice(1)` の合算）に合わせ、Low Block (`4200`) と High Press (`2000`) の期待値を整合させ全テストが PASS すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/app/export/share/[shareId]/page.tsx
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';

// src/features/tactical-unified/hooks/konva-export-helpers.ts
import { zipSync } from 'fflate';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-export-engine';
import type { AspectRatio, BoundaryBox, Slide } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export interface RenderSlideImageOptions {
  slide: Slide;
  aspectRatio: AspectRatio;
  scale?: number;
  stageWidth?: number;
  stageHeight?: number;
  boundaryBox?: BoundaryBox | null;
}

export interface ExportSlidesArchiveOptions {
  slides: Slide[];
  aspectRatio: AspectRatio;
  scale?: number;
  stageWidth?: number;
  stageHeight?: number;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. renderSlideToPngBlob の Canvas Blob 変換フォールバック:
//    ブラウザ環境では canvas.toBlob((b) => resolve(b), 'image/png') を優先し、
//    jsdom やモック環境で toBlob が null を返す・または存在しない場合は canvas.toDataURL('image/png') -> dataUrlToBlob へフォールバックすること。
// 2. 基準ステージサイズと BoundaryBox:
//    stageWidth = options.stageWidth ?? 1280, stageHeight = options.stageHeight ?? 720, scale = options.scale ?? 2。
//    const box = options.boundaryBox !== undefined ? options.boundaryBox : options.slide.boundaryBox;
//    const crop = calculateBoundaryCrop(box, stageWidth, stageHeight, scale);
//    canvas.width = crop.exportWidth; canvas.height = crop.exportHeight;
//    renderTacticalFrameToCanvas(ctx, { slides: [options.slide], timeMs: 0, width: crop.exportWidth, height: crop.exportHeight, aspectRatio: options.aspectRatio, boundaryBox: box });
// 3. page.tsx の差し替え:
//    executeOffThreadVideoExport を削除し、exportMultiSlideMp4Video({ slides, fps: preset.fps, scale: 1, quality: 'high', bitrate: preset.bitrateMbps * 1_000_000, h264Profile: 'high', keyFrameIntervalSec: preset.keyFrameIntervalSec, latencyMode: preset.latencyMode, maxQueueSize: preset.maxQueueSize, transparent: false, boundaryBox: null, stageWidth, stageHeight, aspectRatio: isVertical ? '9:16' : '16:9', onProgress: (p) => setExportProgress(p.percent) }) が返す Blob を直接 setExportedBlob(blob) に渡すこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 共有ページのビルド修復 ＆ 裏側 Canvas による静止画（PNG / ZIP）保存配線
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/export/share/[shareId]/page.tsx`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts`
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function renderSlideToPngBlob(options: RenderSlideImageOptions): Promise<Blob>;
  export async function exportSingleSlidePng(options: RenderSlideImageOptions): Promise<void>;
  export async function exportAllSlidesZip(options: ExportSlidesArchiveOptions): Promise<void>;
  ```
- **Testing Strategy**: `konva-export-helpers.test.ts` にて、`exportSingleSlidePng` が `tactical-slide-01.png`（index=1 なら `tactical-slide-02.png`）をダウンロード発火すること、`exportAllSlidesZip` が `renderTacticalFrameToCanvas` 経由で全スライドを描画し `tactical-slides.zip`（内部 `slide-01.png`, `slide-02.png`）を生成・ダウンロード発火することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` ➔ `konva-export-helpers.ts`, `use-export-modal-state.ts`, `page.tsx` 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/konva-export-helpers.ts src/features/tactical-unified/panels/export/use-export-modal-state.ts src/app/export/share/[shareId]/page.tsx` PASS
- **Worker Handoff Log**:
  - `konva-export-helpers.ts` に `renderSlideToPngBlob`, `exportSingleSlidePng`, `exportAllSlidesZip` を実装し、`useExportModalState` に配線。共有ページ `page.tsx` を `exportMultiSlideMp4Video` に差し替え完了。

---

### Phase 2: 既存テスト3ファイルの修正（Canvasモック・統合テスト・ベンチマークプリセット）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/__tests__/video-export-engine.test.ts`
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`
  - `src/features/tactical-unified/__tests__/benchmark-presets.test.ts`
- **契約 (Interface)**:
  ```ts
  // 既存テストスイート3件のモック・期待値を現行仕様に追従させる
  ```
- **Testing Strategy**:
  - `video-export-engine.test.ts`: `createMockCanvasContext()` に `translate: vi.fn(), scale: vi.fn(), rect: vi.fn(), clip: vi.fn()` を追加し全件 PASS。
  - `full-tactical-canvas-integration.test.tsx`: Line 186-189 の右端クランプ期待値を `{ x: 1000, y: 0 }` に更新し、Line 292-312 の unmount テストから旧 RAF 用の `expect(cancel).toHaveBeenCalled()` を除去して `expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false)` で検証。
  - `benchmark-presets.test.ts`: Low Block の合計時間期待値を `4200`、High Press の合計時間期待値を `2000` に更新。
- **Tasks**:
  - [x] 1. テスト修正と検証: `bun run ai:check src/lib/tactical/__tests__/video-export-engine.test.ts src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx src/features/tactical-unified/__tests__/benchmark-presets.test.ts` PASS
- **Worker Handoff Log**:
  - `video-export-engine.test.ts` に Canvas 2D 変形・描画APIモックを追加、統合テストのStage幅1000pxクランプと再生状態検証を整合、到着スライド合算（`slides.slice(1)`）の継続時間期待値を追従。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-25 16:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - 共有ページの削除済みWorker参照を `exportMultiSlideMp4Video` に正常置換。
  - 裏側 Canvas レンダラー（`renderTacticalFrameToCanvas` + `calculateBoundaryCrop`）による PNG / ZIP エクスポート処理および RAII な Blob ダウンロードが要件通り美しく実装されている。
  - 既存テスト 3 件（Canvas 2D モック拡張、Stage 幅クランプ・再生停止、到着スライド合算時間）も現行仕様に整合。全受入要件を満たしている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
