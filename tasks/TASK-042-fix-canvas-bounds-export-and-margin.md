# TASK-042: キャンバス余白・ドラッグ可動域・範囲選択・PNG出力位置・Extension境界線ボタンの修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/utils/virtual-canvas-rect.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-export.ts` (MODIFY)
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `PlayerMarkerItem.tsx` の `dragBoundFunc` が Stage 全体サイズ（または親 Group 絶対位置基準の余白許容範囲）で制限を行うことでピッチ右側・下側の見えない壁を解消し、かつ `pxX, pxY` 更新時に Konva Group ノードの位置（`node.position({ x: pxX, y: pxY })`）が同期されてリセット時に確実に元の位置へ戻ること。また `BillboardObjectLayer.tsx` のドラッグ終了時、メインキャンバス領域内（Stage 右端以内）でのドロップではベンチ退避（`movePlayerToBench`）を発火させないこと。
- [x] 2. `calculateVirtualCanvasRect`（`virtual-canvas-rect.ts`）がオプション `paddingRatio`（Web版 `mode === 'full-tactical'` 時は `0.06` で上下左右に作業用余白を確保、Extension版 `screenshot-edit` 時およびデフォルトは `0`）に対応し、16:9 を含む全アスペクト比でピッチ外周に作業用余白が確保され、`PitchGroundLayer`（または `CanvasStageContainer`）のメインキャンバス外枠に視認用の確認枠線が描画されること。
- [x] 3. `use-canvas-selection-box.ts` がピッチ枠オフセット（`vRect.x`, `vRect.y`）を差し引いて正規化選択矩形を算出し、`CanvasStageContainer.tsx` から `useCanvasExport` へ `pitchRect: vRect` を渡すことで Web版の PNG 出力・コピーが境界線枠と完全一致し、さらに Extension の `QuickAnnotationCanvas.tsx` のツールバーに `<ToolbarBoundaryBoxToggle />` が配置されること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { ToolbarBoundaryBoxToggle } from '@/features/tactical-unified/core';
import { resolveBoundaryBoxPixelRect } from '../utils/geometry';
```

### 3.2 Key Interfaces & Types
```ts
// virtual-canvas-rect.ts
export function calculateVirtualCanvasRect(
  containerSize: { width: number; height: number },
  imageAspect: number,
  baseWidth: number = imageAspect >= 1 ? 1920 : 1080,
  paddingRatio: number = 0,
): VirtualCanvasRect;
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// 1. PlayerMarkerItem.tsx: Stage 全体（余白含む）を可動域とし、props 変更時にノード座標を強制同期
const groupRef = useRef<Konva.Group | null>(null);
useEffect(() => {
  if (groupRef.current) {
    groupRef.current.position({ x: pxX, y: pxY });
  }
}, [pxX, pxY]);

dragBoundFunc={function (this: Konva.Node, pos: Konva.Vector2d) {
  const stage = this.getStage?.();
  const stageW = stage?.width?.();
  const stageH = stage?.height?.();
  if (stageW && stageH) {
    return {
      x: Math.max(0, Math.min(stageW, pos.x)),
      y: Math.max(0, Math.min(stageH, pos.y)),
    };
  }
  const parentPos = this.getParent?.()?.getAbsolutePosition?.() ?? { x: 0, y: 0 };
  return {
    x: Math.max(parentPos.x - width, Math.min(parentPos.x + width * 2, pos.x)),
    y: Math.max(parentPos.y - height, Math.min(parentPos.y + height * 2, pos.y)),
  };
}}

// 2. use-canvas-selection-box.ts: vRect.x / vRect.y オフセットを差し引いて正規化
const offsetX = vRect.x ?? 0;
const offsetY = vRect.y ?? 0;
const minNormX = ((minPxX - offsetX) / vRect.width) * 100;
const maxNormX = ((maxPxX - offsetX) / vRect.width) * 100;
const minNormY = ((minPxY - offsetY) / vRect.height) * 100;
const maxNormY = ((maxPxY - offsetY) / vRect.height) * 100;

// 3. CanvasStageContainer.tsx: mode === 'full-tactical' 時は paddingRatio=0.06 を適用し、useCanvasExport に pitchRect: vRect を渡す
const mode = useCanvasStore((s) => s.mode);
const paddingRatio = mode === 'full-tactical' ? 0.06 : 0;
const vRect = calculateVirtualCanvasRect(containerSize, effectiveAspect, undefined, paddingRatio);
const { exportPng, copyToClipboard } = useCanvasExport({
  stageRef,
  vRect,
  pitchRect: vRect,
});
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 選手マーカードラッグ可動域・位置同期と範囲選択オフセットの修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts`, `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
- **契約 (Interface)**:
  - `PlayerMarkerItem.tsx`: `dragBoundFunc` を Stage 全体サイズ（`0 〜 stage.width()`, `0 〜 stage.height()`、フォールバック時は `parentPos` 基準）に修正し、右側・下側の見えない壁を解消。さらに `useEffect` で `pxX, pxY` 更新時に `groupRef.current.position({ x: pxX, y: pxY })` を同期する。
  - `BillboardObjectLayer.tsx`: `handleDragEnd` のベンチパネル判定で、ドロップ位置が Stage コンテナの右端（`stageRect.right`）より右に出た場合のみ `movePlayerToBench` を呼ぶようにし、メインキャンバス右余白内でのドロップ時は余白座標として `updateMarker` を実行する。
  - `use-canvas-selection-box.ts`: `minNormX, maxNormX, minNormY, maxNormY` の計算時に `vRect.x ?? 0`, `vRect.y ?? 0` を差し引く。
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` で、ピッチ右半分および右側・下側余白領域へのドラッグ座標保持と、オフセット付き `vRect` での範囲選択ヒットを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` PASS
- **Worker Handoff Log**:
  - `PlayerMarkerItem` の `dragBoundFunc` を Stage 全体（`stage.width() / stage.height()`）基準へ修正し `useEffect` による position 同期を追加。`BillboardObjectLayer` で Stage 右端内ドロップ時の余白座標保持、`useCanvasSelectionBox` で `vRect` オフセット差し引きを反映。

### Phase 2: メインキャンバス余白パディング・確認用外枠・PNG出力位置一致・Extension境界線ボタンの実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/virtual-canvas-rect.ts`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/core/hooks/use-canvas-export.ts`, `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
- **契約 (Interface)**:
  - `virtual-canvas-rect.ts`: 第4引数 `paddingRatio: number = 0` を追加し、`availW = containerSize.width * (1 - paddingRatio * 2)`, `availH = containerSize.height * (1 - paddingRatio * 2)` の内接領域で `width, height` を計算し、`x = (containerSize.width - width) / 2`, `y = (containerSize.height - height) / 2` で中央配置する。
  - `CanvasStageContainer.tsx` & `PitchGroundLayer.tsx`: `mode === 'full-tactical'` 時は `paddingRatio = 0.06` を渡して全比率で上下左右の余白を確保し、メインキャンバス外枠に確認用枠線（`PitchGroundLayer` の背景 `<Rect>` に `!cleanRender` 時 `stroke="#38bdf8" strokeWidth={2}`）を描画。`useCanvasExport` に `{ stageRef, vRect, pitchRect: vRect }` を渡し、`use-canvas-export.ts` の `stageW / stageH` を `stage.width() / stage.height()` 基準に修正する。
  - `QuickAnnotationCanvas.tsx`: `DraggableToolbar` 内に `<ToolbarBoundaryBoxToggle />` を追加する。
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` で、(1) `full-tactical` モード時に 16:9 でも上下左右に余白（`vRect.x > 0, vRect.y > 0`）が確保されること、(2) PNG エクスポート時に `vRect.x, vRect.y` の位置で切り抜かれることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/utils/virtual-canvas-rect.ts src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/hooks/use-canvas-export.ts extension/features/canvas/components/QuickAnnotationCanvas.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` PASS
- **Worker Handoff Log**:
  - `calculateVirtualCanvasRect` に `paddingRatio` を追加し `full-tactical` 時に上下左右 6% の作業余白と確認用外枠線を描画。`useCanvasExport` に `pitchRect: vRect` を連携し Stage 基準で正確な PNG 出力切り抜きを行い、Extension に `ToolbarBoundaryBoxToggle` を配置。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 08:16
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Stage全体基準のドラッグ可動域・Konvaノード座標同期・Stage右端基準のベンチ退避判定、`paddingRatio` による余白確保と外枠描画、範囲選択およびPNG出力時の `vRect` オフセット整合性、Extensionツールバーへの境界線トグル配置がいずれもホスト境界・OCP・単一座標変換原則を厳守して実装・検証されていることを確認しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
