# TASK-161: Tactical Deadcode and Geometry Cleanup

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-06
- **Target Files**:
  - `src/features/tactical-unified/core/components/BallLayer.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/AnnotationLayer.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/__tests__/player-layer.test.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx` (DELETE)
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-konva-export.ts` (DELETE)
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts` (DELETE)
  - `src/features/tactical-unified/hooks/konva-video-export-helper.ts` (DELETE)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` (MODIFY)
  - `src/features/tactical-unified/utils/geometry.ts` (DELETE)
  - `src/features/tactical-unified/stores/tactical-geometry-helpers.ts` (DELETE)
  - `src/features/tactical-unified/stores/annotation-erase-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` (MODIFY)
  - `src/lib/tactical/pitch-stage-mapping.ts` (DELETE)
  - `src/lib/tactical/__tests__/pitch-stage-mapping.test.ts` (DELETE)
  - `src/features/tactical-unified/core/utils/canvas-export-primitives.ts` (NEW)
  - `src/features/tactical-unified/core/hooks/use-canvas-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 旧レイヤー（`BallLayer.tsx`, `PlayerLayer.tsx`, `AnnotationLayer.tsx`）および旧テストが完全削除され、`DrawingPreviewLayer.tsx` が純粋レンダラー関数（`renderDrawingPreviewNode`, `PREVIEW_SHAPE_RENDERERS`）のみにスリム化されていること。
- [x] 2. 旧エクスポートフック（`use-konva-export.ts`, `use-konva-video-export.ts`, `konva-video-export-helper.ts`）が削除され、`core/index.ts` から削除された旧レイヤーの再エクスポートが除去され、`tactical-barrel-exports.test.ts` が PASS すること。
- [x] 3. 重複した幾何関数（`tactical-geometry-helpers.ts`, `utils/geometry.ts`）が撤去され、`annotation-erase-helpers.ts` と `tactical-unified-store.ts` の import が `@/features/tactical-unified/core/utils/geometry` に一本化されていること。
- [x] 4. `canvas-pitch-transform-helper.ts` の `DEFAULT_PITCH_PERSPECTIVE` が `./canvas-screen-coordinates` から import & re-export され、重複が解消されていること。
- [x] 5. `pitch-stage-mapping.ts` および関連テストが削除され、`full-tactical-canvas-integration.test.tsx` でのピッチ正規化座標テストが `calculatePitchRect` に基づく計算へ置き換えられていること。
- [x] 6. `use-canvas-export.ts` の逆方向 import（`@/features/tactical-unified/hooks/...` への依存）が解消され、`stageToBlob`, `exportPngBlob`, `downloadBlob` 等が `core/utils/canvas-export-primitives.ts` へ移管され、`hooks/konva-export-helpers.ts` から re-export されていること。
- [x] 7. 全ての単体テスト・型チェック・Lint（`bun run ai:check`）がパスし、既存の戦術ボード機能・オフスクリーン描画の振る舞いが完全維持されていること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **本番描画・座標変換の完全維持**: 本番稼働中の 4 レイヤー（`PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer`, `ViewportCropOverlay`）およびオフスクリーン出力（`tactical-frame-renderer.ts`）の描画ロジック・座標計算式は一切変更しない（既存ユーザーの戦術ボード描画の破綻を防ぐため）。
  2. **4層コンポーネントモデルの依存方向厳守 (Level 2 -> Level 3 逆流禁止)**: Level 2（`src/features/tactical-unified/core/`）から外側の Level 3（`src/features/tactical-unified/hooks/` や `stores/`）を import してはならない。依存は常に `hooks/ -> core/` の一方向とする。
  3. **`DrawingPreviewLayer.tsx` のプレビューレンダラー維持**: `InteractionPreviewLayer.tsx` が参照している `renderDrawingPreviewNode` および `PREVIEW_SHAPE_RENDERERS` のシグネチャ・出力は完全に維持する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/core/index.ts`: `AnnotationLayer`, `PlayerLayer`, `DrawingPreviewLayer`（コンポーネント）の export 削除。
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`: バレルエクスポートの同期。
  - `src/features/tactical-unified/stores/annotation-erase-helpers.ts`: `isPointInPolygon`, `distToSegment` の import 元を `@/features/tactical-unified/core/utils/geometry` に変更。
  - `src/features/tactical-unified/stores/tactical-unified-store.ts`: `isPointInPolygon`, `distToSegment` の import 元を `@/features/tactical-unified/core/utils/geometry` に変更。
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`: `pitch-stage-mapping.ts` から `calculatePitchRect` への移行。
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`: `stageToBlob`, `exportPngBlob`, `downloadBlob` を `core/utils/canvas-export-primitives` から re-export。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 幾何関数の統一 import
import { distToSegment, isPointInPolygon } from '@/features/tactical-unified/core/utils/geometry';

// 視点定数の re-export
export { DEFAULT_PITCH_PERSPECTIVE } from './canvas-screen-coordinates';

// 画像エクスポートプリミティブの import（core 側）
import {
  downloadBlob,
  exportPngBlob as exportPngBlobHelper,
} from '../utils/canvas-export-primitives';
```

### 3.2 Key Interfaces & Types
```ts
export interface PreviewShapeRenderContext {
  sPxX: number;
  sPxY: number;
  cPxX: number;
  cPxY: number;
  color: string;
  strokeWidth: number;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// full-tactical-canvas-integration.test.tsx での calculatePitchRect による正規化
const stageW = 100 * (s.stageAspect ?? 1);
const stageH = 100;
const rawRect = calculatePitchRect({ width: stageW, height: stageH }, s.project.aspectRatio);
const rect = {
  x: (rawRect.x / stageW) * 100,
  y: (rawRect.y / stageH) * 100,
  width: (rawRect.width / stageW) * 100,
  height: (rawRect.height / stageH) * 100,
};
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 未使用の旧 Konva レイヤー削除と DrawingPreviewLayer スリム化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/BallLayer.tsx`
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx`
  - `src/features/tactical-unified/core/components/AnnotationLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/player-layer.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx`
  - `src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx`
- **契約 (Exact Contract & Formula)**:
  1. `BallLayer.tsx`, `PlayerLayer.tsx`, `AnnotationLayer.tsx`, `player-layer.test.tsx`, `annotation-layer.test.tsx` の 5 ファイルを削除。
  2. `DrawingPreviewLayer.tsx` から未使用の `DrawingPreviewLayer` コンポーネントおよび `DrawingPreviewLayerProps` を削除。
  3. `InteractionPreviewLayer.tsx` が依存している `renderDrawingPreviewNode`, `PREVIEW_SHAPE_RENDERERS`, `PreviewShapeRenderer`, `PreviewShapeRenderContext` は完全に維持し export する。
- **Testing Strategy (Concrete Test Values)**:
  - `bun run ai:check src/features/tactical-unified/core/components/DrawingPreviewLayer.tsx` がパスすること。
  - `bun run ai:check src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` がパスすること。
- **Tasks**:
  - [x] 1. 旧レイヤーファイルとテストを削除し、`DrawingPreviewLayer.tsx` をスリム化 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 旧レイヤー5ファイルを削除。DrawingPreviewLayer.tsx を純粋レンダラー関数・プレビュー種別定義（renderDrawingPreviewNode / PREVIEW_SHAPE_RENDERERS / PreviewShapeRenderer / PreviewShapeRenderContext）のみにスリム化。
  - 型波及（ripple effect）防止のため core/index.ts から削除レイヤーの export を同期除去し、ai:check 全パス確認。

---

### Phase 2: 旧エクスポートフック削除とバレルエクスポート同期
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-konva-export.ts`
  - `src/features/tactical-unified/hooks/use-konva-video-export.ts`
  - `src/features/tactical-unified/hooks/konva-video-export-helper.ts`
  - `src/features/tactical-unified/core/index.ts`
  - `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`
- **契約 (Exact Contract & Formula)**:
  1. `use-konva-export.ts`, `use-konva-video-export.ts`, `konva-video-export-helper.ts` を削除。
  2. `src/features/tactical-unified/core/index.ts` から削除されたレイヤーの export を除去：
     - `AnnotationLayer, type AnnotationLayerProps`
     - `DrawingPreviewLayer, type DrawingPreviewLayerProps`
     - `PlayerLayer, type PlayerLayerProps`
  3. `tactical-barrel-exports.test.ts` で `core` から上記シンボルが export されていないこと、あるいは既存のアクティブシンボル（`TacticalUnifiedPage`, `RightPanel`, `TimelineBar` 等）が PASS することを確認。
- **Testing Strategy (Concrete Test Values)**:
  - `bun run ai:check src/features/tactical-unified/core/index.ts src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` が PASS すること。
- **Tasks**:
  - [x] 1. 旧エクスポートフックを削除し、バレルエクスポートを整理 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 未使用の旧エクスポートフック3ファイル（use-konva-export.ts, use-konva-video-export.ts, konva-video-export-helper.ts）を削除。
  - tactical-barrel-exports.test.ts に dead layer symbols（AnnotationLayer, DrawingPreviewLayer, PlayerLayer, BallLayer）の非公開アサーションを追加し、ai:check パス確認。

---

### Phase 3: 幾何関数の重複排除・統一と DEFAULT_PITCH_PERSPECTIVE 一本化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/utils/geometry.ts`
  - `src/features/tactical-unified/stores/tactical-geometry-helpers.ts`
  - `src/features/tactical-unified/stores/annotation-erase-helpers.ts`
  - `src/features/tactical-unified/stores/tactical-unified-store.ts`
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts`
- **契約 (Exact Contract & Formula)**:
  1. `src/features/tactical-unified/utils/geometry.ts` と `src/features/tactical-unified/stores/tactical-geometry-helpers.ts` を削除。
  2. `annotation-erase-helpers.ts` と `tactical-unified-store.ts` の `isPointInPolygon`, `distToSegment` の import 元を `@/features/tactical-unified/core/utils/geometry` に変更。
  3. `canvas-pitch-transform-helper.ts` の `export const DEFAULT_PITCH_PERSPECTIVE = 1200;` を `export { DEFAULT_PITCH_PERSPECTIVE } from './canvas-screen-coordinates';` に変更。
- **Testing Strategy (Concrete Test Values)**:
  - `isPointInPolygon({ x: 50, y: 50 }, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]) === true`
  - `isPointInPolygon({ x: 150, y: 50 }, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]) === false`
  - `distToSegment({ x: 5, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 }) === 10`
  - `bun run ai:check src/features/tactical-unified/stores/annotation-erase-helpers.ts src/features/tactical-unified/stores/tactical-unified-store.ts src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts` が PASS すること。
- **Tasks**:
  - [x] 1. 幾何関数を一本化し、重複視点定数を解消 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 幾何関数定義を core/utils/geometry に一本化し、tactical-geometry-helpers.ts と utils/geometry.ts を削除。
  - canvas-pitch-transform-helper の DEFAULT_PITCH_PERSPECTIVE を canvas-screen-coordinates からの re-export に統一。ai:check 全パス確認。

---

### Phase 4: 旧マッピング削除・Stage画像出力プリミティブ移管・逆方向import解消
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/pitch-stage-mapping.ts`
  - `src/lib/tactical/__tests__/pitch-stage-mapping.test.ts`
  - `src/features/tactical-unified/core/utils/canvas-export-primitives.ts`
  - `src/features/tactical-unified/core/hooks/use-canvas-export.ts`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. `src/lib/tactical/pitch-stage-mapping.ts` および `src/lib/tactical/__tests__/pitch-stage-mapping.test.ts` を削除。
  2. `src/features/tactical-unified/core/utils/canvas-export-primitives.ts` を新設し、以下を実装・export:
     - `stageToBlob(stage: Konva.Stage, config?: Parameters<Konva.Stage['toBlob']>[0]): Promise<Blob | null>`
     - `exportPngBlob(stage: Konva.Stage, options?: { crop?: boolean; scale?: number; boundaryBox?: BoundaryBox | null; pitchRect?: { x: number; y: number; width: number; height: number; }; }): Promise<Blob>`
     - `downloadBlob(blob: Blob, filename: string): void`
  3. `src/features/tactical-unified/core/hooks/use-canvas-export.ts` の import を以下に変更し、Level 2 から Level 3 への逆方向 import を根絶:
     `import { downloadBlob, exportPngBlob as exportPngBlobHelper } from '../utils/canvas-export-primitives';`
  4. `src/features/tactical-unified/hooks/konva-export-helpers.ts` から `stageToBlob`, `exportPngBlob`, `downloadBlob` の実体を削除し、`src/features/tactical-unified/core/utils/canvas-export-primitives` から re-export。
  5. `full-tactical-canvas-integration.test.tsx` の `getPitchRectNormalized` を `calculatePitchRect` に基づく正規化計算に置換。
- **Testing Strategy (Concrete Test Values)**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-export-primitives.ts src/features/tactical-unified/core/hooks/use-canvas-export.ts src/features/tactical-unified/hooks/konva-export-helpers.ts src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. Stage画像出力プリミティブを core に移管し、逆方向import解消と旧マッピング削除 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - pitch-stage-mapping.ts 削除に伴い full-tactical-canvas-integration.test.tsx の正規化座標テストを calculatePitchRect に移行。
  - canvas-export-primitives.ts を新設して stageToBlob, exportPngBlob, downloadBlob を移管し、use-canvas-export.ts の逆方向 import を解消。konva-export-helpers.ts から re-export。ai:check 全パス確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-06 03:52
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  旧Konvaレイヤー・重複幾何関数・旧マッピングの完全撤去と、Level 2への画像エクスポートプリミティブ移管による逆方向import解消を確認。不変条件およびConsumers同期が完全担保されているため承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
