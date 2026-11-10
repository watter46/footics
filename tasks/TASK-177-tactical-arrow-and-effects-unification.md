# TASK-177: 戦術ボード・プレビュー・動画出力のエフェクト完全一元化＆矢印描画・カクつき抜本修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-10
- **Target Files**:
  - `src/lib/tactical/effect-geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts` (MODIFY)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-effects.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-timeline.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-ripple-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-trajectory-updater.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **波線矢印トリミング＆0ms非表示の修正 (`effect-geometry.ts`, `wavy-arrow-math.ts`)**: `computeArrowEffectState` で `progress <= 0` の場合は `visible: false` を返し 0ms 時点で矢尻だけが出現しないこと。`trimRenderPoints` で `isWavy === true` の際、`resultPoints[resultPoints.length - 2]` を破壊的に上書きせず、`lastPt` の直前に `mainAngle` 方向の微小ガイド点（距離 `0.5`）を `splice` 挿入して始点 `p0` と既存の波頂点を完全保持すること。`getWavyPoints` でも末尾の直前に `mainAngle` 方向の微小ガイド点を含め、静止時・再生時・ドラッグ時の矢尻角度を完全一致させること。
- [x] 2. **矢印エフェクト補間引き継ぎ＆単一スライド再生時間解決 (`interpolation-annotation.ts`, `unified-interpolation.ts`)**: `InterpolatedArrowState` に `effect?: ArrowEffectConfig` を追加し、`interpolateArrow` で `(ease < 1 ? aA.effect : aB.effect) ?? aB.effect ?? aA.effect` を引き継ぐこと。`unified-interpolation.ts` に `resolvePlaybackDurationMs(slides: Slide[]): number` を新設し、`slides.length === 1` のときは `Math.max(1000, ((slides[0].duration ?? 2) + (slides[0].pauseDuration ?? 1)) * 1000)`、`slides.length >= 2` のときは `calculateUnifiedTotalDuration(slides)` を返すこと（既存の `calculateUnifiedTotalDuration([slide]) === 0` は維持）。
- [x] 3. **エフェクト計算の完全一元化＆動画ポーズ区間スキップ修正 (`tactical-frame-effects.ts`, `tactical-frame-renderer.ts`, `arrow-renderer.ts`, `video-mediabunny-export.ts`)**: `computeFrameEffects` に `options?: ComputeFrameEffectsOptions`（`applyEffects?: boolean`, `effectTimeOverrideMs?: number`）を追加し、`effectZones` も返却するよう拡張すること。`hasActiveFrameEffects(slides: Slide[]): boolean` を新設し、選手波紋・選手軌跡・矢印エフェクト・ゾーンエフェクトのいずれかが存在する場合は `isPauseFrame` および `video-mediabunny-export.ts` のポーズ区間フレームスキップを無効化すること。`arrow-renderer.ts` で `a.progress !== undefined && a.progress <= 0` の場合は描画をスキップすること。
- [x] 4. **ボード再生中のカクつき根絶＆1シーン再生対応 (`tactical-animation-canvas.ts`, `use-tactical-animation.ts`, `tactical-timeline.ts`, `playback-controls.tsx`)**: `renderFrameToCanvas` 内の `isPlaying` 中の `setActiveSlide` 呼び出しを削除し、再生中の React 再レンダリング競合を根絶すること。また `tactical-animation-canvas.ts` の独自 `segments` エフェクト計算ループを削除し `computeFrameEffects(..., { applyEffects: isPlaying })` に一元化すること。`tactical-timeline.ts`、`use-tactical-animation.ts`、`playback-controls.tsx` で `resolvePlaybackDurationMs(slides)` を使用し、1シーンのみでも再生可能にすること。
- [x] 5. **Konva 矢印境界オフセット・ドラッグ整合・WeakMap キャッシュ最適化 (`animation-node-updater.ts`, `animation-ripple-updater.ts`, `animation-trajectory-updater.ts`, `arrow-line-node.tsx`)**: `batchDrawLayers` から非同期時の `registry.stage?.batchDraw()` を削除し、`playerLayer`, `ballLayer`, `annotationLayer` のみ `batchDraw()` すること。`updateArrowNodes` に `players` を渡して `computeArrowRenderPoints` と `computeArrowDimensions`（`pointerLength`, `pointerWidth`, `dotRadius`）を適用し、`!isPlaying` 復元時にハンドル位置も同期すること。`animation-ripple-updater.ts` と `animation-trajectory-updater.ts` で `WeakMap` により子ノード参照をキャッシュし毎フレームの `.find()` / `.findOne()` を排除すること。`arrow-line-node.tsx` の本体ドラッグ完了時（`onDragEnd`）に `targetPlayerId: undefined` もクリアしハンドル座標を同期すること。
- [x] 6. **レイアウト・プレビュー静止中常時エフェクト＆静止画出力 `applyEffects: false` 対応 (`use-export-preview-animation.ts`, `scene-canvas-thumbnail.tsx`, `konva-slide-export.ts`, `top-bar.tsx`)**: レイアウト画面・エクスポートモーダルプレビュー・iOSプレビューの静止中（`!effectiveIsPlaying`）でも、`hasActiveFrameEffects(slides)` が `true` の場合はシーンの `timeMs` を固定したまま `effectTimeMs` を `requestAnimationFrame` で回してエフェクトを常時表示し続けること。サムネイル（`scene-canvas-thumbnail.tsx`）および PNG 静止画出力（`konva-slide-export.ts`, `top-bar.tsx`）では `applyEffects: false` を渡して伸長矢印が 0% で消えないようにすること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一エフェクト・フレーム計算源の原則 (Single Source of Truth for Frame & Effects)**: スライド区間（`segments`）からの `timeInSlideMs` 算出と、矢印・ゾーン・選手波紋のエフェクト状態解決は `src/lib/tactical/export/tactical-frame-effects.ts` の `computeFrameEffects` **1箇所のみ** で行うこと。Konva 側（`tactical-animation-canvas.ts`）と Canvas 2D 側（`tactical-frame-renderer.ts`）で別々に `segments` ループを持つと、ポーズ突入時や単一スライド時のエフェクト挙動が乖離するため。
  2. **Konva 再生中の React 再レンダリング・Zustand スライド切替ゼロの原則**: ボード画面のアニメーション再生ループ（`renderFrameToCanvas` で `synchronous === false` / `isPlaying === true`）実行中は、絶対に `setActiveSlide` を呼んではならない。タイムライン UI のアクティブ枠表示は `setPlaybackIndices(slideIndex, transitionIndex)` のみで更新し、再生が一時停止・停止・完了した時点でのみ `setActiveSlide` を同期すること。再生中に `activeSlideId` を変更すると React がボード全体を再レンダリングし、静止 props で Konva ノードの命令的アニメーション状態（`points`, `opacity`, `dashOffset`）を上書き破壊して激しいカクつきとチラつきを引き起こすため。
  3. **矢印幾何計算の完全統一**: 基準幅 `1200px` スケール（`computeArrowDimensions`）、選手マーカー境界オフセット（`computeArrowRenderPoints`）、ドット終端オフセット（`applyDotOffsets`）、波線・ベジェ点列トリミング（`trimRenderPoints`）は、静止 Konva・再生中 Konva（`updateArrowNodes`）・Canvas 2D（`arrow-renderer.ts`）のすべてで同一関数・同一スケール規則を通すこと。
  4. **4層コンポーネントモデルと Store Provider 契約の遵守**: Level 2/3 コンポーネント（`PlaybackControls`, `TopBar` 等）では必ず `useTacticalUnifiedStore`（Provider Context 経由）を使用し、副作用（`requestAnimationFrame` 等）はアンマウント時に `cancelAnimationFrame` で確実にクリーンアップ（RAII）すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` — ①ボード画面の再生・シーク描画（`computeFrameEffects` 統合・`updateArrowNodes` への `frame.players` 引き渡し）
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` — ②レイアウト画面（`TacticalSplitPreviewPanel`）、③エクスポートモーダルプレビュー（`ExportPreviewPlayer`）、④iOSエクスポートプレビューの共通アニメーションフック（静止時 `effectTimeMs` アイドルループ対応）
  - `src/lib/tactical/export/video-mediabunny-export.ts` — ⑤エクスポート動画出力（`hasActiveFrameEffects` によるポーズ区間描画継続）
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` — 左パネルのシーンサムネイル（`applyEffects: false` 指定）
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` & `src/features/tactical-unified/panels/toolbar/top-bar.tsx` — PNG静止画出力・クリップボードコピー（`applyEffects: false` 指定）

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// Core & Export Effects
import type { ArrowAnnotation, ArrowEffectConfig, MarkerEffectConfig, NormalizedPoint, Player, Slide, ZoneAnnotation, ZoneEffectConfig } from '@/lib/db/schema';
import { type ArrowEffectState, computeArrowEffectState, computeArrowFlowDashOffset, computeRippleRings, computeZonePulseOpacity, type RippleRing, trimRenderPoints } from '@/lib/tactical/effect-geometry';
import { type InterpolatedArrowState, type InterpolatedZoneState, interpolateArrow, interpolateZone } from '@/lib/tactical/interpolation-annotation';
import { calculateUnifiedTotalDuration, getInterpolatedUnifiedSlideFrame, resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';
import { type ComputeFrameEffectsOptions, computeFrameEffects, type FrameEffectsResult, hasActiveFrameEffects, isPauseFrame } from '@/lib/tactical/export/tactical-frame-effects';

// Konva Arrow Geometry
import { applyDotOffsets, computeArrowDimensions, computeArrowRenderPoints } from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import { getQuadraticBezierPoints, getWavyPoints } from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/interpolation-annotation.ts
export interface InterpolatedArrowState {
  id: string;
  arrowType: ArrowAnnotation['arrowType'];
  curveType: ArrowAnnotation['curveType'];
  points: NormalizedPoint[];
  controlPoint?: NormalizedPoint;
  color: string;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  endMarker?: ArrowAnnotation['endMarker'];
  dashArray?: number[];
  dashOffset?: number;
  arrowHead?: boolean;
  progress?: number;
  tipAngle?: number;
  effect?: ArrowEffectConfig; // 追加
}

// src/lib/tactical/export/tactical-frame-effects.ts
export interface ComputeFrameEffectsOptions {
  applyEffects?: boolean;
  effectTimeOverrideMs?: number;
}

export interface FrameEffectsResult {
  effectArrows: Record<string, InterpolatedArrowState>;
  effectZones: Record<string, InterpolatedZoneState>;
  playerRings: Record<string, RippleRing[]>;
  timeInSlideMs: number;
}

// src/lib/tactical/export/tactical-frame-renderer.ts
export interface RenderTacticalFrameOptions {
  // ...既存プロパティ
  applyEffects?: boolean;
  effectTimeMs?: number;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. 波線矢印の先端ガイド点 (effect-geometry.ts & wavy-arrow-math.ts):
// Konva.Arrow および Canvas 2D の矢尻角度は「最後の2点 (pts[n-2] -> pts[n-1]) のベクトル」で決まる。
// resultPoints[resultPoints.length - 2] を上書きすると、最初のセグメント (length === 2) で始点 p0 が消滅する。
// 必ず lastPt の直前に微小ガイド点 { x: lastPt.x - Math.cos(mainAngle) * 0.5, y: lastPt.y - Math.sin(mainAngle) * 0.5 } を
// splice(resultPoints.length - 1, 0, guidePt) で「挿入」すること（始点 p0 との距離が 0.6 を超える場合）。

// 2. left-panel.test.tsx や konva-export-helpers.test.ts の既存スパイ検証への配慮:
// renderTacticalFrameToCanvas の呼び出し側に applyEffects: false を追加する際、既存テストの expect.objectContaining({...}) を壊さないこと。

// 3. animation-node-updater.ts の updateArrowNodes シグネチャ互換性:
// export function updateArrowNodes(arrows, registry, stageWidth, stageHeight, offsetX = 0, offsetY = 0, players?: Record<string, InterpolatedPlayerState>, isPlaying = true): void
// 第7引数 players・第8引数 isPlaying をオプショナル引数として追加し、既存テストの6引数呼び出しとの後方互換性を100%保つこと。
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: コア補間・波線矢印トリミング非破壊化・単一スライド再生時間解決
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/effect-geometry.ts`, `src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts`, `src/lib/tactical/interpolation-annotation.ts`, `src/lib/tactical/unified-interpolation.ts`, `src/lib/tactical/__tests__/effect-geometry.test.ts`, `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/effect-geometry.ts
  // (a) computeArrowEffectState(timeInSlideMs: number, config?: ArrowEffectConfig): ArrowEffectState
  //   - type === 'grow' (または grow-fade) にて:
  //     elapsed <= 0 のとき: return { progress: 0, opacity: 1, visible: false, dashOffset: 0 }; (※0ms時点で矢尻が出現するのを防ぐため visible: false とする)
  //     progress <= 0 のときも visible: false とする。
  // (b) trimRenderPoints(points: NormalizedPoint[], progress: number, isWavy = false): TrimmedPointsResult
  //   - mainAngle = Math.atan2(lastOverall.y - firstOverall.y, lastOverall.x - firstOverall.x)
  //   - progress <= 0 のとき:
  //     const baseAngle = isWavy || points.length < 2 ? mainAngle : Math.atan2(points[1].y - p0.y, points[1].x - p0.x);
  //     const epsPt = { x: p0.x + Math.cos(baseAngle) * 0.001, y: p0.y + Math.sin(baseAngle) * 0.001 };
  //     return { trimmedPoints: [p0, epsPt], tipAngle: baseAngle };
  //   - セグメント走査中および末尾フォールバックでの isWavy === true 先端角度補正:
  //     resultPoints[resultPoints.length - 2] を上書きする既存コードを削除し、代わりに:
  //     const lastPt = resultPoints[resultPoints.length - 1];
  //     const distFromStart = Math.hypot(lastPt.x - p0.x, lastPt.y - p0.y);
  //     if (distFromStart > 0.001) {
  //       const stepBack = Math.min(0.5, distFromStart * 0.5);
  //       const guidePt = { x: lastPt.x - Math.cos(mainAngle) * stepBack, y: lastPt.y - Math.sin(mainAngle) * stepBack };
  //       resultPoints.splice(resultPoints.length - 1, 0, guidePt);
  //     }
  //     tipAngle = mainAngle;

  // 2. src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts
  // getWavyPoints(startX, startY, endX, endY, wavelength = 24, amplitude = 7): number[]
  //   - ループで各サンプル点 (i = 0 .. steps) を push した際、最後の点 (i === steps, すなわち endX, endY) を追加する直前に、
  //     dist > 1 の場合はメイン軸方向 ux = dx / dist, uy = dy / dist に沿った微小ガイド点 (endX - ux * 0.5, endY - uy * 0.5) を挿入し、
  //     静止時の Konva.Arrow の先端矢尻も常にメイン軸方向 (atan2(dy, dx)) を向くようにする。

  // 3. src/lib/tactical/interpolation-annotation.ts
  //   - InterpolatedArrowState に effect?: ArrowEffectConfig を追加。
  //   - interpolateArrow 内の返却オブジェクトに以下を追加:
  //     effect: (ease < 1 ? aA.effect : aB.effect) ?? aB.effect ?? aA.effect,

  // 4. src/lib/tactical/unified-interpolation.ts
  //   - 新規関数を export:
  //     export function resolvePlaybackDurationMs(slides: Slide[]): number {
  //       if (!slides || slides.length === 0) return 0;
  //       if (slides.length === 1) {
  //         const s = slides[0];
  //         return Math.max(1000, ((s.duration ?? 2) + (s.pauseDuration ?? 1)) * 1000);
  //       }
  //       return calculateUnifiedTotalDuration(slides);
  //     }
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/effect-geometry.test.ts`:
    - `computeArrowEffectState(0, { type: 'grow', duration: 0.8, delay: 0 })` ➔ `{ progress: 0, opacity: 1, visible: false, dashOffset: 0 }`（既存テストで `visible: true` を期待している箇所があれば `visible: false` に更新）。
    - `computeArrowEffectState(100, { type: 'grow', duration: 0.8, delay: 0.3 })`（delay 待機中）➔ `progress === 0`, `visible === false`。
    - 波線 `pts = [{x:0, y:0}, {x:10, y:5}, {x:20, y:-5}, {x:30, y:0}]` に対して `trimRenderPoints(pts, 0.05, true)` を実行したとき、`trimmedPoints[0]` が `{ x: 0, y: 0 }`（始点が消滅しないこと）、`trimmedPoints.length >= 3`、`tipAngle` が `0`（±0.001）であること。
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`:
    - `resolvePlaybackDurationMs([])` ➔ `0`
    - `resolvePlaybackDurationMs([{ ...slide, duration: 2, pauseDuration: 1 }])` ➔ `3000`
    - `calculateUnifiedTotalDuration([{ ...slide, duration: 2, pauseDuration: 1 }])` ➔ `0`（既存契約維持）
    - `interpolateArrow` で `arrowA.effect = { type: 'grow', duration: 0.8 }` が `InterpolatedArrowState.effect` に保持されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/effect-geometry.test.ts` ➔ Phase 1 の 4 ファイル実装 ➔ `bun run ai:check src/lib/tactical/effect-geometry.ts src/features/tactical-unified/core/components/annotations/wavy-arrow-math.ts src/lib/tactical/interpolation-annotation.ts src/lib/tactical/unified-interpolation.ts src/lib/tactical/__tests__/effect-geometry.test.ts src/lib/tactical/__tests__/unified-interpolation.test.ts` PASS
- **Worker Handoff Log**:
  - `resolvePlaybackDurationMs(slides)` を export（1シーン時は duration/pauseDuration または transitionDurationMs/pauseMs を解決し 1000ms 以上保証）。
  - `InterpolatedArrowState.effect?: ArrowEffectConfig` を追加し `interpolateArrow` で引き継ぎ。`trimRenderPoints` と `getWavyPoints` でガイド点挿入により波線始点 p0 破壊を防止。

---

### Phase 2: 単一エフェクト計算源・Canvas 2D レンダラー・動画エクスポートポーズ判定統合
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/tactical-frame-effects.ts`, `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/renderers/arrow-renderer.ts`, `src/lib/tactical/export/video-mediabunny-export.ts`, `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`, `src/features/tactical-unified/__tests__/video-export.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/export/tactical-frame-effects.ts
  export interface ComputeFrameEffectsOptions {
    applyEffects?: boolean;
    effectTimeOverrideMs?: number;
    zones?: Record<string, InterpolatedZoneState>;
  }
  export interface FrameEffectsResult {
    effectArrows: Record<string, InterpolatedArrowState>;
    effectZones: Record<string, InterpolatedZoneState>;
    playerRings: Record<string, RippleRing[]>;
    timeInSlideMs: number;
  }
  // (a) hasActiveFrameEffects(slides: Slide[]): boolean を新設・export:
  //   slides 内のいずれかの slide に以下が存在すれば true:
  //   - slide.players?.some(p => (p.style?.markerEffect?.type && p.style.markerEffect.type !== 'none') || p.trajectoryEffect?.enabled)
  //   - slide.arrows?.some(a => a.effect?.type && a.effect.type !== 'none')
  //   - slide.zones?.some(z => z.effect?.type && z.effect.type !== 'none')
  // (b) isPauseFrame(slides, timeMs, directorCamera, directorCameraOptions): boolean
  //   - 先頭で if (hasActiveFrameEffects(slides)) return false; を判定し、矢印・ゾーン・波紋・軌跡エフェクトがある場合はポーズフレーム最適化スキップを禁止する。
  // (c) computeFrameEffects(slides, timeMs, arrows, players, nextSlideIndex, baseDim, options?: ComputeFrameEffectsOptions): FrameEffectsResult
  //   - const applyEffects = options?.applyEffects ?? true;
  //   - segments 走査で activeSlide と elapsedInSegmentMs を特定（slides.length === 1 のときは activeSlide = slides[0], elapsedInSegmentMs = Math.max(0, timeMs)）。
  //   - const timeInSlideMs = options?.effectTimeOverrideMs !== undefined ? Math.max(0, options.effectTimeOverrideMs) : elapsedInSegmentMs;
  //   - applyEffects === false の場合:
  //     - effectArrows: 全 arrow に { ...a, dashArray: baseDash, dashOffset: 0, progress: 1 } を設定。
  //     - effectZones: options?.zones の全 zone に { ...z, effect: undefined } を設定。
  //     - playerRings: {} (空オブジェクト) を返す。
  //     - timeInSlideMs: 0 を返す。
  //   - applyEffects === true の場合:
  //     - arrowCfg = activeArrow?.effect ?? aState.effect; で computeArrowEffectState(timeInSlideMs, arrowCfg) を適用。
  //     - effectZones: options?.zones が渡された場合、activeZone = activeSlide?.zones?.find(z => z.id === id) から zoneCfg = activeZone?.effect ?? zState.effect を取得し、zoneCfg && zoneCfg.type !== 'none' なら opacity: computeZonePulseOpacity(timeInSlideMs, zoneCfg, zState.opacity), effect: undefined（レンダラーでの二重適用防止）をセットして返す。

  // 2. src/lib/tactical/export/tactical-frame-renderer.ts
  //   - RenderTacticalFrameOptions に applyEffects?: boolean; effectTimeMs?: number; を追加。
  //   - computeFrameEffects(slides, timeMs, frame.arrows, frame.players, frame.nextSlideIndex, baseDim, { applyEffects: options.applyEffects, effectTimeOverrideMs: options.effectTimeMs, zones: frame.zones }) を呼び出し、
  //     renderZones には effectZones を、renderPlayers には applyEffects === false ? undefined : timeInSlideMs を渡す。

  // 3. src/lib/tactical/export/renderers/arrow-renderer.ts
  //   - if (!a.visible || a.opacity <= 0 || a.points.length < 2) continue; に加えて:
  //     if (a.progress !== undefined && a.progress <= 0) continue; を追加（0%伸長時にドットや矢尻を描かない）。

  // 4. src/lib/tactical/export/video-mediabunny-export.ts
  //   - 既存の hasDynamicMarkerEffect 変数（player.style.markerEffect のみチェックしていた箇所）を hasActiveFrameEffects(slides) の呼び出しに置き換え、矢印・ゾーン・軌跡エフェクトがある場合も pauseMs 区間で shouldSkipRender が false になるようにする。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`:
    - `effect: { type: 'grow', duration: 0.8, delay: 0.5 }` を持つ矢印に対し、`timeMs = 0, applyEffects: false` で `computeFrameEffects`（または `renderTacticalFrameToCanvas`）を呼んだとき、`effectArrows[id].progress === 1`, `visible === true` となり矢印が描画されること。
    - `timeMs = 0, effectTimeOverrideMs = 900`（delay 500ms + 400ms 経過）で `computeFrameEffects` を呼んだとき、`effectArrows[id].visible === true` かつ `0.4 < effectArrows[id].progress < 0.9` となること。
  - `src/features/tactical-unified/__tests__/video-export.test.ts`:
    - `hasActiveFrameEffects(slides)`: 選手波紋が無くても `arrow.effect = { type: 'flow', duration: 1, delay: 0 }` または `zone.effect = { type: 'pulse', speed: 1 }` がある場合に `true` を返し、`exportVideoWithMediabunny` のポーズ区間でも全フレームで `renderTacticalFrameToCanvas` が呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` ➔ Phase 2 の 4 ファイル実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-effects.ts src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/renderers/arrow-renderer.ts src/lib/tactical/export/video-mediabunny-export.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts src/features/tactical-unified/__tests__/video-export.test.ts` PASS
- **Worker Handoff Log**:
  - `hasActiveFrameEffects(slides)` を新設・export し `isPauseFrame` および `video-mediabunny-export` のポーズ区間スキップ判定を統合。
  - `computeFrameEffects` に `ComputeFrameEffectsOptions`（`applyEffects`, `effectTimeOverrideMs`, `zones`）と `effectZones` 返却を追加。`arrow-renderer` で `progress <= 0` 描画スキップを徹底。

---

### Phase 3: ボード画面アニメーション再生のカクつき根絶・単一シーン再生対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`, `src/features/tactical-unified/hooks/use-tactical-animation.ts`, `src/features/tactical-unified/hooks/tactical-timeline.ts`, `src/features/tactical-unified/panels/timeline/playback-controls.tsx`, `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`, `src/features/tactical-unified/__tests__/tactical-animation.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/hooks/tactical-animation-canvas.ts
  //   - renderFrameToCanvas 内:
  //     (a) 再生中の React 再レンダリング防止:
  //         targetSlideId が変わった際の setActiveSlide(targetSlideId) 呼び出しは `!isPlaying`（シーク・停止時）のみ実行する！
  //         `isPlaying === true` の間は lastActiveSlideIndexRef.current の更新のみ行い、`setActiveSlide` は絶対に呼ばない（タイムラインUIのハイライトは直後の setPlaybackIndices で更新されるため問題ない）。
  //     (b) 独自の segments ループ (90〜164行目付近) を削除し、Phase 2 の computeFrameEffects に完全委譲:
  //         const { effectArrows, effectZones, timeInSlideMs } = computeFrameEffects(
  //           currentSlides,
  //           timeMs,
  //           frame.arrows,
  //           frame.players,
  //           frame.nextSlideIndex,
  //           stageWidth,
  //           { applyEffects: isPlaying, zones: frame.zones },
  //         );
  //     (c) updateZoneNodes には effectZones, timeInSlideMs, isPlaying を渡し、updateArrowNodes には (effectArrows, registry, stageWidth, stageHeight, offsetX, offsetY, frame.players, isPlaying) を渡す。

  // 2. src/features/tactical-unified/hooks/tactical-timeline.ts
  //   - createTacticalTimeline(slides, onUpdate, options):
  //     const totalDurationMs = resolvePlaybackDurationMs(slides);
  //     slides.length === 0 または totalDurationMs <= 0 のときのみ早期 return tl。

  // 3. src/features/tactical-unified/hooks/use-tactical-animation.ts
  //   - totalDurationMs = resolvePlaybackDurationMs(slides);
  //   - playAnimation 内:
  //     if (currentSlides.length === 0) return; (※従来の currentSlides.length <= 1 を変更し 1シーン再生を許可)
  //     totalDur = resolvePlaybackDurationMs(currentSlides);
  //   - 再生完了時 (onComplete) および pauseAnimation 時:
  //     現在時刻 currentPlaybackTimeRef.current に対応する slideIndex を算出し、storeApi.getState().activeSlideId !== targetSlide.id なら setActiveSlide(targetSlide.id) で同期する。

  // 4. src/features/tactical-unified/panels/timeline/playback-controls.tsx
  //   - resolvePlaybackDurationMs(slides) を使用して totalDurationSec = resolvePlaybackDurationMs(slides) / 1000 を算出。
  //   - Play ボタンの disabled 条件等で slides.length === 0 のみ無効化（slides.length === 1 でも有効化）。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`:
    - `storeApi.getState().isPlaying === true` の状態で `renderFrameToCanvas(1500, ...)`（Slide 0 から Slide 1 のポーズ区間へ突入し `frame.currentSlideIndex === 1` になる時刻）を呼んだ際、`setActiveSlide` が **0回（呼ばれない）** であり、`setPlaybackIndices(1, null)` が呼ばれること。
    - `storeApi.getState().isPlaying === false`（シーク操作時）に `renderFrameToCanvas(1500, ...)` を呼んだ際は、`setActiveSlide('slide-2')` が **1回呼ばれる** こと。
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`:
    - `slides` が 1 枚のみ（`duration: 2, pauseDuration: 1`）のとき、`totalDuration` が `3`（秒）になり、`playAnimation()` を呼ぶと `isPlaying === true` になってタイムラインが開始されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` ➔ Phase 3 の 4 ファイル実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/tactical-animation-canvas.ts src/features/tactical-unified/hooks/use-tactical-animation.ts src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/panels/timeline/playback-controls.tsx src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts src/features/tactical-unified/__tests__/tactical-animation.test.ts` PASS
- **Worker Handoff Log**:
  - `renderFrameToCanvas` で再生中の `setActiveSlide` 呼び出しを排除し `computeFrameEffects` に一元化。
  - `resolvePlaybackDurationMs` により 1 シーンのみでも再生可能に対応。停止時に矢印の opacity/visible を復元。

---

### Phase 4: Konva 矢印境界オフセット・ドラッグ整合・WeakMap キャッシュ最適化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/hooks/animation-ripple-updater.ts`, `src/features/tactical-unified/hooks/animation-trajectory-updater.ts`, `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`, `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`, `src/features/tactical-unified/hooks/__tests__/animation-ripple-updater.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/hooks/animation-node-updater.ts
  //   (a) batchDrawLayers(registry: CanvasNodesRegistry, synchronous: boolean): void
  //       synchronous === false のとき、末尾の `registry.stage?.batchDraw()` を削除し、`playerLayer`, `ballLayer`, `annotationLayer` の `.batchDraw()` のみ呼ぶ（重い backgroundLayer の毎フレーム再描画を防止）。
  //   (b) updateArrowNodes(
  //         arrows: Record<string, InterpolatedArrowState>,
  //         registry: CanvasNodesRegistry,
  //         stageWidth: number,
  //         stageHeight: number,
  //         offsetX = 0,
  //         offsetY = 0,
  //         players?: Record<string, InterpolatedPlayerState>,
  //         isPlaying = true,
  //       ): void
  //       - const dims = computeArrowDimensions(stageWidth, aState.strokeWidth ?? 3);
  //       - const dotRadius = aState.strokeWidth ? dims.dotRadius : 6 * dims.scale;
  //       - aState.progress !== undefined && aState.progress <= 0 の場合:
  //         arrowEntry.node.visible(false); arrowEntry.endDotNode?.visible(false); continue;
  //       - players が渡され、かつ aState.sourcePlayerId / targetPlayerId がある場合:
  //         sourcePlayer / targetPlayer の座標 ({ id, x: p.x, y: p.y } as Player) を用いて computeBoundaryEndpoints でマーカー外周オフセットを適用してから applyDotOffsets / getQuadraticBezierPoints / getWavyPoints を計算する（または computeArrowRenderPoints を呼び出す）。
  //       - hasArrowHead = !isBlocked && !isDotEnd && aState.arrowHead !== false;
  //         arrowEntry.node.pointerLength(hasArrowHead ? dims.pointerLength : 0);
  //         arrowEntry.node.pointerWidth(hasArrowHead ? dims.pointerWidth : 0);
  //       - !isPlaying (停止復元時) の場合:
  //         arrowEntry.startHandleNode?.position({ x: sPxX, y: sPxY });
  //         arrowEntry.endHandleNode?.position({ x: ePxX, y: ePxY });
  //         if (arrowEntry.controlHandleNode && cpPxX !== undefined && cpPxY !== undefined) {
  //           arrowEntry.controlHandleNode.position({ x: (sPxX + ePxX) / 4 + cpPxX / 2, y: (sPxY + ePxY) / 4 + cpPxY / 2 });
  //         }

  // 2. src/features/tactical-unified/hooks/animation-ripple-updater.ts
  //   - モジュールスコープに const rippleNodesCache = new WeakMap<Konva.Group, Konva.Circle[]>(); を定義。
  //   - playerGroup ごとに初回のみ [0, 1, 2].map(i => playerGroup.findOne<Konva.Circle>(`.ripple-ring-${i}`) ?? ... ) または playerGroup.find('.ripple-ring') を取得して WeakMap にキャッシュ（見つかったノード数が 3 個揃っている場合のみキャッシュ保存）し、2フレーム目以降の `.find()` 走査をゼロにする。

  // 3. src/features/tactical-unified/hooks/animation-trajectory-updater.ts
  //   - モジュールスコープに const trajectoryNodesCache = new WeakMap<Konva.Group, { startMarker: Konva.Circle; line: Konva.Line }>(); を定義。
  //   - 初回のみ playerGroup.findOne('.trajectory-start-marker') と playerGroup.findOne('.trajectory-line') を検索し、両方存在する場合は WeakMap にキャッシュして再利用する。

  // 4. src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx
  //   - onDragEnd ハンドラ内 (矢印本体ドラッグ移動時):
  //     sourcePlayerId または targetPlayerId のいずれかが設定されている場合、移動後の新しい始点・終点座標で sourcePlayerId: undefined, targetPlayerId: undefined の両方をクリアして onUpdate する（片方だけ接続されているときに targetPlayerId が残ってワープするバグを修正）。
  //     また startHandleRef, endHandleRef に加えて controlHandleRef が存在する場合も dx, dy 分（または新しい中点）へ同期する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`:
    - `batchDrawLayers(registry, false)` を呼んだ際、`playerLayer.batchDraw`, `ballLayer.batchDraw`, `annotationLayer.batchDraw` は呼ばれるが、`stage.batchDraw` は **呼ばれない** こと。
    - `updateArrowNodes` に `progress: 0` の矢印を渡した際、`arrowNode.visible(false)` が呼ばれること。
    - `updateArrowNodes` に `sourcePlayerId: 'p1'` と `players: { p1: { x: 10, y: 50, ... } }` を渡した際、始点ピクセル座標が選手中心 `(100, 300)` からマーカー半径分オフセットされること。
  - `src/features/tactical-unified/hooks/__tests__/animation-ripple-updater.test.ts`:
    - 同一 `playerGroup` に対して `updatePlayerRippleRings` を 2 回連続で呼んだ際、2 回目は `WeakMap` キャッシュが使われ `playerGroup.find` / `findOne` が再実行されないこと。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` ➔ Phase 4 の 4 ファイル実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts src/features/tactical-unified/hooks/animation-ripple-updater.ts src/features/tactical-unified/hooks/animation-trajectory-updater.ts src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts src/features/tactical-unified/hooks/__tests__/animation-ripple-updater.test.ts` PASS
- **Worker Handoff Log**:
  - `updateArrowNodes` に `players` / `isPlaying` を追加し、`computeArrowRenderPoints` によるマーカー境界オフセット・`progress <= 0` 非表示・停止時ハンドル位置同期を実装。`batchDrawLayers` 非同期時の `stage.batchDraw()` を排除。
  - `animation-ripple-updater` と `animation-trajectory-updater` に `WeakMap` キャッシュを導入し毎フレーム走査を排除。`arrow-line-node` のドラッグ完了時に `sourcePlayerId`/`targetPlayerId` の両方をクリアしハンドル同期。

---

### Phase 5: レイアウト・プレビュー静止中常時エフェクトループ ＆ サムネイル・PNG静止画 `applyEffects: false` 対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`, `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`, `src/features/tactical-unified/hooks/konva-slide-export.ts`, `src/features/tactical-unified/panels/toolbar/top-bar.tsx`, `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`, `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/panels/export/use-export-preview-animation.ts
  //   - totalDurationMs の算出に resolvePlaybackDurationMs(slides) || 1000 を使用。
  //   - drawFrame(timeMs: number, effectTimeMs?: number) に第2引数 effectTimeMs?: number を追加し、renderTacticalFrameToCanvas のオプションに ...(effectTimeMs !== undefined ? { effectTimeMs } : {}) を渡す。
  //   - 静止中（!effectiveIsPlaying）の常時エフェクトループ（RAII クリーンアップ必須）:
  //     useEffect(() => {
  //       if (effectiveIsPlaying || !hasActiveFrameEffects(slides)) return;
  //       let rafId = 0;
  //       let startTime: number | null = null;
  //       const IDLE_CYCLE_MS = 3000;
  //       const tick = (now: number) => {
  //         if (startTime === null) startTime = now;
  //         const elapsed = (now - startTime) % IDLE_CYCLE_MS;
  //         drawFrame(currentTimeMsRef.current, elapsed);
  //         rafId = requestAnimationFrame(tick);
  //       };
  //       rafId = requestAnimationFrame(tick);
  //       return () => cancelAnimationFrame(rafId);
  //     }, [effectiveIsPlaying, slides, drawFrame]);

  // 2. src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx
  //   - renderTacticalFrameToCanvas 呼び出しオプションに `applyEffects: false` を追加。

  // 3. src/features/tactical-unified/hooks/konva-slide-export.ts
  //   - renderSlideToPngBlob 内の renderTacticalFrameToCanvas 呼び出しオプションに `applyEffects: false` を追加。

  // 4. src/features/tactical-unified/panels/toolbar/top-bar.tsx
  //   - handleCopyImage 内の renderTacticalFrameToCanvas 呼び出しオプションに `applyEffects: false` を追加。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`:
    - `effectiveIsPlaying === false` かつスライド内の矢印に `effect: { type: 'grow', duration: 0.8 }` があるとき、`requestAnimationFrame` ループが起動し、`renderTacticalFrameToCanvas` が `timeMs: 0`（固定）かつ `effectTimeMs > 0` で呼ばれること。またアンマウント時に `cancelAnimationFrame` が呼ばれること。
  - `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`:
    - `SceneCanvasThumbnail` が `renderTacticalFrameToCanvas` を呼ぶ際、`applyEffects: false` が渡されていること（既存の `toHaveBeenCalledWith` アサーションも合わせて更新）。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` ➔ Phase 5 の 4 ファイル実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/hooks/konva-slide-export.ts src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `useExportPreviewAnimation` で `!effectiveIsPlaying && hasActiveFrameEffects(slides)` 時の rAF アイドルループ（RAII クリーンアップ付き）と `resolvePlaybackDurationMs` を統合。
  - `SceneCanvasThumbnail`、`konva-slide-export`、`top-bar` の静止画描画オプションに `applyEffects: false` を指定し伸長エフェクト消失を防止。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-10 17:22
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  波線矢印トリミングの非破壊化（splice ガイド点挿入）、0ms 時点非表示、単一スライド再生時間解決（resolvePlaybackDurationMs）、エフェクト計算の一元化（computeFrameEffects への完全委譲と hasActiveFrameEffects によるポーズスキップ制御）、再生中 React 再レンダリング競合排除（setActiveSlide の停止時限定実行）、Konva 矢印境界オフセットと WeakMap キャッシュ最適化、静止中常時エフェクトループの RAII 実装、サムネイル・PNG 静止画の applyEffects: false 指定に加え、Fix 2 で TASK-146 の仕様（静止時はレイアウト編集カメラ反映、再生中のみ複数スライドで mvpMatrix: null となり補間委譲）への完全復元とテスト（video-export.test.ts）の整合性が担保され、4大定性監査の全項目をクリアしています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
- **Fix 1 (Preflight テスト失敗の修正 - 2026-11-10 [PASS])**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`: 複数スライド時（`slides.length > 1`）は静止時・再生時問わず固定 mvpMatrix を null にして `renderTacticalFrameToCanvas` 側のスライド別カメラ補間に委譲するよう条件を修正。
  - `src/features/tactical-unified/__tests__/tactical-animation.test.ts`: Phase 4 の非同期時 `stage.batchDraw()` 削除に合わせ、テスト期待値を `expect(registry.stage?.batchDraw).not.toHaveBeenCalled()` に更新。
- **Fix 2 (Preflight テスト整合性修正・TASK-146仕様復元 - 2026-11-10 [PASS])**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`: `mvpMatrix` の条件を `if ((effectiveIsPlaying && slides.length > 1) || ...)` に戻し、静止中はレイアウト編集用カメラを反映し、再生中のみ複数スライドで動的補間するため null を返すよう復元。
  - `src/features/tactical-unified/__tests__/video-export.test.ts`: `useExportPreviewAnimation で複数スライド再生時は mvpMatrix: null が渡されること` テストで `externalIsPlaying: true` を指定するよう更新。


