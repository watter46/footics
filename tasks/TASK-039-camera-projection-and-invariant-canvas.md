# TASK-039: 単一座標変換パイプラインとメインキャンバス不変・境界線枠初期値の統一

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/utils/matrix-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/store/canvas-store.ts` (MODIFY)
  - `src/features/tactical-unified/core/store/canvas-store-pitch.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-aspect-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-transition-helpers.ts` (CREATE)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxOverlay.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-export.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/__tests__/canvas-store.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `matrix-coordinates.ts` に `CameraState` (`{ tilt, yaw, zoom, panX, panY }`) と `DEFAULT_CAMERA_STATE`、および 0〜100 のピッチ論理座標とスクリーン投影座標（`perspectiveScale` 含む）を相互変換する単一変換関数 `worldToScreen` / `screenToWorld`（ピッチ外余白座標 `< 0`・`> 100` もクランプせず許容）が実装され、`canvas-coordinates.ts` および `core/index.ts` から再エクスポートされていること。
- [x] 2. `createCanvasStore` の初期アスペクト比デフォルトが `'4:5'` となり、初期 `boundaryBox` が `mode === 'full-tactical'`（Web版）では `fitTarget: 'pitch', visible: false`、`mode === 'screenshot-edit'`（Extension版）では `fitTarget: 'canvas', visible: false` に設定されること。また Web版のアスペクト比変更時（`project-slice.ts`, `slide-aspect-helpers.ts`, `getDefaultBoundaryBoxForAspect`）およびメンバー維持リセット時（`resetSlideKeepSquadData`）も `fitTarget: 'pitch', visible: false` が維持されること。
- [x] 3. `getPointerCoordinates` (`geometry.ts`) が `pitchRect`（`x, y, width, height`）オフセットを考慮してピッチ論理座標（余白領域の `< 0` や `> 100` も許容）を算出し、`BoundaryBoxOverlay` と `useCanvasExport` が `fitTarget === 'pitch'` の際に `pitchRect` 基準で描画・クロップ範囲を解決すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { mat4, vec4 } from 'gl-matrix';
import type { PitchRectBounds, Point2D } from './canvas-coordinates';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_BOUNDARY_BOX_FULL,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/core/utils/matrix-coordinates.ts
export interface CameraState {
  tilt: number; // 0〜60 (度数法)
  yaw: number; // -45〜45 (度数法, 左右覗き込み, 初期値 0)
  zoom: number; // デフォルト 1.0
  panX: number; // px
  panY: number; // px
}

export const DEFAULT_CAMERA_STATE: CameraState = {
  tilt: 0,
  yaw: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export interface ScreenProjectedPoint {
  x: number;
  y: number;
  perspectiveScale: number;
}

export function worldToScreen(
  worldPos: Point2D,
  pitchRect: PitchRectBounds,
  camera?: Partial<CameraState>,
  stageSize?: { width: number; height: number },
): ScreenProjectedPoint;

export function screenToWorld(
  screenPos: Point2D,
  pitchRect: PitchRectBounds,
  camera?: Partial<CameraState>,
  stageSize?: { width: number; height: number },
): Point2D | null;
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// 1. worldToScreen / screenToWorld 実装パターン (matrix-coordinates.ts)
export function worldToScreen(
  worldPos: Point2D,
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
  stageSize?: { width: number; height: number },
): ScreenProjectedPoint {
  const tilt = camera.tilt ?? 0;
  const yaw = camera.yaw ?? 0;
  const zoom = camera.zoom ?? 1;
  const panX = camera.panX ?? 0;
  const panY = camera.panY ?? 0;
  const stW = stageSize?.width ?? pitchRect.x * 2 + pitchRect.width;
  const stH = stageSize?.height ?? pitchRect.y * 2 + pitchRect.height;

  const projected = projectPitchToScreen(
    { x: worldPos.x / 100, y: worldPos.y / 100 },
    { tilt, yaw, zoom, panX, panY, stageWidth: stW, stageHeight: stH, pitchRect },
  );
  // tilt > 0 時は画面上部ほど縮小、下部ほど拡大する簡易遠近スケールを付与
  const normY = worldPos.y / 100;
  const tiltRad = (tilt * Math.PI) / 180;
  const depthFactor = tilt === 0 ? 1 : 1 + (normY - 0.5) * Math.sin(tiltRad) * 0.35;
  return {
    x: projected.x,
    y: projected.y,
    perspectiveScale: Math.max(0.2, zoom * depthFactor),
  };
}

export function screenToWorld(
  screenPos: Point2D,
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
  stageSize?: { width: number; height: number },
): Point2D | null {
  const tilt = camera.tilt ?? 0;
  const yaw = camera.yaw ?? 0;
  const zoom = camera.zoom ?? 1;
  const panX = camera.panX ?? 0;
  const panY = camera.panY ?? 0;
  const stW = stageSize?.width ?? pitchRect.x * 2 + pitchRect.width;
  const stH = stageSize?.height ?? pitchRect.y * 2 + pitchRect.height;

  const unprojected = unprojectScreenToPitch(screenPos, {
    tilt,
    yaw,
    zoom,
    panX,
    panY,
    stageWidth: stW,
    stageHeight: stH,
    pitchRect,
    clamp: false,
  });
  if (!unprojected) return null;
  return { x: unprojected.x * 100, y: unprojected.y * 100 };
}

// 2. BoundaryBox の pitchRect 基準解決ヘルパー
export function resolveBoundaryBoxPixelRect(
  box: { x: number; y: number; width: number; height: number; fitTarget?: string },
  stageSize: { width: number; height: number },
  pitchRect?: { x: number; y: number; width: number; height: number },
) {
  const refRect =
    box.fitTarget === 'pitch' && pitchRect && pitchRect.width > 0 && pitchRect.height > 0
      ? pitchRect
      : { x: 0, y: 0, width: stageSize.width, height: stageSize.height };
  return {
    x: refRect.x + (box.x / 100) * refRect.width,
    y: refRect.y + (box.y / 100) * refRect.height,
    width: (box.width / 100) * refRect.width,
    height: (box.height / 100) * refRect.height,
  };
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 単一座標変換パイプライン（`CameraState`, `worldToScreen`, `screenToWorld`）とポインタ座標の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/matrix-coordinates.ts`, `src/features/tactical-unified/core/utils/canvas-coordinates.ts`, `src/features/tactical-unified/core/utils/geometry.ts`, `src/features/tactical-unified/core/index.ts`, `src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts`
- **契約 (Interface)**:
  - `matrix-coordinates.ts`: `CameraParams` に `yaw?: number` を追加し、`buildMVPMatrix` で `yaw !== 0` のときピッチ中心で Z 軸回転（`mat4.rotateZ`）を適用。`CameraState`, `DEFAULT_CAMERA_STATE`, `ScreenProjectedPoint`, `worldToScreen`, `screenToWorld` を実装・export。
  - `canvas-coordinates.ts` & `core/index.ts`: 上記5シンボルを再 export。
  - `geometry.ts`: `getPointerCoordinates(e, vRect)` の第2引数を `{ x?: number; y?: number; width: number; height: number; allowOverflow?: boolean }` に対応させ、`relX = x - (vRect.x ?? 0)`, `relY = y - (vRect.y ?? 0)` から正規化座標を算出（`allowOverflow` が `true` の場合は `[0, 100]` クランプを行わず余白座標をそのまま返す）。
- **Testing Strategy**: `src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts` で、(1) `worldToScreen` と `screenToWorld` の正逆変換一致（正面および `tilt: 30, yaw: 15` 時）、(2) ピッチ外余白座標（例: `worldPos = { x: -10, y: 110 }`）の往復変換がクランプされず保持されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/utils/matrix-coordinates.ts src/features/tactical-unified/core/utils/canvas-coordinates.ts src/features/tactical-unified/core/utils/geometry.ts src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts` PASS
- **Worker Handoff Log**:
  - `CameraState`, `DEFAULT_CAMERA_STATE`, `ScreenProjectedPoint`, `worldToScreen`, `screenToWorld` を `matrix-coordinates.ts` で実装し、`canvas-coordinates.ts` および `core/index.ts` から export。`getPointerCoordinates` は `vRect.x/y` オフセットおよび `allowOverflow`（クランプ解除）に対応。


### Phase 2: アスペクト比デフォルト（`4:5`）と境界線枠のホスト別初期値・`pitchRect` 基準解決の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical-unified.ts`, `src/features/tactical-unified/core/store/canvas-store.ts`, `src/features/tactical-unified/stores/project-slice.ts`, `src/features/tactical-unified/stores/slide-aspect-helpers.ts`, `src/features/tactical-unified/stores/slide-reset-helpers.ts`, `src/features/tactical-unified/core/components/BoundaryBoxOverlay.tsx`, `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx`, `src/features/tactical-unified/core/hooks/use-canvas-export.ts`, `src/features/tactical-unified/core/__tests__/canvas-store.test.ts`, `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts`
- **契約 (Interface)**:
  - `src/lib/types/tactical-unified.ts`: `getDefaultBoundaryBoxForAspect` で `'1:1'` を含む全比率のデフォルトを `fitTarget: 'pitch', visible: false` に統一（`createNewProject` の初期スライド境界線も `DEFAULT_BOUNDARY_BOX_4_5` に統一）。
  - `canvas-store.ts`: `aspectRatio` 初期値を `config.aspectRatio ?? '4:5'` に変更。`boundaryBox` 初期値を `config.defaultBoundaryBox ?? (config.mode === 'full-tactical' ? { ...DEFAULT_BOUNDARY_BOX, visible: false, fitTarget: 'pitch' } : { ...DEFAULT_BOUNDARY_BOX_FULL, visible: false, fitTarget: 'canvas' })` に設定。
  - `project-slice.ts` & `slide-aspect-helpers.ts`: アスペクト比変更時の `boundaryBox` を `getDefaultBoundaryBoxForAspect(ratio)`（`fitTarget: 'pitch', visible: false`）に統一。
  - `slide-reset-helpers.ts`: `resetSlideKeepSquadData` の `boundaryBox` を `getDefaultBoundaryBoxForAspect(aspectRatio)`（`visible: false, fitTarget: 'pitch'`）に修正。
  - `BoundaryBoxOverlay.tsx` & `use-canvas-export.ts`: `pitchRect?: { x: number; y: number; width: number; height: number }` を受け取り、`fitTarget === 'pitch'` かつ `pitchRect` 指定時は `pitchRect` 基準でピクセル矩形を解決する `resolveBoundaryBoxPixelRect` を導入・適用。
- **Testing Strategy**: `canvas-store.test.ts` で `full-tactical` 時 `fitTarget: 'pitch', visible: false, aspectRatio: '4:5'`、`screenshot-edit` 時 `fitTarget: 'canvas', visible: false` となることを検証。`tactical-unified-store.test.ts` で比率変更・リセット時の `fitTarget: 'pitch', visible: false` を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/__tests__/canvas-store.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/types/tactical-unified.ts src/features/tactical-unified/core/store/canvas-store.ts src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/slide-aspect-helpers.ts src/features/tactical-unified/stores/slide-reset-helpers.ts src/features/tactical-unified/core/components/BoundaryBoxOverlay.tsx src/features/tactical-unified/core/components/BoundaryBoxHud.tsx src/features/tactical-unified/core/hooks/use-canvas-export.ts src/features/tactical-unified/core/__tests__/canvas-store.test.ts src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` PASS
- **Worker Handoff Log**:
  - `createCanvasStore` のアスペクト比初期値を `4:5`、`full-tactical` / `tactical-board` の境界線を `fitTarget: 'pitch', visible: false`、比率変更・リセット時も維持。`resolveBoundaryBoxPixelRect` を `geometry.ts` / `core/index.ts` から export し `BoundaryBoxOverlay` と `useCanvasExport` に適用。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 01:06
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  単一座標変換パイプライン（`worldToScreen` / `screenToWorld`, `yaw` 回転、余白領域の非クランプ往復変換）およびホスト別の `boundaryBox` 初期値・`resolveBoundaryBoxPixelRect` による `pitchRect` 基準解決が純粋関数としてクリーンに実装されている。`slide-transition-helpers.ts` への分離により SLAP とファイルサイズ上限も適切に維持されており LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
