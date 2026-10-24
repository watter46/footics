# TASK-046: step4-ghost-trajectory-gsap-and-mediabunny-export

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-24
- **Target Files**:
  - `package.json` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` (NEW)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-onionskin.tsx` (DELETE)
  - `src/features/tactical-unified/objects/ball/components/__tests__/ball-ghost-trajectory.test.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-transition-slice.ts` (MODIFY)
  - `src/lib/tactical/easing.ts` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-transition-helpers.ts` (DELETE)
  - `src/features/tactical-unified/hooks/use-slide-timeline.ts` (DELETE)
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-worker.ts` (DELETE)
  - `src/features/tactical-unified/core/hooks/use-canvas-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/lib/tactical/__tests__/video-export-engine.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. 純粋描画の徹底: `FullTacticalCanvas` から `cleanRender={isPlaying || isExporting}` を伝播し、`cleanRender=true` 時は全オブジェクトの選択枠・各種操作ハンドル・境界線枠・HUD・ゴースト軌道を100%非表示にする。
- [ ] 2. ゴースト軌道の選択/ドラッグ限定 & 1px目即時追従: 選手ゴースト軌道を `!cleanRender && (selectedIds.includes(marker.id) || isDragging)` のみ描画。初期距離0でもマウント可能としドラッグ開始1px目から先端・ベジェハンドルを即時追従。ボールも同様に `!cleanRender && (isSelected || isDragging)` で一本化（`BallOnionskin` 撤去）。
- [ ] 3. GSAP 再生への統一 ＆ 自前 rAF / easing の廃止: `useTacticalAnimation` / `tactical-animation-canvas` の自前 rAF を廃止し `gsap.timeline()` で再生・一時停止・シーク・位置同期を制御。自前イージング計算を `gsap.parseEase()` に統一し、未参照ファイルを削除。
- [ ] 4. Mediabunny 動画出力 ＆ stage.toBlob 静止画出力 ＆ 直接配線: `mediabunny`（`Output`, `Mp4OutputFormat`, `WebMOutputFormat`, `BufferTarget`, `CanvasSource`）に移行し `mp4-muxer` / `webm-muxer` を削除。静止画は `stage.toBlob()` に一本化。`window.dispatchEvent` を廃止しエクスポート処理を直接呼び出す。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// 動画出力: mediabunny
import { Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
// アニメーション: gsap
import gsap from 'gsap';
// 静止画出力: stageToBlob
import { stageToBlob } from '@/features/tactical-unified/hooks/konva-export-helpers';
```

### 3.2 Key Interfaces & Types
```ts
export interface CleanRenderProp { cleanRender?: boolean; }
export interface VideoExportOptions {
  format: 'mp4' | 'webm'; fps: number; scale?: number; totalDurationMs: number;
  stageWidth: number; stageHeight: number; boundaryBox?: BoundaryBox | null;
  onRenderFrame?: (timeMs: number) => Promise<void> | void;
  onProgress?: (progress: { current: number; total: number; ratio: number }) => void;
  checkCancelled?: () => boolean;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 4層モデル: Level 2(Objects/Layers) -> Level 3(StageContainer) -> Level 4(FullTacticalCanvas)
// Level 2以下ではグローバルストア直接参照を禁止し Context Hook 経由または Props で注入
// cleanRender有効時は Layer 3(InteractionPreviewLayer), ViewportCropOverlay, HtmlHudOverlay も非表示
// GSAP timeline はコンポーネント破棄時 / stop 時に必ず timeline.kill() で副作用クリーンアップ (RAII)
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 純粋描画（Clean Render）モードの徹底伝播
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/views/FullTacticalCanvas.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx`, `src/features/tactical-unified/objects/ball/components/ball-object.tsx`, `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
- **契約 (Interface)**:
  ```ts
  // FullTacticalCanvas から cleanRender を供給し、CanvasStageContainer 経由で各レイヤー・各オブジェクトへ伝播
  <CanvasStageContainer cleanRender={isPlaying || isExporting} ... />
  ```
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` で `cleanRender=true` 時に選択強調・操作ハンドル・HUDが一切描画されないことを検証
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/views/FullTacticalCanvas.tsx` PASS
- **Worker Handoff Log**:
  - `cleanRender={isPlaying || isExporting}` を `CanvasStageContainer` 経由で `PitchGroundLayer`, `BillboardObjectLayer`, `PlayerMarkerItem`, `BallObject` へ伝播。Level 2 からのホスト直参照を排除し `useCanvasStore` 経由に統一。

---

### Phase 2: ゴースト軌道の選択/ドラッグ時限定表示 ＆ 1px目即時追従
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/objects/ball/components/ball-object.tsx`, `src/features/tactical-unified/objects/ball/components/ball-ghost-trajectory.tsx`, `src/features/tactical-unified/objects/ball/components/ball-onionskin.tsx`, `src/features/tactical-unified/objects/ball/components/__tests__/ball-ghost-trajectory.test.tsx`
- **契約 (Interface)**:
  ```ts
  // PitchGroundLayer: !cleanRender && (selectedIds.includes(marker.id) || isDragging)
  // BallObject: !cleanRender && (isSelected || drag.isDragging), BallOnionskin 撤去
  ```
- **Testing Strategy**: `src/features/tactical-unified/objects/ball/components/__tests__/ball-ghost-trajectory.test.tsx` で選択中/ドラッグ時限定表示と初期距離0からの追従を検証
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/objects/ball/components/__tests__/ball-ghost-trajectory.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx` PASS
- **Worker Handoff Log**:

---

### Phase 3: GSAP 再生への統一 ＆ 自前 rAF / easing の廃止
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`, `src/features/tactical-unified/stores/slide-transition-slice.ts`, `src/lib/tactical/easing.ts`, `src/lib/tactical/unified-interpolation.ts`, `src/features/tactical-unified/stores/slide-transition-helpers.ts`, `src/features/tactical-unified/hooks/use-slide-timeline.ts`, `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`
- **契約 (Interface)**:
  ```ts
  export function createTacticalTimeline(slides: Slide[], onUpdate: (timeMs: number) => void): gsap.core.Timeline;
  export function getEasingFunction(easing?: string): (t: number) => number; // gsap.parseEase
  ```
- **Testing Strategy**: `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` で GSAP タイムラインによる再生・一時停止・シーク・位置同期を検証
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-tactical-animation.ts` PASS
- **Worker Handoff Log**:

---

### Phase 4: Mediabunny 動画出力 ＆ stage.toBlob 静止画出力 ＆ 直接配線
- **Worker Model**: `flash`
- **対象ファイル**: `package.json`, `src/lib/tactical/export/video-export-engine.ts`, `src/lib/tactical/export/tactical-video-exporter.ts`, `src/lib/tactical/export/video-export-worker.ts`, `src/features/tactical-unified/core/hooks/use-canvas-export.ts`, `src/features/tactical-unified/hooks/konva-export-helpers.ts`, `src/features/tactical-unified/panels/export/use-export-modal-state.ts`, `src/lib/tactical/__tests__/video-export-engine.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function exportVideoWithMediabunny(options: VideoExportOptions): Promise<Blob>;
  export async function exportPngBlob(stage: Konva.Stage, options: ExportOptions): Promise<Blob>;
  ```
- **Testing Strategy**: `src/lib/tactical/__tests__/video-export-engine.test.ts` で Mediabunny / stage.toBlob による出力と、ExportModal からの直接実行を検証
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/video-export-engine.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/video-export-engine.ts` PASS
- **Worker Handoff Log**:

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:

## 6. Rejections / Additional Tasks (不可逆修正欄)
