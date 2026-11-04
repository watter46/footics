# TASK-147: レイアウト画面の境界線操作・プリセット対応とCopy機能修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-target-builder.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **Copy機能の動作保証**: ボード画面だけでなく、レイアウト画面（directorモード）表示中も TopBar の「Copy」ボタンで境界線内（または現在のスライド）の画像がクリップボードにPNGコピーされ、トーストが表示されること
- [x] 2. **Screenタブへの境界線オプション追加**: `ScreenBackgroundPanel` に境界線セクションを設け、表示切替トグルおよび 6 種のプリセット（全画面16:9 [既定], ピッチフィット横, ピッチフィット縦, 16:9, 9:16, 4:5, 1:1）でアクティブスライドの `boundaryBox` を変更できること
- [x] 3. **レイアウト画面での境界線ドラッグ・リサイズ（方針A）**: レイアウト画面上で境界線枠（`BoundaryBoxOverlay`）が表示され、4隅ハンドルでの拡大縮小および枠ドラッグ移動が可能であること。外側は半透明暗転マスクで覆われ、切り抜きプレビュー表示と切り替え可能であること
- [x] 4. **境界線内のみのプレビューと出力連携**: `useExportPreviewAnimation` にスライドの `boundaryBox` が正しく伝達され、プレビューおよび動画・画像エクスポート出力時に境界線内のみが切り抜かれて出力されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { DEFAULT_BOUNDARY_BOX_16_9, DEFAULT_BOUNDARY_BOX_9_16, DEFAULT_BOUNDARY_BOX_4_5, DEFAULT_BOUNDARY_BOX_1_1, DEFAULT_BOUNDARY_BOX_FULL, type BoundaryBox } from '@/lib/types/tactical/slide';
import { computePitchFitBoundaryBox } from '@/features/tactical-unified/stores/boundary-box-helpers';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { BoundaryBoxOverlay } from '@/features/tactical-unified/core/components/BoundaryBoxOverlay';
```

### 3.2 Key Interfaces & Types
```ts
export interface CanvasCoreHandle {
  copyToClipboard: () => Promise<void>;
  exportImage?: (options?: { mimeType?: string; quality?: number }) => Promise<string | null>;
}
```

### 3.3 Reference Pattern
```ts
// クリップボード書き込みパターン (Canvas Blob)
canvas.toBlob(async (blob) => {
  if (!blob) return;
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
});
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: [Level 2] Copy機能のレイアウト画面対応
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx`
- **契約 (Interface)**:
  - TopBar の `handleCopy` は、`workspaceMode === 'director'` の場合でもアクティブスライド（またはプレビューキャンバス）の画像キャプチャ処理を呼び出してクリップボードへ書き込む。
- **Testing Strategy**:
  - `top-bar-copy.test.tsx`: directorモード時に Copy ボタンを押下し、クリップボードAPI呼び出しとトースト表示が行われることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar.tsx` PASS
- **Worker Handoff Log**:
  - `TopBar.handleCopy`: `workspaceMode === 'director'` 時にプレビューキャンバス（`canvas` 要素）を検出し、`canvas.toBlob` 経由でクリップボードへPNG書き込みを行うよう対応。`canvasRef?.current?.copyToClipboard` へのフォールバックも保持。

---

### Phase 2: [Level 2] Screenタブへの境界線オプション＆プリセット追加
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx`
- **契約 (Interface)**:
  - `ScreenBackgroundPanel` に境界線のトグルボタンおよびプリセットボタングループ（全画面16:9, ピッチフィット横, ピッチフィット縦, 16:9, 9:16, 4:5, 1:1）を追加。
  - プリセット選択時に `updateActiveSlideBoundaryBox`（または `updateSlide`）を呼び出し、スライドの境界線を更新。選択中プリセットのハイライト表示。
- **Testing Strategy**:
  - `screen-background-panel.test.tsx`: 各プリセット押下時に対応する `boundaryBox` 値（アスペクト比・サイズ）でストアアクションが発行されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/screen-background-panel.tsx` PASS
- **Worker Handoff Log**:
  - `ScreenBackgroundPanel` / `ScreenBoundarySection`: 境界線ON/OFFトグルおよび7種プリセット（全画面16:9, ピッチフィット横, ピッチフィット縦, 16:9, 9:16, 4:5, 1:1）を実装。`PitchSlice.updateActiveSlideBoundaryBox` を新設し状態更新を統合。

---

### Phase 3: [Level 3] レイアウト画面の境界線操作・暗転マスク・プレビュークロップ
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  - 方針Aの実装: 編集時は全体を表示しつつ外側に半透明暗転マスク（Mask Overlay）と `BoundaryBoxOverlay` を配置し、4隅ハンドルでの拡大縮小および枠ドラッグ移動を可能にする。
  - 切り替えボタン（または再生時）で境界線内のみをフィット拡大表示する「切り抜きプレビュー」に対応。
  - `useExportPreviewAnimation` に `boundaryBox: activeSlide?.boundaryBox` を渡し、プレビュー領域のアスペクト比を境界線に合わせて動的に追従。
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx`: 境界線有効時にオーバーレイとマスクが描画され、ドラッグ操作・プレビュー切り替えが機能することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` PASS
- **Worker Handoff Log**:
  - `TacticalSplitPreviewPanel`: 境界線有効時に半透明暗転マスク＋枠・4隅ハンドル操作オーバーレイ（`PreviewBoundaryOverlay`）を描画し、枠移動および4隅リサイズに対応。トグルボタンまたは再生時に動的アスペクト比追従の切り抜きプレビュー表示へ切り替え可能。

---

### Phase 4: [Level 3] レイアウト画面エクスポート出力（動画・画像）の境界線クロップ連携
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-target-builder.ts`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`
- **契約 (Interface)**:
  - エクスポート実行時（画像・動画）、スライドの境界線が有効な場合は 16:9 固定ではなく、境界線の縦横比・領域でクロップしてレンダリング・出力する。
- **Testing Strategy**:
  - `use-export-share.test.ts`: 境界線設定時のエクスポートターゲット構築とクロップ領域の検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/export-target-builder.ts` PASS
- **Worker Handoff Log**:
  - `buildExportTarget` / `BuiltExportTarget`: `boundaryBox` パラメータと `calculateBoundaryCrop` によるクロップ情報（`cropInfo`）連携を追加。境界線有効時に縦横比・領域に基づく解像度算出とエクスポートターゲット構築に対応。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-04 13:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: レイアウト画面でのクリップボードコピー、境界線プリセット選択、4隅リサイズ/ドラッグ移動オーバーレイ、エクスポートクロップ連携を高品質に実装確認。6大設計原則に完全準拠。

## 6. Rejections / Additional Tasks (不可逆修正欄)
