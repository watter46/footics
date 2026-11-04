# TASK-153: レイアウト・エクスポート境界線クロップ完全一致化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/lib/tactical/export/video-crop-calc.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **プレビュー表示枠アスペクト比の完全一致**: 編集画面で 4:5 境界線プリセット選択時、エクスポートモーダルのプレビュー枠が 0.36（極細）や 9:16 ではなく、正確に 4:5（幅:高さ = 0.8、864×1080px）の縦横比で描画されること。
- [x] 2. **左右ピッチ切り抜き範囲の完全一致**: 編集画面で水色点線枠が囲む範囲（赤チームペナルティエリア手前〜青チームペナルティエリア手前）が、プレビュー画面で左右過剰カットされず1ピクセルも狂わず同一構図で表示されること。
- [x] 3. **上下黒帯の解消**: 16:9横長ピッチ空間を基準としたオフスクリーン描画により、画面上部に生じていた巨大な黒帯を根絶し、ピッチ上下端が境界線枠の上下端と完全一致すること。
- [x] 4. **キャンバス基準比率の明示的確定**: `useExportPreviewAnimation` および `ExportPreviewPlayer` において、`canvasAspectRatio: '16:9'` をデフォルト基準として確定注入し、プロジェクト比率（4:5等）による二重縮小を防止すること。
- [x] 5. **既存テスト全パス & Strict遵守**: `bun run ai:check` により型・Lint・Vitest（境界線クロップ・ショートカット）がすべて PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Signatures
```ts
// src/features/tactical-unified/panels/export/export-preview-player.tsx
export interface ExportPreviewPlayerProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  canvasAspectRatio?: AspectRatio; // 基準キャンバス比率（省略時 '16:9' 固定）
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  bottomBarSlot?: React.ReactNode;
}
```

### 3.2 Crop Calculation & Preview Resolution Contract
```ts
// src/features/tactical-unified/panels/export/use-export-preview-animation.ts
// 境界線計算の基準は常にレイアウト画面と同じ '16:9'（1920x1080）空間
const effectiveCanvasAspect = canvasAspectRatio ?? '16:9';
const basePreviewDim = PREVIEW_DIMENSIONS[effectiveCanvasAspect] ?? PREVIEW_DIMENSIONS['16:9'];

// renderTacticalFrameToCanvas にも baseWidth=1920, baseHeight=1080, aspectRatio='16:9' を供給
// オフスクリーンに 16:9 横長ピッチ全体を正規描画した上で、boundaryBox の正規化座標で切り抜く
```

### 3.3 Reference Viewport Style Binding
```tsx
// src/features/tactical-unified/panels/export/export-preview-player.tsx
<div
  data-testid="export-preview-viewport"
  style={{
    aspectRatio: resolvedAspectRatio, // shouldCropPreview 時は "${previewWidth} / ${previewHeight}"
    width: `min(100%, calc(100cqh * ${ratioNum}))`,
    maxHeight: '100%',
  }}
>
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 境界線解像度基準の 16:9 統一とプレビュー枠連動
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-crop-calc.ts` (Level 2 Primitive)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (Level 3 Hook)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (Level 3 Panel UI)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (Level 3 Shell View)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
  - `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx`
- **契約 (Interface)**:
  - `ExportPreviewPlayer` に `canvasAspectRatio?: AspectRatio`（デフォルト `'16:9'`）を追加。
  - `useExportPreviewAnimation` の `canvasAspectRatio` デフォルト値を `'16:9'` に固定し、`basePreviewDim` を 1920×1080 に固定。
  - `renderTacticalFrameToCanvas` 呼び出し時の `baseWidth: basePreviewDim.width`, `baseHeight: basePreviewDim.height`, `aspectRatio: effectiveCanvasAspect` を整合。
  - `export-modal-body.tsx` から `ExportPreviewPlayer` への呼び出しで `canvasAspectRatio="16:9"` を明示注入。
  - `video-crop-calc.ts` の `calculateBoundaryCrop` で、クロップ有効時は `cropW / cropH` の比率を尊重したベース解像度選択に補正。
- **Testing Strategy**:
  - `use-export-preview-animation.test.ts`: `aspectRatio='4:5'` のスライドに `createXBoundaryBox('4:5', '16:9')` を設定した際、`previewWidth: 864, previewHeight: 1080`、`previewAspectStyle: '864 / 1080'` が算出されるテストを追加。
  - `export-preview-player.test.tsx`: 4:5 境界線有効時に viewport の `aspectRatio` スタイルが `'864 / 1080'`（4:5）になることを検証。
- **Tasks**:
  - [x] 1. TDD RED: `use-export-preview-animation.test.ts` に 4:5 プリセット境界線設定時の 864x1080 算出テストを追加し失敗確認
  - [x] 2. GREEN 実装: `use-export-preview-animation.ts`, `export-preview-player.tsx`, `export-modal-body.tsx`, `video-crop-calc.ts` を修正
  - [x] 3. 機械検証: `bun run ai:check src/features/tactical-unified/panels/export/` が exit code 0 で全通過することを確認
- **Worker Handoff Log**:
  - ExportPreviewPlayerProps に `canvasAspectRatio?: AspectRatio`（既定 '16:9'）を追加。`useExportPreviewAnimation` のキャンバス基準比率を '16:9' に固定して二重縮小を根絶。
  - `video-crop-calc.ts` の `calculateBoundaryCrop` でクロップ有効時は `cropW / cropH` 比率でベース解像度を選択。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 01:12
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 4:5 プリセット選択時の 864×1080 クロップと表示比率 4:5 完全一致の検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Store Provider 経由の取得維持、描画リークなし
  - [x] 3. 設計負債 & 拡張性: 16:9 空間基準の単一化、9:16 や 1:1 境界線への幾何学的調和
  - [x] 4. サイレント破壊 & 既存保護: 境界線なしスライドの通常プレビューおよび動画・画像エクスポートへの悪影響ゼロ
- **Summary**: キャンバス基準比率を 16:9 に統一して二重縮小・上下黒帯・極細プレビュー表示の不整合を完全解消。video-crop-calc の比率判定も実クロップ寸法に適合しており、テストも含めて4大定性監査をすべて満たしています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
