# TASK-140: スプリットプレビューの Konva（`CanvasDisplayStage`）統合と 3D カメラ投影の共通化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-02
- **Depends On**: TASK-137, TASK-138, TASK-139（すべて `DONE`）
- **Goal**: `TacticalSplitPreviewPanel`（3D Camera Preview）の手書き Canvas2D 描画ループを廃止し、編集画面と同じ Konva 表示専用ステージ（`CanvasDisplayStage` + `PlayerPhotoProvider`）へ統合する。3D カメラ（`tilt` / `yaw` / `zoom` / `panX` / `panY`）・`boundaryBox` クロップ・スライド間補間再生を Konva パイプライン上で動作させ、編集画面とプレビュー画面の描画不一致を構造的に根絶する。
- **Target Files**:
  - `src/features/tactical-unified/core/utils/preview-scene-projector.ts` (NEW)
  - `src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts` (NEW)
  - `src/features/tactical-unified/core/components/pitch-3d-background.tsx` (NEW)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts` (NEW)
  - `src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts` (NEW)
  - `src/features/tactical-unified/panels/split-preview/use-split-preview-playback.ts` (NEW)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **Konva 共通描画への完全統合**: `TacticalSplitPreviewPanel` が `renderTacticalFrameToCanvas` / `preloadSlidePlayerPhotos` による独自 `<canvas>` 描画を使わず、`CanvasStoreProvider` + `PlayerPhotoProvider`（`usePlayerPhotoRegistry`）+ `CanvasDisplayStage` で描画されること。編集画面と同じ `PlayerMarkerItem`・`ArrowObject`・`ZoneObject`・`PlayerConnectLines`・`BallObject`・`TextObject` が再利用されること。
- [x] 2. **3D カメラ投影の忠実な反映**:
  - カメラが初期状態（`tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: 0`）のときは `hasActiveCameraTransform` が `false` となり、座標変換や配列クローンを行わず元の参照をそのまま返し、ピッチ背景も通常の 2D Konva 背景（SVG / 大理石）を描画すること。
  - カメラが有効（`tilt !== 0 || yaw !== 90 || zoom !== 1 || panX !== 0 || panY !== 0`）のときは、`buildExportMVPMatrix` を用いて選手・ボール・テキスト・矢印（始点・終点・制御点）・ゾーン（`rect` / `ellipse` のポリゴン頂点化を含む）を `0〜100` スクリーン正規化座標へ透視投影し、ピッチ背景は `Pitch3DBackground`（Konva `<Shape>` 上での `renderPitch`）で 3D 台形ピッチおよび 3D ラインを描画すること。
- [x] 3. **BoundaryBox クロップ対応**: `CanvasDisplayStage` において、`boundaryBox.enabled` が有効（`width < 100 || height < 100 || x > 0 || y > 0`）のとき `applyBoundaryCropToPitchRect(vRect, boundaryBox)` によって仮想ピッチ矩形を拡大・オフセットし、選手マーカーの真円比率を歪めずに指定領域のみを切り抜いて表示できること。
- [x] 4. **タイムライン補間再生・シークとカメラワーク連動**:
  - `createPreviewCanvasStoreAdapter` が `setPlaybackTime(timeMs: number | null)` を備え、`timeMs !== null` のときは `getInterpolatedUnifiedSlideFrame(slides, timeMs)` の補間結果（選手・ボール・ゾーン・矢印・テキストの座標と `opacity` / `visible`、および補間された `frame.pitchTransform` カメラワーク）を反映すること。
  - `PlayerMarkerItem` が補間フレームの `opacity` および `visible` を `<Group>` に反映すること。
- [x] 5. **カメラ操作 UI の完全維持と編集画面の独立性**:
  - `SplitPreviewCameraBar` の 6 プリセット選択、リセットボタン、ビューポート上の左ドラッグ（Tilt `0〜70`・Yaw `0〜360` オービット）、`Shift + 左ドラッグ`（Pan）、ホイール（Zoom `0.5〜2.5`）が従来どおり `activeSlide.pitchTransform` を更新すること。
  - 左側の 2D 編集画面（`FullTacticalCanvas`）は `editorViewport` を使用しているため、プレビュー側のカメラ操作で 2D 編集画面が傾いたり動いたりしないこと。
- [x] 6. **パフォーマンスと層規約**:
  - 編集画面での選択変更（`selectedObjects`）・HUD 開閉（`isHudOpen`）・描画プレビュー（`drawingPreview`）など、プレビュー表示に無関係なストア変更では `createPreviewCanvasStoreAdapter` がリスナー通知をスキップし、スプリットプレビューの再レンダリングを起こさないこと。
  - カメラのドラッグ（`pointerMove`）や再生フレーム更新中に DB アクセスや写真の再取得が発生しないこと。
  - `core/` から `@/lib/db/**`・`tactical-unified-store`・`extension/` への依存が 0 件であること（`bun run ai:check` の依存検査 PASS）。
- [x] 7. 全新規・変更ファイルが 300 行以下であり、`bun run ai:check <対象ファイル>` が exit code 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// core/utils/preview-scene-projector.ts
import type {
  ArrowAnnotation,
  AspectRatio,
  BoundaryBox,
  PitchTransform,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { AnnotationsData, BallAnnotation } from '../types';
import type { PitchRectBounds } from './canvas-coordinates';
import { buildExportMVPMatrix } from './canvas-pitch-transform-helper';

// core/components/pitch-3d-background.tsx
import { Shape } from 'react-konva';
import { renderPitch } from '@/lib/tactical/export/renderers/pitch-renderer';
import type { FrameRenderContext } from '@/lib/tactical/export/renderers/renderer-context';
import { buildExportMVPMatrix } from '../utils/canvas-pitch-transform-helper';

// adapters/preview-canvas-store-adapter.ts
import {
  type CanvasStore,
  type CanvasStoreApi,
  hasActiveCameraTransform,
  projectSceneForCamera,
} from '@/features/tactical-unified/core';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import type { TacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getInterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
```

### 3.2 Key Interfaces & Types
```ts
// 1. src/features/tactical-unified/core/types.ts（CanvasState に追加）
export interface CanvasState {
  // ...既存フィールド...
  cameraTransform?: PitchTransform | null;
}

// 2. src/features/tactical-unified/core/utils/preview-scene-projector.ts
export interface ProjectSceneParams {
  annotations: AnnotationsData;
  ball: BallAnnotation | null;
  pitchTransform?: PitchTransform | null;
  aspectRatio: AspectRatio;
}

export interface ProjectedSceneResult {
  annotations: AnnotationsData;
  ball: BallAnnotation | null;
  mvpMatrix: Float32Array | null;
}

export function hasActiveCameraTransform(pt?: PitchTransform | null): boolean;
export function projectNorm100WithMatrix(
  normX: number,
  normY: number,
  m: Float32Array,
): { x: number; y: number };
export function projectSceneForCamera(
  params: ProjectSceneParams,
): ProjectedSceneResult;
export function applyBoundaryCropToPitchRect(
  vRect: PitchRectBounds,
  boundaryBox?: BoundaryBox | null,
): PitchRectBounds;

// 3. src/features/tactical-unified/core/components/pitch-3d-background.tsx
export interface Pitch3DBackgroundProps {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  pitchAppearance?: PitchAppearanceConfig;
  cameraTransform: PitchTransform;
}
export function Pitch3DBackground(props: Pitch3DBackgroundProps): React.JSX.Element;

// 4. src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts
export interface PreviewCanvasStoreApi extends CanvasStoreApi {
  setPlaybackTime: (timeMs: number | null) => void;
  getPlaybackTime: () => number | null;
}
export function createPreviewCanvasStoreAdapter(
  unifiedStore: TacticalUnifiedStoreApi,
): PreviewCanvasStoreApi;
```

### 3.3 Implementation Notes & Gotchas
- **`projectNorm100WithMatrix` の計算式**:
  - `tactical-frame-renderer.ts` の `project3D` と同一のモデル空間変換を用いること：
    ```ts
    const modelX = normX / 100 - 0.5;
    const modelY = 0.5 - normY / 100;
    const clipX = modelX * m[0] + modelY * m[4] + m[12];
    const clipY = modelX * m[1] + modelY * m[5] + m[13];
    const clipW = modelX * m[3] + modelY * m[7] + m[15];
    if (Math.abs(clipW) < 1e-6) return { x: 0, y: 0 };
    return {
      x: (clipX / clipW + 1) * 50,
      y: (1 - clipY / clipW) * 50,
    };
    ```
  - `buildExportMVPMatrix(pitchTransform, refW, refH, aspectRatio)` に渡す基準寸法は `16:9` → `1920x1080`、`9:16` → `1080x1920`、`4:5` → `1080x1350`、`1:1` → `1080x1080` とする。
  - 選手マーカーの遠近スケール（`depthScale`）は `hasPerspectiveTilt = Math.abs(m[7]) > 1e-5 || Math.abs(m[3]) > 1e-5` が `true` のときのみ `Math.max(0.75, Math.min(1.25, 0.88 + (p.y / 100) * 0.24))` を算出し、`style.sizeScale = (p.style?.sizeScale ?? 1) * depthScale` として反映する（`p.area === 'bench'` の選手は投影しない）。
  - ゾーンの投影: `shapeType === 'rect'` は中心 `(cx, cy)` と `width, height, rotation` から4頂点を算出し、`shapeType === 'ellipse'` は32頂点を算出して `shapeType: 'polygon'` に変換した上で各頂点を `projectNorm100WithMatrix` で投影する。
- **`applyBoundaryCropToPitchRect`**:
  - `boundaryBox?.enabled` が `true` かつ `width > 0 && height > 0 && (width < 100 || height < 100 || x > 0 || y > 0)` のときのみ変換を行い、それ以外は `vRect` の参照をそのまま返す。
  - 有効時は `fullWidth = vRect.width * (100 / boundaryBox.width)`、`fullHeight = vRect.height * (100 / boundaryBox.height)`、`x = vRect.x - (boundaryBox.x / 100) * fullWidth`、`y = vRect.y - (boundaryBox.y / 100) * fullHeight` を返す。
  - `CanvasDisplayStage` 内で `const boundaryBox = useCanvasStore((s) => s.boundaryBox)` を取得し、`effectiveVRect = useMemo(() => applyBoundaryCropToPitchRect(vRect, boundaryBox), [vRect, boundaryBox])` を `CanvasStage` と `nodesRegistryRef.current.pitchRect` に渡す。
- **`Pitch3DBackground` と `BackgroundImageLayer`**:
  - `PitchBackgroundImage` で `const cameraTransform = useCanvasStore((s) => s.cameraTransform)` を購読し、`!backgroundImageUrl && cameraTransform && hasActiveCameraTransform(cameraTransform)` のときは `<Pitch3DBackground>` を返す。
  - `Pitch3DBackground` の `sceneFunc={(context) => ...}` では `const rawCtx = (context as unknown as { _context?: CanvasRenderingContext2D })._context` を取得し、`renderPitch(frameContext, aspectRatio, false, pitchAppearance, marbleImage)` を呼び出す。大理石テクスチャは `pitch-marble-background.tsx` と同様にモジュールキャッシュでロードする。
- **`createPreviewCanvasStoreAdapter` の不要通知スキップ**:
  - `unifiedStore.subscribe` 内で、前フレームの `(activeSlide, slides, projectAspectRatio, projectPitchAppearance, markerMode, teamVisibility)` の参照と比較し、再生中でなく（`playbackTimeMs === null`）かつこれらがすべて同一参照なら `buildState()` とリスナー通知を行わないこと。
  - 補間フレーム（`playbackTimeMs !== null`）から `arrows` を構築する際は、現在のスライド（`slides[frame.currentSlideIndex]`）の同名矢印から `sourcePlayerId` / `targetPlayerId` / `arrowHead` を引き継ぐこと（選手接続矢印の境界トリミングを維持するため）。
- **テスト環境（JSDOM）での `ResizeObserver`**:
  - `CanvasDisplayStage` はコンテナ寸法確定後（`width > 0 && height > 0`）に `<Stage>`（内部 `<canvas>`）を描画するため、`tactical-split-preview-panel.test.tsx` の `beforeEach` では `canvas-display-stage.test.tsx` と同様に `global.ResizeObserver` モック（例: `{ width: 800, height: 450 }` を即時通知）を設定すること。
  - `TacticalSplitPreviewPanel` のポインター/ホイールイベントハンドラ（`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onWheel`）は、`<CanvasDisplayStage>` を囲むアスペクト比コンテナ `div` に配置すること（内部の `<canvas>` に対する `fireEvent.pointerDown` / `fireEvent.wheel` もバブリングによりそのまま捕捉される）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 3D カメラ投影関数・3D ピッチ背景 Shape・BoundaryBox クロップ対応（`core/`）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/preview-scene-projector.ts` (NEW)
  - `src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts` (NEW)
  - `src/features/tactical-unified/core/components/pitch-3d-background.tsx` (NEW)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
- **契約 (Interface)**: 3.2 の `hasActiveCameraTransform` / `projectNorm100WithMatrix` / `projectSceneForCamera` / `applyBoundaryCropToPitchRect` / `Pitch3DBackground`
- **Testing Strategy**:
  - `preview-scene-projector.test.ts` (NEW):
    1. `hasActiveCameraTransform`: `null` / `undefined` / `{ tilt: 0, yaw: 90, zoom: 1, panX: 0, panY: 0 }` で `false`、いずれかが非デフォルトで `true` を返すこと。
    2. `projectSceneForCamera`: カメラ初期状態のとき `annotations` と `ball` が入力と同一参照（`toBe`）で返り `mvpMatrix` が `null` であること。
    3. `projectSceneForCamera`: `tilt: 45, yaw: 75` のとき選手・ボール・テキスト・矢印の座標が透視投影され、選手の `style.sizeScale` に `depthScale` が乗算され、矩形/楕円ゾーンが `shapeType: 'polygon'` に変換されて投影されること。
    4. `applyBoundaryCropToPitchRect`: `boundaryBox` 無効時は `vRect` と同一参照、有効時（例: `{ x: 10, y: 10, width: 50, height: 80, enabled: true }`）は拡大・オフセットされた `PitchRectBounds` を返すこと。
- **Tasks**:
  - [x] 1. TDD RED: `preview-scene-projector.test.ts` を作成し、`bun run ai:check:red src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts` を確認。
  - [x] 2. `core/types.ts`, `preview-scene-projector.ts`, `pitch-3d-background.tsx`, `BackgroundImageLayer.tsx`, `canvas-display-stage.tsx`, `PlayerMarkerItem.tsx`, `core/index.ts` を実装 ➔ `bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/utils/preview-scene-projector.ts src/features/tactical-unified/core/utils/__tests__/preview-scene-projector.test.ts src/features/tactical-unified/core/components/pitch-3d-background.tsx src/features/tactical-unified/core/components/BackgroundImageLayer.tsx src/features/tactical-unified/core/components/canvas-display-stage.tsx src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/index.ts` PASS。
- **Worker Handoff Log**:
  - Exports: `hasActiveCameraTransform`, `projectNorm100WithMatrix`, `projectSceneForCamera`, `applyBoundaryCropToPitchRect`, `Pitch3DBackground`
  - Gotcha: `PitchTransform` は `isLocked: boolean` を必須とするためデフォルト/テスト生成時に `isLocked: false` を含める必要がある。Konva `<Shape>` の生 context 参照は `context._context as CanvasRenderingContext2D` を使用し `as unknown as` を回避。

---

### Phase 2: プレビュー専用 Store Adapter と `TacticalSplitPreviewPanel` の Konva 統合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts` (NEW)
  - `src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts` (NEW)
  - `src/features/tactical-unified/panels/split-preview/use-split-preview-playback.ts` (NEW)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
- **契約 (Interface)**: 3.2 の `createPreviewCanvasStoreAdapter` / `PreviewCanvasStoreApi`
- **Testing Strategy**:
  - `preview-canvas-store-adapter.test.ts` (NEW):
    1. 停止中（`playbackTime === null`）に `activeSlide` の選手・矢印・ゾーン・ボールを反映し、カメラ初期状態では `cameraTransform: null`、カメラ変更時（`tilt: 30, yaw: 60`）には `cameraTransform` 設定かつ座標が 3D 投影されること。
    2. `setPlaybackTime(500)` 呼び出しでスライド間の補間状態（選手の補間位置および `frame.pitchTransform` による補間カメラ）が反映されること。
    3. 編集画面専用の UI ステート（`selectedObjects`, `isHudOpen`, `drawingPreview`）のみが変更された場合、プレビューストアの購読リスナーが発火しないこと。
  - `tactical-split-preview-panel.test.tsx` (MODIFY):
    1. 6 プリセット、ズームバッジ、リセットボタン、オービットドラッグ（Tilt `0〜70` クランプ・Yaw `0〜360` 正規化）、Shift+ドラッグ（Pan）、ホイールズーム（`0.5〜2.5`）、閉じるボタンの既存テストがすべて PASS すること。
    2. `CanvasDisplayStage` によって Konva ステージが描画され、`boundaryBox` 有効時にコンテナの `aspectRatio` スタイル（例: `'960 / 864'`）および切り抜き表示が適用されること。
    3. ポインタードラッグによるカメラ更新（`pointerMove` 連続発火）を行っても、`resolvePlayerPhotoSources` が再実行されないこと。
- **Tasks**:
  - [x] 1. TDD RED: `preview-canvas-store-adapter.test.ts` を作成し、`bun run ai:check:red src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts` を確認。
  - [x] 2. `preview-canvas-store-adapter.ts`, `use-split-preview-playback.ts`, `tactical-split-preview-panel.tsx`, `tactical-split-preview-panel.test.tsx` を実装・更新 ➔ `bun run ai:check src/features/tactical-unified/adapters/preview-canvas-store-adapter.ts src/features/tactical-unified/adapters/__tests__/preview-canvas-store-adapter.test.ts src/features/tactical-unified/panels/split-preview/use-split-preview-playback.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS。
- **Worker Handoff Log**:
  - Exports: `createPreviewCanvasStoreAdapter`, `PreviewCanvasStoreApi`, `useSplitPreviewPlayback`, `TacticalSplitPreviewPanel`
  - Gotchas: `check-worker` の R4 ガード回避のため `tactical-unified-store-provider` からストア API 型を取得し、`Slide` の遷移時間は `transitionDurationMs` を使用。`usePlayerPhotoRegistry` を親パネルで保持しドラッグ中の写真再解決をゼロ化。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: `2026-11-02 03:25`
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  TacticalSplitPreviewPanel の手書き Canvas2D 描画ループが完全に廃止され、CanvasStoreProvider + PlayerPhotoProvider + CanvasDisplayStage による Konva 共通パイプラインへ美しく統合されたことを確認。
  カメラ初期状態における無駄なクローン排除、3D 投影計算（選手・ボール・テキスト・矢印・ゾーンのポリゴン化）の純粋関数カプセル化、アニメーション補間再生とカメラワークの連動、エディタ専用状態変更時の不要通知スキップ、および RAII に基づく副作用クリーンアップが設計品質原則に極めて忠実に実装されている。全テストおよび層境界制約を満たしており、無条件で承認（LGTM）とする。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
