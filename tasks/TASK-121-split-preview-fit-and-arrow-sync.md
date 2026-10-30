# TASK-121: スプリットプレビュー境界線フィット・分割線改善 & 矢印先端サイズの同期

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-31
- **Target Files**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `TacticalSplitPreviewPanel` から `useExportPreviewAnimation` にアクティブスライドの `boundaryBox`（および `activeSlide?.aspectRatio ?? project.aspectRatio ?? '4:5'`）が渡され、境界線の内側（エクスポート対象領域）がキャンバスいっぱいにレンダリングされること。
- [x] 2. `TacticalSplitPreviewPanel` のプレビューコンテナがモーダル用の高さ上限（`max-h-[340px]`）に制限されず、スプリット画面の領域いっぱいにアスペクト比を維持して大きく拡大表示されること。
- [x] 3. `tactical-unified-page.tsx`（および `TacticalSplitPreviewPanel`）における 2D編集キャンバスとスプリットプレビュー画面の間の分割境界線（ボーダー）が、見落とさない明瞭な薄いライン（例: `border-l border-white/20`）として表示されること。
- [x] 4. 編集画面（`arrow-line-node.tsx`）とプレビュー・エクスポート画面（`arrow-renderer.ts`）で、矢印の線幅（`strokeWidth`）および先端サイズ（`pointerLength` / `pointerWidth`）のキャンバス幅に対する計算スケールと三角形形状が同期され、見た目の大きさが一致すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx
import {
  ExportPreviewControls,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  useExportPreviewAnimation,
} from '@/features/tactical-unified/panels/export/export-preview-player';

// src/lib/tactical/export/renderers/arrow-renderer.ts
import type { InterpolatedArrowState } from '@/lib/tactical/unified-interpolation';
import type { FrameRenderContext } from './renderer-context';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/panels/export/use-export-preview-animation.ts
export const PREVIEW_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 640, height: 360 },
  '9:16': { width: 360, height: 640 },
  '4:5': { width: 480, height: 600 },
  '1:1': { width: 480, height: 480 },
};

// スプリットプレビュー用（max-h-[340px] 制限なし、親コンテナいっぱいに拡大フィット）
export const SPLIT_PREVIEW_CONTAINER_CLASSES: Record<AspectRatio, string> = {
  '16:9': 'aspect-video w-full max-h-full',
  '9:16': 'aspect-[9/16] h-full max-h-full w-auto max-w-full',
  '4:5': 'aspect-[4/5] h-full max-h-full w-auto max-w-full',
  '1:1': 'aspect-square h-full max-h-full w-auto max-w-full',
};
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. TacticalSplitPreviewPanel での境界線フィット & 拡大表示:
//    - aspectRatio は activeSlide?.aspectRatio ?? project.aspectRatio ?? '4:5' を使用する。
//    - useExportPreviewAnimation に boundaryBox: activeSlide?.boundaryBox ?? null を渡す。
//    - export-preview-player.tsx から SPLIT_PREVIEW_CONTAINER_CLASSES も re-export し、
//      TacticalSplitPreviewPanel のキャンバス外枠 div で使用する（モーダル用の max-h-[340px] による縮小を排除）。
// 2. 分割境界線の視認性:
//    - tactical-unified-page.tsx のスプリットプレビュー外枠 div の border-l を border-white/20 に変更し、
//      tactical-split-preview-panel.tsx ルート div の重複 border-l は除去または統一して見落とさない1本の薄いラインにする。
// 3. 矢印先端サイズ（Arrowhead）と線幅の完全同期:
//    - 編集画面 (arrow-line-node.tsx) と プレビュー画面 (arrow-renderer.ts) で基準幅 600px に対する同一スケール比を使用する:
//      const scale = canvasWidth > 0 ? canvasWidth / 600 : 1;
//      const strokeWidth = Math.max(2, Math.round((arrow.strokeWidth || 3) * scale));
//      const pointerLength = Math.max(8, Math.round(15 * scale));
//      const pointerWidth = Math.max(8, Math.round(15 * scale));
//    - arrow-line-node.tsx:
//      strokeWidth={isSelected ? scaledStrokeWidth + 1 : scaledStrokeWidth}
//      pointerLength={hasArrowHead ? pointerLength : 0}
//      pointerWidth={hasArrowHead ? pointerWidth : 0}
//    - arrow-renderer.ts:
//      従来の w * 0.018 および #020617 の黒縁取り（先端が細く小さく見える原因）を廃止し、
//      先端 (ex, ey) から長さ pointerLength、底辺全幅 pointerWidth（半幅 pointerWidth / 2）の二等辺三角形を構築し、
//      Konva.Arrow と同じく矢印本体の色 (a.color) と lineWidth (arrowWidth) で ctx.fill() および ctx.stroke() を行う。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: スプリットプレビュー境界線フィット・拡大表示と分割ボーダー改善
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`, `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/tactical-unified-page.tsx`, `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  ```ts
  export const SPLIT_PREVIEW_CONTAINER_CLASSES: Record<AspectRatio, string>;
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`:
    - アクティブスライドに `boundaryBox`（例: `{ x: 10, y: 10, width: 80, height: 80, enabled: true }`）が設定されている際、スプリットプレビューの描画に `boundaryBox` が反映されること、およびフルサイズコンテナクラスが適用されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-split-preview-panel.test.tsx` にテスト追加 ➔ `use-export-preview-animation.ts`, `export-preview-player.tsx`, `tactical-split-preview-panel.tsx`, `tactical-unified-page.tsx` 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `SPLIT_PREVIEW_CONTAINER_CLASSES` を export し、スプリットプレビューの最大化拡大および `activeSlide.boundaryBox` のプレビュー反映と境界線 (`border-white/20`) の視認性改善を完了。

### Phase 2: 編集画面とプレビュー画面の矢印先端サイズ・線幅スケールの同期
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`, `src/lib/tactical/export/renderers/arrow-renderer.ts`, `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  ```ts
  export function renderArrows(
    context: FrameRenderContext,
    arrows: Record<string, InterpolatedArrowState>,
  ): void;
  ```
- **Testing Strategy**:
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`:
    - `renderArrows` でキャンバス幅 `w` に対して `scale = w / 600` に基づく `lineWidth` と `pointerLength` / `pointerWidth`（`15 * scale`）の矢印先端が描画され、`#020617` による縮小縁取りが行われず矢印色と同色で描画されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-frame-renderer.test.ts` にテスト追加 ➔ `arrow-line-node.tsx`, `arrow-renderer.ts` 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/lib/tactical/export/renderers/arrow-renderer.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` PASS
- **Worker Handoff Log**:
  - `renderArrows` と `ArrowLineNode` で基準幅 600px (`w / 600`) に基づく線幅・矢印先端サイズ (`15 * scale`) を同期し、エクスポート側の黒フチ (`#020617`) を廃止して矢印本体色による統一描画に改修。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-31 01:50
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  スプリットプレビューでの境界線フィット（`boundaryBox`）、領域最大化拡大、および分割ボーダー（`border-white/20`）の視認性改善を確認。編集画面とプレビュー・エクスポート描画間での矢印スケール基準（基準幅600px）と先端ヘッド形状の完全同期、ダークストローク排除も適切に実装・検証されています。4大定性監査をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
