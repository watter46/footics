# TASK-151: 境界線クロップ計算の一元化とプレビュー表示不一致の解消

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/lib/types/tactical/slide.ts` (MODIFY: 境界線プリセットの fitTarget を canvas に統一)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY: calculateBoundaryCrop による一元計算化)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY: viewport aspect-ratio 連動)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY: クロップ描画基準の一致)

## 2. Requirements & Acceptance Criteria
- [x] 1. **境界線基準系の一致**: `createXBoundaryBox` および `DEFAULT_BOUNDARY_BOX_*` の `fitTarget` を `'canvas'` に統一し、レイアウト画面とエクスポート側で同一の全画面アスペクト基準で枠線が解釈されること。
- [x] 2. **クロップ計算のSSOT化 (2重管理解消)**: `useExportPreviewAnimation` 内の独自幅高計算を撤廃し、エクスポート出力と同一の `calculateBoundaryCrop` を利用して `previewWidth`, `previewHeight`, `previewAspectStyle` を算出すること。
- [x] 3. **プレビューのアスペクト比忠実性**: 境界線プリセット（16:9, 9:16, 4:5, 1:1）選択時、エクスポートプレビューの黒枠ビューポートおよび Canvas 解像度が選択したアスペクト比に正しくフィットすること（4:5 選択時に 1:4 に潰れないこと）。
- [x] 4. **レンダラークリッピング同期**: `tactical-frame-renderer.ts` の境界線描画が `calculateBoundaryCrop` のオフセット・解像度と整合し、静止時・再生時ともに境界線領域が 1:1 でクロップ描画されること。
- [x] 5. **既存テスト保護 & 単体テスト追加**: `bun run ai:check` がパスし、プレビューのアスペクト比・クロップ計算の単体テストが通ること。

## 3. Context Snippets

### 3.1 Import Specs
```ts
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import type { BoundaryBox, AspectRatio } from '@/lib/types/tactical-unified';
```

### 3.2 Key Logic & Contracts
```ts
// src/lib/tactical/export/video-crop-calc.ts
export function calculateBoundaryCrop(
  box: BoundaryBox | undefined | null,
  stageWidth: number,
  stageHeight: number,
  scale = 2,
  pitchRect?: { x: number; y: number; width: number; height: number },
): BoundaryCropInfo;

// プレビュー側での利用 (scale: 1 基準で実解像度・アスペクト比を取得)
const cropInfo = calculateBoundaryCrop(
  boundaryBox,
  basePreviewDim.width,
  basePreviewDim.height,
  1,
  basePreviewDim.width > 0 ? { x: 0, y: 0, width: basePreviewDim.width, height: basePreviewDim.height } : undefined,
);
```

## 4. Implementation Phases

### Phase 1: クロップ計算の共通化と境界線基準系の一元化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/slide.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
- **Testing Strategy**:
  - `use-export-preview-animation.test.ts`: 4:5 境界線（45x100）指定時に `previewAspectStyle` が `4 / 5`（または比率に一致する exportWidth / exportHeight）となり、極端な縦長に歪まないことを検証。
  - `slide.test.ts` / 既存テスト: `createXBoundaryBox` の返却オブジェクトが `fitTarget: 'canvas'` となることを確認。
- **Tasks**:
  - [x] 1. `slide.ts` で `createXBoundaryBox` および `DEFAULT_BOUNDARY_BOX_*` の `fitTarget` を `'canvas'` に設定。
  - [x] 2. `use-export-preview-animation.ts` で `calculateBoundaryCrop` を用いて `cropInfo` を算出し、`previewWidth`, `previewHeight`, `previewAspectStyle` を同期。
  - [x] 3. `tactical-frame-renderer.ts` の `boundaryBox` 描画オフセット計算と `cropInfo` の基準を統一。
  - [x] 4. 単体テストの追加と更新、`bun run ai:check` の合格。
- **Worker Handoff Log**:
  - `DEFAULT_BOUNDARY_BOX_*` と `createXBoundaryBox` の `fitTarget` を `'canvas'` に統一。プレビューとレンダラーのオフセット・解像度算出を `calculateBoundaryCrop` と同期。

---

## 5. Reviewer Assessment
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-04 22:05
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除
  - [x] 2. ホスト境界 & Store Provider: Level 2 以下のホスト非依存、チラつき防止
  - [x] 3. 設計負債 & 拡張性: SSOT原則の徹底、計算ロジックの重複根絶
  - [x] 4. サイレント破壊 & 既存保護: 画像/動画エクスポートの出力崩れがないこと
- **Summary**: `calculateBoundaryCrop` への SSOT 化によりプレビューとエクスポート出力の二重管理を解消。`fitTarget: 'canvas'` 統一とレンダラークリッピング補正で 4:5 などのアスペクト比歪みが正確に是正された。単体テストも十分かつ厳格に記述されている。

## 6. Rejections / Additional Tasks
