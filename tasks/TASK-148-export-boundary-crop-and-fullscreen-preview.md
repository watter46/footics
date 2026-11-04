# TASK-148: 境界線等倍クロップ・Copy修正・エクスポート全画面プレビュー

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-target-builder.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **等倍切り抜き（クロップ）描画**: 境界線が有効な際、ピッチや選手の描画スケール（16:9描画時のサイズ・位置）を維持したまま、引き延ばし・拡大を行わず境界線矩形内のみを等倍で切り抜いて描画・エクスポートされること
- [x] 2. **Copy機能の境界線切り抜き対応**: レイアウト画面およびボード画面でCopyボタンを押した際、境界線が有効であれば境界線枠の内側のみが切り抜かれてPNG画像としてクリップボードに保存されること
- [x] 3. **エクスポートモーダルの全画面プレビュー化**: モーダルが画面横一杯（全画面対応）に広がり、上部に横一杯の大型プレビュー、下部に最小限の操作・設定バーが1列に配置された洗練された上下レイアウトになること
- [x] 4. **プレビューと出力結果の完全一致**: プレビューが境界線のアスペクト比に連動して最大フィット表示され、出力結果と同一の描画が表示されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { type BoundaryBox, type AspectRatio } from '@/lib/types/tactical-unified';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```

### 3.2 Reference Pattern (等倍オフスクリーン切り抜き & キャンバスクロップ)
```ts
// 1. 等倍クロップ描画 (tactical-frame-renderer.ts):
// scale は適用せず、原点を boundaryBox の (x, y) だけ左上へオフセット
if (isBoundaryActive && boundaryBox) {
  const cropX_px = (boundaryBox.x / 100) * base16x9Width;
  const cropY_px = (boundaryBox.y / 100) * base16x9Height;
  ctx.translate(-cropX_px, -cropY_px);
}

// 2. オフスクリーン切り抜き (Copy機能):
const cropCanvas = document.createElement('canvas');
cropCanvas.width = sw; cropCanvas.height = sh;
cropCanvas.getContext('2d')?.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: [Level 1/2] 境界線の等倍クロップ描画とエクスポート解像度連携
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/export-target-builder.ts`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  - `renderTacticalFrameToCanvas`: `isBoundaryActive` 時に拡大縮小（`scaleX`, `scaleY`）を行わず、16:9全画面基準の座標系から `translate(-cropX, -cropY)` のみ適用する。
  - `useExportPreviewAnimation` / `export-target-builder`: 境界線有効時、出力およびキャンバスの解像度を境界線の比率・サイズに基づき決定する。
- **Testing Strategy**:
  - `tactical-frame-renderer.test.ts`: 境界線有効時に拡大縮小 scale が呼ばれず、等倍オフセットのみが適用されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts` PASS
- **Worker Handoff Log**:
  - `renderTacticalFrameToCanvas`: `isBoundaryActive` 時に `ctx.scale` による引き延ばしを撤廃し、ベース解像度逆算から `ctx.translate(-cropX_px, -cropY_px)` のみ適用する等倍クロップ描画を確立。
  - `useExportPreviewAnimation`: 境界線有効時に `previewWidth` / `previewHeight` を境界線サイズに同期させ、キャンバス内部解像度と CSS コンテナ比率を完全一致。
  - `export-target-builder`: `BuildParams` に `aspectRatio` を追加し、任意ピッチ比率での `calculateBoundaryCrop` 出力解像度決定を保証。

---

### Phase 2: [Level 2] Copy機能の境界線矩形オフスクリーン切り抜き
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx`
- **契約 (Interface)**:
  - `TopBar.handleCopy`: アクティブスライドの `boundaryBox?.enabled` を参照。境界線が有効な場合、対象 `canvas` の境界線領域（`x`, `y`, `width`, `height`）のみを一時キャンバスに切り出してクリップボードへPNG書き込みを行う。
- **Testing Strategy**:
  - `top-bar-copy.test.tsx`: 境界線有効時に境界線領域のみがクリップボードに書き込まれることをモック検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar.tsx` PASS
- **Worker Handoff Log**:
  - `TopBar.handleCopy`: `selectActiveSlide` から `isBoundaryActive` を判定し、境界線有効時は一時 canvas で境界矩形領域のみをオフスクリーン切り抜きしてクリップボードへ書き込むよう改修。

---

### Phase 3: [Level 3] エクスポートモーダルの全画面プレビュー化 & UI再配置
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-modal.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx`
- **契約 (Interface)**:
  - `export-modal.tsx`: モーダル幅・高さを全画面スタイル（`w-[96vw] max-w-[96vw] h-[92vh]`）に拡張。
  - `export-modal-body.tsx`: 左右分割を撤廃し上下構成に変更。上部にプレビュープレイヤーを横一杯に配置。下部にシークバー・再生、出力形式・解像度、実行ボタンをコンパクトな1行バーに整理。
  - `export-preview-player.tsx`: 境界線のアスペクト比に連動してプレビュー枠を最大フィット表示。
- **Testing Strategy**:
  - `export-modal.test.tsx`: 全画面プレビューレイアウトが正常にレンダリングされ、設定変更とエクスポートが実行できることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/export-modal.tsx` PASS
- **Worker Handoff Log**:
  - `ExportModal`: ダイアログを全画面 `w-[96vw] max-w-[96vw] h-[92vh]` に拡張し、左右2カラムを撤廃してプレビューを上部いっぱいに配置。
  - `ExportPreviewPlayer` / `ExportModalBody`: 境界線比率に連動したプレビュー枠の最大フィット表示と、下部1行バーへの再生・シークバー・フォーマット・スケール・実行ボタンの統合を集約。

---

### Phase 4: [Level 3] レイアウト画面のプレビュー表示同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  - `TacticalSplitPreviewPanel`: 等倍切り抜きされた描画エンジンと連携し、切り抜きプレビュー時および再生時に境界線サイズ・アスペクト比でプレビューコンテナを正確に描画する。
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx`: 切り抜きプレビュー時に境界線枠の比率で等倍描画されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` PASS
- **Worker Handoff Log**:
  - `TacticalSplitPreviewPanel`: クロッププレビュー時および再生時に `previewAspectStyle` 連動のアスペクト比スタイルと `max-w-full max-h-full w-auto h-auto` クラスを適用し、等倍キャンバス解像度とプレビュー枠の最大フィット表示を確立。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-04 15:08
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 等倍クロップ描画における scale 撤廃・ベース解像度逆算 translate オフセット、Copy機能のオフスクリーン切り抜き、エクスポートモーダルの全画面化およびプレビューと下部操作バーの上下統合レイアウト、Fix 1 のテスト期待値修正を含め、4大定性監査を完全にクリアしています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- [x] Fix 1: `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx` のアスペクト比期待値修正
  - 理由: 境界線のアスペクト比スタイルは、16:9キャンバス上のパーセンテージ（`40/30`）ではなく、実際のピクセルサイズ比（1920*0.4=768, 1080*0.3=324 より `768 / 324`）が適用される。テストの期待値を実装（`previewWidth / previewHeight`）に合わせ修正し、`bun run ai:check` を合格させる。
