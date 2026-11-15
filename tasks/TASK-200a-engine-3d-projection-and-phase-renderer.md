# TASK-200a: Domain 3D 投影統合 & 単一フレームパイプライン (`renderTacticalPhaseFrameToCanvas`) 完成

- **Status**: `DONE`
- **Assign**: `worker`
- **Commit**: `refactor(tactical-engine,export): unify 3D yaw/tilt projection and boundary crop inside tactical-phase-frame-renderer`
- **Execution Waves**:
  - Wave 1 (直列): Phase 1 (`projection-3d.ts` + `[ADD] director-camera.ts` + `timeline-evaluator.ts` + `timeline-evaluator.test.ts`)
  - Wave 2 (並列, Wave 1 後): Phase 2 (`slide-interpolator.ts` + `slide-entity-interpolators.ts` + `renderer-context.ts` + `pitch-markings-3d.test.ts`), Phase 3 (`tactical-phase-frame-renderer.ts` + `tactical-frame-effects.ts`), Phase 4 (`ball-renderer.ts` + `player-ring-renderer.ts` + `scene-graph-billboard-rasterizer.ts`)
- **Negative Contracts**:
  - `rg(src/lib/tactical/engine/,src/lib/tactical/export/tactical-phase-frame-renderer.ts,src/lib/tactical/export/tactical-frame-effects.ts,src/lib/tactical/export/scene-graph-billboard-rasterizer.ts,src/lib/tactical/export/renderers/renderer-context.ts,src/lib/tactical/export/renderers/ball-renderer.ts,src/lib/tactical/export/renderers/player-ring-renderer.ts): unified-interpolation|interpolation-camera|interpolation-annotation|interpolation-director|canvas-pitch-transform-helper`

---

## 1. Architectural Invariants & Design Decisions

- **Invariants (壊してはいけない前提条件)**:
  1. `src/lib/tactical/engine/**` および `src/lib/tactical/export/renderers/**` から `src/features/tactical-unified/**` への逆依存をゼロにし、純粋ドメイン計算のみで完結させる。
  2. `projection-3d.ts` は `tilt`（0〜60）だけでなく `yaw`（-45〜45 等）・`zoom`・`panX`・`panY` を含む 3D 透視投影行列（`buildExportMVPMatrix` / `projectStagePixelWithPitchTransform`）を単一実装として提供し、プレビューと動画出力の座標パリティを保証する。
  3. `renderTacticalPhaseFrameToCanvas` が `boundaryBox` クロップ（`getOffscreenCanvas` + `calculateBoundaryCrop`）、3D MVP 行列構築、ピッチ背景キャッシュ、`compileSceneGraph`、`rasterizeSceneGraphToCanvas2D` を単一経路で完遂する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `src/lib/tactical/engine/director-camera.ts`（`[ADD]`）を新設し、純粋なタイムライン時間算出（`resolvePlaybackDurationMs`, `calculateUnifiedTotalDuration`, `resolveEffectiveSlideSegments`, `SlideTimingLike`）およびディレクターカメラ補間（`hasActiveDirectorCameraTrack`, `resolveSyntheticDirectorCamera`, `isDirectorCameraMoving`, `interpolatePitchTransform`, `hasCameraDelta`, `InterpolatedPitchTransformState`, `ResolveSyntheticDirectorCameraOptions`）を集約する。
  2. `ball-renderer.ts` / `player-ring-renderer.ts` / `scene-graph-billboard-rasterizer.ts` は `unified-interpolation` の型インポートをやめ、必要な形状プロパティのみを持つ純粋インターフェース（`DomainBallState` / `PitchPlayer` / ローカル型）を受ける。
- **Consumers (同期更新対象)**:
  - `src/lib/tactical/engine/projection-3d.ts`, `timeline-evaluator.ts`, `slide-interpolator.ts`, `slide-entity-interpolators.ts`
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts`, `tactical-frame-effects.ts`, `scene-graph-billboard-rasterizer.ts`
  - `src/lib/tactical/export/renderers/renderer-context.ts`, `ball-renderer.ts`, `player-ring-renderer.ts`

---

## 2. Implementation Phases

### Phase 1: `projection-3d.ts` (yaw+tilt 完全対応) & `director-camera.ts` 新設

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/engine/projection-3d.ts` (51 lines)
  - `[ADD]` `src/lib/tactical/engine/director-camera.ts`
  - `[MODIFY]` `src/lib/tactical/engine/timeline-evaluator.ts` (281 lines)
  - `[MODIFY]` `src/lib/tactical/__tests__/timeline-evaluator.test.ts`
- **Contract**:
```ts
// src/lib/tactical/engine/projection-3d.ts
export const REFERENCE_STAGE_HEIGHT = 360;
export function buildExportMVPMatrix(
  pitchTransform: PitchTransform,
  exportWidth: number,
  exportHeight: number,
  aspectRatio?: AspectRatio,
  referenceHeight?: number,
): Float32Array; // 16要素 (mat4互換 Float32Array)
export function projectStagePixelWithPitchTransform(
  point: StagePixelPoint,
  pitchTransform: PitchTransform | null | undefined,
  viewport: StageViewport,
): { readonly x: number; readonly y: number; readonly scale: number };
```
  1. `projection-3d.ts`: `matrix-mvp-engine.ts` と同じ射影数学（`tilt`, `yaw`, `zoom`, `panX`, `panY`、`DEFAULT_FOV=60`）を純粋実装し、`projectStagePixelWithPitchTransform` が `yaw` 回転も含めて投影・深度スケールを返すようにする（`tilt===0 && yaw===0` 時は 2D アフィン計算で高速パス）。`buildExportMVPMatrix` もここで提供する。
  2. `director-camera.ts`: `interpolation-camera.ts` / `interpolation-director.ts` / `unified-interpolation.ts` の純粋タイムライン・カメラ補間関数（`InterpolatedPitchTransformState`, `EffectiveSlideSegment`, `SlideTimingLike`, `ResolveSyntheticDirectorCameraOptions`, `hasCameraDelta`, `interpolatePitchTransform`, `resolveEffectiveSlideSegments`, `calculateUnifiedTotalDuration`, `resolvePlaybackDurationMs`, `hasActiveDirectorCameraTrack`, `resolveSyntheticDirectorCamera`, `isDirectorCameraMoving`）を純粋 `DomainSlide | SlideTimingLike` 対応として実装する。
  3. `timeline-evaluator.ts`: `resolveEffectiveSlideSegments` 等の整合した時間計算が `director-camera.ts` と一貫することを保証する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/timeline-evaluator.test.ts`:
    - `projection-3d`: `yaw=75` と `yaw=90`（基準正面）および `tilt=30` 適用時に `projectStagePixelWithPitchTransform` / `buildExportMVPMatrix` の投影座標・奥行きスケールが変化し、NaN や無限大にならないこと、`panX`/`panY` が `exportHeight / 360` でスケールされることをテストする。
    - `director-camera`: `calculateUnifiedTotalDuration`・`resolvePlaybackDurationMs`・`resolveSyntheticDirectorCamera`・`isDirectorCameraMoving` の純粋 I/O テストを追加する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/projection-3d.ts src/lib/tactical/engine/director-camera.ts src/lib/tactical/engine/timeline-evaluator.ts src/lib/tactical/__tests__/timeline-evaluator.test.ts`

---

### Phase 2: `slide-interpolator`・`slide-entity-interpolators`・`renderer-context` の脱レガシー

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/engine/slide-interpolator.ts` (179 lines)
  - `[MODIFY]` `src/lib/tactical/engine/slide-entity-interpolators.ts` (221 lines)
  - `[MODIFY]` `src/lib/tactical/export/renderers/renderer-context.ts` (287 lines)
  - `[MODIFY]` `src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts` (180 lines)
- **Contract**:
  1. `slide-interpolator.ts`: `interpolatePitchTransform` のインポート元を `@/lib/tactical/unified-interpolation` から `./director-camera` へ変更する。
  2. `slide-entity-interpolators.ts`: `interpolatePolygonPoints` を `unified-interpolation` 依存なしで純粋実装（ポリゴン頂点数の均等補間）として内部化または `./director-camera` 等と切り離す。
  3. `renderer-context.ts`: `buildExportMVPMatrix` のインポート元を `@/features/tactical-unified/core/utils/canvas-pitch-transform-helper` から `@/lib/tactical/engine/projection-3d` へ変更する。
  4. `pitch-markings-3d.test.ts`: `buildExportMVPMatrix` のインポート元を `@/lib/tactical/engine/projection-3d` へ変更し既存 3 テストを維持する。
- **Concrete Test Cases**:
  - `pitch-markings-3d.test.ts` の全 3 ケース通過を確認する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/engine/slide-interpolator.ts src/lib/tactical/engine/slide-entity-interpolators.ts src/lib/tactical/export/renderers/renderer-context.ts src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts`

---

### Phase 3: `tactical-phase-frame-renderer.ts` の boundaryBox クロップ統合 & `tactical-frame-effects.ts` 純粋化

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (299 lines)
  - `[MODIFY]` `src/lib/tactical/export/tactical-frame-effects.ts` (207 lines)
- **Contract**:
```ts
// RenderTacticalPhaseFrameOptions 拡張点
export interface RenderTacticalPhaseFrameOptions {
  // 既存フィールドに加えて:
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  // mvpMatrix / precomputedFrame は持たず、内部で 3D 投影・評価を完結する
}
```
  1. `tactical-phase-frame-renderer.ts`:
     - `hasActiveDirectorCameraTrack` / `resolveSyntheticDirectorCamera` のインポート元を `@/lib/tactical/engine/director-camera` へ変更する。
     - `boundaryBox` が有効（`isBoundaryCropActive(boundaryBox)`）かつ `width` / `height` が指定された場合、`baseWidth` / `baseHeight`（未指定時は `aspectRatio` と `calculateBoundaryCrop` から逆算したカノニカルサイズ）で `getOffscreenCanvas(canonicalW, canonicalH)` へフルフレーム描画した後、`calculateBoundaryCrop` の矩形を `ctx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, width, height)` で切り出して描画する。
     - `_resetSharedOffscreenCanvas` を `./renderers/offscreen-canvas-pool` から再エクスポートする（テスト用リセット窓口の一本化）。
  2. `tactical-frame-effects.ts`:
     - `unified-interpolation`・`interpolation-annotation` 依存をすべて撤去し、`@/lib/tactical/engine/director-camera` の `resolveEffectiveSlideSegments`, `hasActiveDirectorCameraTrack`, `resolveSyntheticDirectorCamera`, `hasCameraDelta` のみを使用して `hasActiveFrameEffects` / `isPauseFrame` を実装する（`tactical-frame-renderer.ts` 専用だった旧 `computeFrameEffects` 等が不要なら整理または純粋型化）。
- **Concrete Test Cases**:
  - Phase 3 時点では型チェック・依存チェックを通し、`TASK-200e` の `scene-graph-rasterizer.test.ts` で `boundaryBox` クロップ・`yaw`/`tilt`・ポーズフレーム動作を一貫検証する。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/tactical-phase-frame-renderer.ts src/lib/tactical/export/tactical-frame-effects.ts`

---

### Phase 4: Shared Renderers (`ball-renderer`, `player-ring-renderer`, `scene-graph-billboard-rasterizer`) の脱レガシー型

- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/renderers/ball-renderer.ts` (156 lines)
  - `[MODIFY]` `src/lib/tactical/export/renderers/player-ring-renderer.ts` (96 lines)
  - `[MODIFY]` `src/lib/tactical/export/scene-graph-billboard-rasterizer.ts` (254 lines)
- **Contract**:
  1. `ball-renderer.ts`: `@/lib/tactical/unified-interpolation` からの `type { InterpolatedBallState }` インポートを削除し、必要な最小純粋インターフェース（`{ x: number; y: number; size?: number; rotation?: number; visible?: boolean; opacity?: number }`）を自前定義または共有する。
  2. `player-ring-renderer.ts` と `scene-graph-billboard-rasterizer.ts`: `@/lib/tactical/unified-interpolation` からの `type { InterpolatedPlayerState }` インポートを削除し、`PitchPlayer` / 描画必須フィールドのみを持つ純粋インターフェースへ置き換える（動作ロジックは維持）。
- **Concrete Test Cases**:
  - 既存の `scene-graph-rasterizer.test.ts` 等で `renderPlayerItem` と `renderBall` の描画結果・SVG パッチ描画が変わらないこと（`ai:check` で型チェック）。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/renderers/ball-renderer.ts src/lib/tactical/export/renderers/player-ring-renderer.ts src/lib/tactical/export/scene-graph-billboard-rasterizer.ts`
