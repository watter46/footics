# TASK-178d: 戦術ボードDDD移行(4/7): 時間補間エンジン(evaluateTimelineFrame)と視覚シーングラフコンパイラ(compileSceneGraph)の構築

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/engine/timeline-evaluator.ts` (CREATE)
  - `src/lib/tactical/engine/projection-3d.ts` (CREATE)
  - `src/lib/tactical/compiler/scene-graph-dto.ts` (CREATE)
  - `src/lib/tactical/compiler/geometry-primitives.ts` (CREATE)
  - `src/lib/tactical/compiler/compile-scene-graph.ts` (CREATE)
  - `src/lib/tactical/__tests__/timeline-evaluator.test.ts` (CREATE)
  - `src/lib/tactical/__tests__/compile-scene-graph.test.ts` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/engine/timeline-evaluator.ts` に `evaluateTimelineFrame(phase: DomainTacticalPhase, timeMs: Milliseconds): EvaluatedTimelineFrame` が実装され、任意時刻の選手・ボール・矢印・ゾーン・テキスト・カメラの補間状態を純粋関数として導出できること
- [x] 2. `src/lib/tactical/compiler/scene-graph-dto.ts` に Konva と Canvas2D の両方がそのまま転写できる `ResolvedSceneGraphDTO`（`zones`, `connectLines`, `trajectories`, `arrows`, `billboardItems`, `drawingPreview`）および `EphemeralSessionState` の型定義が確立されていること
- [x] 3. `src/lib/tactical/compiler/geometry-primitives.ts` にベジェ曲線分割・ドリブル波線生成・選手半径分の矢印始点/終点オフセット・伸長エフェクト (`grow` / `flow`) による頂点トリミング・波紋リング半径計算が純粋関数として実装されていること
- [x] 4. `src/lib/tactical/compiler/compile-scene-graph.ts` の `compileSceneGraph(frame, session, viewport): ResolvedSceneGraphDTO` が、ドラッグ中の一時移動デルタ（`activeDragDelta`）合成・追従矢印の再計算・3Dチルト時の奥行き Y 座標による `billboardItems` の Z ソートを一括完了して返すこと

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Context 4 & 5 (Engine & Compiler) の純粋性**: `src/lib/tactical/engine/**` および `src/lib/tactical/compiler/**` は React / Konva / DOM / Zustand / Canvas2D を一切 import してはならない。
  2. **幾何学計算の一元化（Dumb Rasterizer 原則）**: 従来は Konva (`arrow-geometry.ts`)、アニメーション (`animation-node-updater.ts`)、Canvas2D (`arrow-renderer.ts`) の3箇所に重複していた曲線・波線・ギャップ・トリミング・Zソート計算を `compileSceneGraph` の1箇所に完全集約する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/types/tactical/branded.ts` & `src/lib/tactical/engine/coordinates.ts` (`TASK-178a`)
  - `src/lib/types/tactical/domain-entities.ts` & `src/lib/types/tactical/domain-hierarchy.ts` (`TASK-178a`)
  - `src/lib/tactical/unified-interpolation.ts` & `src/lib/tactical/effect-geometry.ts` — 既存の補間・トリミング数式の再利用元

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import {
  type Milliseconds,
  type ScreenNormPoint,
  type StagePixel,
  type StagePixelPoint,
  toMilliseconds,
  toScreenNormPoint,
  toStagePixel,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  screenNormToStagePixel,
  type StageViewport,
} from '@/lib/tactical/engine/coordinates';
import { trimRenderPoints } from '@/lib/tactical/effect-geometry';
```

### 3.2 Key Interfaces & Types
```ts
export interface EphemeralDragDelta {
  readonly entityIds: readonly string[];
  readonly deltaScreenNormX: number;
  readonly deltaScreenNormY: number;
}

export interface EphemeralSessionState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly selectedIds: readonly string[];
  readonly activeDragDelta?: EphemeralDragDelta | null;
  readonly drawingPreview?: {
    readonly tool: string;
    readonly startPoint: ScreenNormPoint;
    readonly currentPoint: ScreenNormPoint;
    readonly polygonPoints?: readonly ScreenNormPoint[];
  } | null;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// ビルボードアイテムの奥行きソート（Y座標昇順 + 同一Yでは player < text < ball）
const sortedBillboards = [...items].sort((a, b) => a.depthSortKey - b.depthSortKey);
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: Temporal Engine (`evaluateTimelineFrame`) と 3D 投影ヘルパーの実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/engine/timeline-evaluator.ts`, `src/lib/tactical/engine/projection-3d.ts`, `src/lib/tactical/__tests__/timeline-evaluator.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/engine/timeline-evaluator.ts
  export interface EvaluatedTimelineFrame {
    readonly slideIndex: number;
    readonly nextSlideIndex: number;
    readonly progress: number;
    readonly isPaused: boolean;
    readonly timeInSlideMs: number;
    readonly slide: DomainSlide; // 補間済み座標・エフェクト進捗を持つ正規化フレーム
    readonly arrowProgressMap: Readonly<Record<string, { readonly progress: number; readonly dashOffset: number; readonly opacity: number; readonly visible: boolean }>>;
    readonly zoneOpacityMap: Readonly<Record<string, { readonly opacity: number; readonly visible: boolean }>>;
    readonly playerOpacityMap: Readonly<Record<string, { readonly opacity: number; readonly visible: boolean }>>;
  }

  export function evaluateTimelineFrame(
    phase: DomainTacticalPhase,
    timeMs: Milliseconds,
  ): EvaluatedTimelineFrame;

  export function evaluateStaticSlideFrame(
    slide: DomainSlide,
    slideIndex?: number,
  ): EvaluatedTimelineFrame;

  // 2. src/lib/tactical/engine/projection-3d.ts
  export function computeBillboardDepthKey(
    pointPx: StagePixelPoint,
    kind: 'player' | 'ball' | 'text',
    tiltDeg: number,
  ): number;
  // 計算式: baseDepth = pointPx.y + (kind === 'player' ? 0 : kind === 'text' ? 0.1 : 0.2)
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/timeline-evaluator.test.ts`:
    - スライド0 (`p1: x=20, y=50`, `transitionDurationMs: 1000, pauseMs: 500`, `easing: 'linear'`) からスライド1 (`p1: x=80, y=50`) への遷移で `timeMs = 1000 as Milliseconds`（pause 500ms + transition 500ms = 進捗 0.5）を入力 ➔ `frame.slide.players[0].x === 50`
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/timeline-evaluator.test.ts` (RED) ➔ `timeline-evaluator.ts` & `projection-3d.ts` 実装 ➔ `bun run ai:check src/lib/tactical/engine/timeline-evaluator.ts src/lib/tactical/engine/projection-3d.ts src/lib/tactical/__tests__/timeline-evaluator.test.ts` PASS
- **Worker Handoff Log**:
  - `evaluateTimelineFrame`, `evaluateStaticSlideFrame` (`src/lib/tactical/engine/timeline-evaluator.ts`)、`computeBillboardDepthKey` (`src/lib/tactical/engine/projection-3d.ts`) を実装。補助関数として `slide-interpolator.ts` / `slide-entity-interpolators.ts` を分離。

---

### Phase 2: Visual Scene Compiler (`compileSceneGraph` & `ResolvedSceneGraphDTO`) の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/compiler/scene-graph-dto.ts`, `src/lib/tactical/compiler/geometry-primitives.ts`, `src/lib/tactical/compiler/compile-scene-graph.ts`, `src/lib/tactical/__tests__/compile-scene-graph.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/compiler/scene-graph-dto.ts
  export interface ResolvedArrowPrimitive {
    readonly id: string;
    readonly flatPointsPx: readonly number[];
    readonly startPointPx: StagePixelPoint;
    readonly endPointPx: StagePixelPoint;
    readonly controlHandlePx?: StagePixelPoint;
    readonly color: string;
    readonly strokeWidthPx: number;
    readonly dashArrayPx: readonly number[];
    readonly dashOffsetPx: number;
    readonly opacity: number;
    readonly visible: boolean;
    readonly startMarker: 'none' | 'arrow' | 'dot';
    readonly endMarker: 'none' | 'arrow' | 'dot';
    readonly pointerLengthPx: number;
    readonly pointerWidthPx: number;
    readonly dotRadiusPx: number;
    readonly endAngleRad: number;
    readonly selected: boolean;
  }

  export interface ResolvedBillboardPlayerItem {
    readonly kind: 'player';
    readonly id: string;
    readonly positionPx: StagePixelPoint;
    readonly radiusPx: number;
    readonly depthSortKey: number;
    readonly opacity: number;
    readonly visible: boolean;
    readonly selected: boolean;
    readonly player: PitchPlayer;
    readonly rippleRingsPx: readonly { readonly radiusPx: number; readonly opacity: number; readonly color: string }[];
  }

  export interface ResolvedSceneGraphDTO {
    readonly viewport: StageViewport;
    readonly zones: readonly {
      readonly id: string;
      readonly shapeType: 'rect' | 'ellipse' | 'polygon';
      readonly xPx?: StagePixel;
      readonly yPx?: StagePixel;
      readonly widthPx?: number;
      readonly heightPx?: number;
      readonly rotationDeg?: number;
      readonly flatPointsPx?: readonly number[];
      readonly color: string;
      readonly opacity: number;
      readonly strokeColor: string;
      readonly strokeOpacity: number;
      readonly strokeWidthPx: number;
      readonly visible: boolean;
      readonly selected: boolean;
    }[];
    readonly connectLines: readonly {
      readonly id: string;
      readonly fromPlayerId: string;
      readonly toPlayerId: string;
      readonly flatPointsPx: readonly [number, number, number, number];
      readonly color: string;
      readonly strokeWidthPx: number;
      readonly dashArrayPx: readonly number[];
      readonly visible: boolean;
    }[];
    readonly trajectories: readonly {
      readonly playerId: string;
      readonly flatPointsPx: readonly number[];
      readonly color: string;
      readonly dashArrayPx: readonly number[];
      readonly visible: boolean;
    }[];
    readonly arrows: readonly ResolvedArrowPrimitive[];
    readonly billboardItems: readonly (
      | ResolvedBillboardPlayerItem
      | { readonly kind: 'ball'; readonly positionPx: StagePixelPoint; readonly radiusPx: number; readonly depthSortKey: number; readonly opacity: number; readonly visible: boolean; readonly color?: string }
      | { readonly kind: 'text'; readonly id: string; readonly positionPx: StagePixelPoint; readonly depthSortKey: number; readonly content: string; readonly fontSizePx: number; readonly color: string; readonly bold: boolean; readonly italic: boolean; readonly opacity: number; readonly visible: boolean; readonly selected: boolean }
    )[];
  }

  // 2. src/lib/tactical/compiler/compile-scene-graph.ts
  export function compileSceneGraph(
    frame: EvaluatedTimelineFrame,
    session: EphemeralSessionState | null,
    viewport: StageViewport,
  ): ResolvedSceneGraphDTO;
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/compile-scene-graph.test.ts`:
    - `p1 (x:10, y:50)` と `p2 (x:90, y:50)` と追従矢印 `a1 (sourcePlayerId:'p1', targetPlayerId:'p2')` を `viewport: { width: 1000, height: 500 }` でコンパイル ➔ `a1.flatPointsPx[0] > 100` かつ `a1.flatPointsPx[last-1] < 900`（選手半径分オフセットされていること）
    - `session.activeDragDelta = { entityIds: ['p1'], deltaScreenNormX: 20, deltaScreenNormY: 10 }` を渡した際、`p1` の `positionPx` が `{ x: 300, y: 300 }` に移動し、バインドされた `a1` の始点も追従して再計算されること（`frame` 自体は不変）
    - `billboardItems` が `depthSortKey`（Y座標昇順）でソートされていること
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/compile-scene-graph.test.ts` (RED) ➔ `scene-graph-dto.ts`, `geometry-primitives.ts`, `compile-scene-graph.ts` 実装 ➔ `bun run ai:check src/lib/tactical/compiler/scene-graph-dto.ts src/lib/tactical/compiler/geometry-primitives.ts src/lib/tactical/compiler/compile-scene-graph.ts src/lib/tactical/__tests__/compile-scene-graph.test.ts` PASS
- **Worker Handoff Log**:
  - `compileSceneGraph` (`src/lib/tactical/compiler/compile-scene-graph.ts`), `ResolvedSceneGraphDTO` (`scene-graph-dto.ts`), 幾何関数 (`geometry-primitives.ts`) を実装。300行制限およびSRP遵守のため `compile-billboards.ts`, `compile-arrows.ts`, `compile-zones.ts` を分離。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 02:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Context 4 (Temporal Engine) と Context 5 (Visual Scene Compiler) の完全純粋関数化を達成。Dumb Rasterizer 原則に基づき幾何計算・Zソート・追従矢印合成を一元化し、不変条件と受入要件を完備。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
