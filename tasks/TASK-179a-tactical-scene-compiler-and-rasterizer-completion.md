# TASK-179a: Scene Compiler & Canvas2D Rasterizer の完全化とパフォーマンス最適化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/compiler/scene-graph-dto.ts` (MODIFY)
  - `src/lib/tactical/engine/projection-3d.ts` (MODIFY)
  - `src/lib/tactical/compiler/compile-billboards.ts` (MODIFY)
  - `src/lib/tactical/compiler/compile-scene-graph.ts` (MODIFY)
  - `src/lib/tactical/export/scene-graph-billboard-rasterizer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (MODIFY)
  - `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/compiler/compile-scene-graph.ts` の `// 4. Trajectories (empty placeholder for Phase 2)` プレースホルダを撤去し、`compileTrajectories` により選手（`trajectoryEffect?.enabled === true` または選択中）およびボールの移動軌道 `ResolvedTrajectoryPrimitive[]`（直線・`arc_left`・`arc_right`・`custom` ベジェ曲線30分割）を実計算して返すこと（`rtk grep "placeholder" src/lib/tactical/compiler/` が `0` 件であること）。
- [x] 2. `src/lib/tactical/compiler/scene-graph-dto.ts` の `ResolvedBillboardPlayerItem` に解決済み `visionCone`（`radiusPx`, `angleRad`, `spreadRad`, `color`, `opacity`, `visible`）および `focus`（`radiusPx`, `color`, `opacity`, `style`, `enabled`）を追加し、`compile-billboards.ts` で計算、`scene-graph-billboard-rasterizer.ts` の `renderPlayerItem` で Canvas2D に描画すること。
- [x] 3. `src/lib/tactical/compiler/compile-billboards.ts` にて `session.activeDragDelta` を `PitchPlayer` だけでなく `ball`（`entityIds.includes('ball')`）および `texts`（`entityIds.includes(text.id)`）にも適用し、ドラッグ中のリアルタイム追従を保証すること。
- [x] 4. `src/lib/tactical/engine/projection-3d.ts` に `projectStagePixelWithPitchTransform(pointPx, viewport, pitchTransform)` を追加し、`compile-billboards.ts` で `frame.slide.pitchTransform` によるパン・ズーム・チルト投影および `computeBillboardDepthKey` の `tiltDeg` 反映を行うこと。
- [x] 5. `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` でストア全体購読 `useSessionStore((s) => s)` を廃止して個別フィールドセレクタに細分化し、`useMemo` の依存配列で `viewport` オブジェクト参照ではなくプリミティブ値（`viewport.width`, `viewport.height`, `viewport.offsetX`, `viewport.offsetY`）に依存させること。
- [x] 6. `src/lib/tactical/export/tactical-phase-frame-renderer.ts` にピッチ背景のオフスクリーンキャッシュ（`width`, `height`, `pitchAppearance`, `marbleTexture` キー）を導入し、同一設定の連続フレーム描画時に `renderPitch` の毎フレーム再生成を回避して `ctx.drawImage` で高速転写すること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Functional Core の純粋性（Context 4 & Context 5）**: `src/lib/tactical/compiler/**` および `src/lib/tactical/engine/**` は React / Konva / Zustand / DOM グローバルに一切依存しない純粋関数であること。
  2. **Branded Coordinates の厳守**: 座標変換は必ず `ScreenNormPoint` ➔ `StagePixelPoint`（`toStagePixelPoint`）を経由し、素の `{ x: number, y: number }` を DTO に露出させないこと。
  3. **Ghost Pipeline / Placeholder 禁止**: 空配列返却（`const trajectories = []`）や未使用パラメータ放置（`_tiltDeg`）を残さず、Compiler で解決した全フィールドを Canvas2D Rasterizer とテストで検証すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts` — `ResolvedSceneGraphDTO` の `trajectories` および `billboardItems` を受け取って描画する呼び出し元。
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts` — `compileSceneGraph` と `rasterizeSceneGraphToCanvas2D` を統合する呼び出し元。
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` — Konva View 向けに `compileSceneGraph` を呼び出す React Hook。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import {
  clampToScreenNorm,
  type Milliseconds,
  type ScreenNormPoint,
  type StagePixelPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/primitives';
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { subdivideQuadraticBezier } from '@/lib/tactical/compiler/geometry-primitives';
```

### 3.2 Key Interfaces & Types
```ts
export interface ResolvedVisionConeDTO {
  readonly id: string;
  readonly angleRad: number;
  readonly spreadRad: number;
  readonly radiusPx: number;
  readonly color: string;
  readonly opacity: number;
  readonly visible: boolean;
}

export interface ResolvedPlayerFocusDTO {
  readonly enabled: boolean;
  readonly color: string;
  readonly radiusPx: number;
  readonly opacity: number;
  readonly style: 'spotlight' | 'ring' | 'halo';
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
  readonly rippleRingsPx: readonly {
    readonly radiusPx: number;
    readonly opacity: number;
    readonly color: string;
  }[];
  readonly visionCone?: ResolvedVisionConeDTO | null;
  readonly focus?: ResolvedPlayerFocusDTO | null;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// compile-billboards.ts でのドラッグデルタ適用パターン
const isDragged = Boolean(
  dragDelta && dragDelta.entityIds.includes(entityId),
);
const screenNormPos = isDragged && dragDelta
  ? toScreenNormPoint(
      rawX + dragDelta.deltaScreenNormX,
      rawY + dragDelta.deltaScreenNormY,
    )
  : toScreenNormPoint(rawX, rawY);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Scene Compiler 完全化（Trajectories・VisionCone/Focus・DragDelta・3D投影）
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/compiler/scene-graph-dto.ts`, `src/lib/tactical/engine/projection-3d.ts`, `src/lib/tactical/compiler/compile-billboards.ts`, `src/lib/tactical/compiler/compile-scene-graph.ts`, `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/compiler/scene-graph-dto.ts
  // ResolvedVisionConeDTO と ResolvedPlayerFocusDTO を export し、ResolvedBillboardPlayerItem に optional プロパティとして追加する。
  // EvaluatedTimelineFrame からの軌道生成用に、EphemeralSessionState または compileSceneGraph で prevSlide を参照可能にするため、
  // compileSceneGraph(frame: EvaluatedTimelineFrame, session: EphemeralSessionState | null, viewport: StageViewport, prevSlide?: DomainSlide | null): ResolvedSceneGraphDTO とする。

  // 2. src/lib/tactical/engine/projection-3d.ts
  export function computeBillboardDepthKey(
    pointPx: StagePixelPoint,
    kind: 'player' | 'ball' | 'text',
    tiltDeg: number,
  ): number {
    const kindBias = kind === 'player' ? 0 : kind === 'ball' ? 0.1 : 0.2;
    const tiltFactor = Math.cos((tiltDeg * Math.PI) / 180);
    return pointPx.y * Math.max(0.1, tiltFactor) + kindBias;
  }

  export function projectStagePixelWithPitchTransform(
    pointPx: StagePixelPoint,
    viewport: StageViewport,
    pitchTransform?: PitchTransform | null,
  ): StagePixelPoint {
    if (!pitchTransform) return pointPx;
    const zoom = pitchTransform.zoom ?? 1;
    const panX = pitchTransform.panX ?? 0;
    const panY = pitchTransform.panY ?? 0;
    const tilt = pitchTransform.tilt ?? 0;
    if (zoom === 1 && panX === 0 && panY === 0 && tilt === 0) {
      return pointPx;
    }
    const cx = (viewport.offsetX ?? 0) + viewport.width / 2;
    const cy = (viewport.offsetY ?? 0) + viewport.height / 2;
    const dx = (pointPx.x - cx) * zoom + (panX / 100) * viewport.width;
    const dyRaw = (pointPx.y - cy) * zoom + (panY / 100) * viewport.height;
    const tiltRad = (tilt * Math.PI) / 180;
    const cosT = Math.cos(tiltRad);
    const perspective = 1 + (dyRaw / Math.max(1, viewport.height)) * Math.sin(tiltRad) * 0.35;
    const projectedX = cx + dx * perspective;
    const projectedY = cy + dyRaw * cosT;
    return toStagePixelPoint(projectedX, projectedY);
  }

  // 3. src/lib/tactical/compiler/compile-billboards.ts
  // - PitchPlayer: rawPosPt に session.activeDragDelta を適用後、screenNormToStagePixel ➔ projectStagePixelWithPitchTransform(rawPx, viewport, frame.slide.pitchTransform) で positionPx を算出。
  // - visionCone: player.visionCone && player.visionCone.visible !== false の場合、
  //   radiusPx = (player.visionCone.radius / 100) * Math.min(viewport.width, viewport.height) * (frame.slide.pitchTransform?.zoom ?? 1)
  //   として ResolvedVisionConeDTO を生成。非表示または未定義なら null。
  // - focus: player.focus && player.focus.enabled !== false の場合、
  //   radiusPx = radiusPx(player) * player.focus.radius
  //   として ResolvedPlayerFocusDTO を生成。無効または未定義なら null。
  // - Ball: dragDelta?.entityIds.includes('ball') の場合、(ball.x + dragDelta.deltaScreenNormX, ball.y + dragDelta.deltaScreenNormY) に移動し、projectStagePixelWithPitchTransform を適用。
  // - Texts: dragDelta?.entityIds.includes(text.id) の場合、(text.x + dragDelta.deltaScreenNormX, text.y + dragDelta.deltaScreenNormY) に移動し、projectStagePixelWithPitchTransform を適用。
  // - depthSortKey: computeBillboardDepthKey(positionPx, kind, frame.slide.pitchTransform?.tilt ?? 0) を使用。

  // 4. src/lib/tactical/compiler/compile-scene-graph.ts
  // compileTrajectories(frame, resolvedPlayersMap, session, viewport, prevSlide): ResolvedTrajectoryPrimitive[] を実装。
  // prevSlide が渡された場合、または player.trajectory?.controlPoint が定義されている場合:
  // - prevSlide 内の同一 id の PitchPlayer (prevPlayer) と現在位置 (currPlayer) の距離 Math.hypot(curr.x - prev.x, curr.y - prev.y) >= 1 のとき:
  //   (player.trajectoryEffect?.enabled === true || session?.selectedIds.includes(player.id)) であれば軌道を生成。
  //   startPx = projectStagePixelWithPitchTransform(screenNormToStagePixel(prevPlayerPos, viewport), viewport, frame.slide.pitchTransform)
  //   endPx = resolvedPlayer.positionPx
  //   type === 'straight' なら [startPx.x, startPx.y, endPx.x, endPx.y]
  //   type === 'custom' && controlPoint なら subdivideQuadraticBezier(startPx.x, startPx.y, cpPx.x, cpPx.y, endPx.x, endPx.y, 16)
  //   type === 'arc_left' | 'arc_right' なら中点から法線方向に curveOffset (既定 15%) オフセットした制御点で subdivideQuadraticBezier(..., 16)
  //   dashArrayPx = player.trajectoryEffect?.lineStyle === 'solid' ? [] : [6, 4]
  //   color = player.trajectoryEffect?.color ?? player.style.color
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts` にて以下を検証:
  1. `visionCone`: `radius: 20, angleRad: 0, spreadRad: 1.0, color: '#38bdf8', opacity: 0.3, visible: true` (`viewport = { width: 1000, height: 800 }`) ➔ `item.visionCone.radiusPx === 160` (`0.20 * 800`), `angleRad === 0`, `spreadRad === 1.0`.
  2. `focus`: `enabled: true, color: '#ffffff', radius: 3, opacity: 0.4, style: 'spotlight'` ➔ `item.focus.radiusPx === item.radiusPx * 3`, `style === 'spotlight'`.
  3. `activeDragDelta` on `ball` & `text`: `entityIds: ['ball', 'txt-1'], deltaScreenNormX: 10, deltaScreenNormY: -5` (`ball` at `x: 50, y: 50`, `txt-1` at `x: 20, y: 30`, `viewport = { width: 1000, height: 800 }`) ➔ ball `positionPx` = `{ x: 600, y: 360 }`, text `positionPx` = `{ x: 300, y: 200 }`.
  4. `trajectories`: `prevSlide` player `p1` at `(20, 50)`, current slide `p1` at `(50, 50)` with `trajectoryEffect: { enabled: true, lineStyle: 'dashed', color: '#f59e0b', exitAction: 'keep' }` ➔ `sceneGraph.trajectories` length `1`, `flatPointsPx` = `[200, 400, 500, 400]`, `dashArrayPx` = `[6, 4]`, `color` = `'#f59e0b'`.
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/compiler/__tests__/scene-compiler.test.ts` ➔ Phase 1 対象4ファイルを実装 ➔ `bun run ai:check src/lib/tactical/compiler/ src/lib/tactical/engine/projection-3d.ts` PASS
- **Worker Handoff Log**:
  - `ResolvedVisionConeDTO`, `ResolvedPlayerFocusDTO`, `projectStagePixelWithPitchTransform` を新規 export。`compileSceneGraph` に `prevSlide` オプション引数を追加し、`compileTrajectories` で選手・ボールの軌道計算（直線/円弧/カスタム）を完全実装。


---

### Phase 2: Canvas2D Rasterizer 描画拡張・ピッチ背景キャッシュ・useResolvedSceneGraph 最適化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/scene-graph-billboard-rasterizer.ts`, `src/lib/tactical/export/tactical-phase-frame-renderer.ts`, `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`, `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/export/scene-graph-billboard-rasterizer.ts
  // renderPlayerItem 内でマーカー本体の描画前に visionCone と focus を描画する:
  // - item.focus && item.focus.enabled:
  //   ctx.save();
  //   ctx.globalAlpha = item.opacity * item.focus.opacity;
  //   ctx.beginPath();
  //   ctx.arc(x, y, item.focus.radiusPx, 0, Math.PI * 2);
  //   if (item.focus.style === 'ring') {
  //     ctx.strokeStyle = item.focus.color;
  //     ctx.lineWidth = Math.max(2, item.radiusPx * 0.2);
  //     ctx.stroke();
  //   } else {
  //     ctx.fillStyle = item.focus.color;
  //     ctx.fill();
  //   }
  //   ctx.restore();
  // - item.visionCone && item.visionCone.visible:
  //   ctx.save();
  //   ctx.globalAlpha = item.opacity * item.visionCone.opacity;
  //   ctx.fillStyle = item.visionCone.color;
  //   ctx.beginPath();
  //   ctx.moveTo(x, y);
  //   ctx.arc(
  //     x,
  //     y,
  //     item.visionCone.radiusPx,
  //     item.visionCone.angleRad - item.visionCone.spreadRad / 2,
  //     item.visionCone.angleRad + item.visionCone.spreadRad / 2,
  //   );
  //   ctx.closePath();
  //   ctx.fill();
  //   ctx.restore();

  // 2. src/lib/tactical/export/tactical-phase-frame-renderer.ts
  // モジュールスコープに1エントリのピッチ背景キャッシュを保持:
  // interface PitchCacheEntry {
  //   key: string;
  //   canvas: OffscreenCanvas | HTMLCanvasElement;
  // }
  // key = `${width}x${height}:${phase.aspectRatio}:${JSON.stringify(pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(marbleTexture)}`
  // OffscreenCanvas または document.createElement('canvas') が利用可能な環境では、キャッシュヒット時に ctx.drawImage(cached.canvas, 0, 0, width, height) のみ実行し renderPitch(...) の再計算をスキップする。
  // さらに evaluateTimelineFrame の結果から prevSlide = phase.slides[Math.max(0, evaluatedFrame.slideIndex - 1)] を取得し、compileSceneGraph(evaluatedFrame, null, viewport, prevSlide) に渡す。

  // 3. src/features/tactical-unified/hooks/use-resolved-scene-graph.ts
  // useSessionStore((s) => s) を廃止し、以下の個別セレクタで購読する:
  // const activePhaseId = useSessionStore((s) => s.activePhaseId);
  // const activeSlideId = useSessionStore((s) => s.activeSlideId);
  // const selectedIds = useSessionStore((s) => s.selectedIds);
  // const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  // const drawingPreview = useSessionStore((s) => s.drawingPreview);
  // useMemo の依存配列には viewport オブジェクト参照ではなく viewport.width, viewport.height, viewport.offsetX, viewport.offsetY を指定する。
  // また resolveSceneGraphFromState 内でアクティブフェーズの直前スライド prevSlide (slideIndex > 0 ? activePhase.slides[slideIndex - 1] : null) を求め、compileSceneGraph(evaluatedFrame, session, viewport, prevSlide) に渡す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` にて以下を検証:
  1. `visionCone` と `focus` を持つ `ResolvedBillboardPlayerItem` を `renderPlayerItem` に渡した際、`ctx.moveTo(x, y)` ➔ `ctx.arc(x, y, 160, -0.5, 0.5)`（visionCone）および `ctx.arc(x, y, item.radiusPx * 3, 0, Math.PI * 2)`（focus）が呼ばれること。
  2. `renderTacticalPhaseFrameToCanvas` を同一 `width: 800, height: 600, pitchAppearance` で連続2回呼び出した際、エラーなく描画され、2回目はキャッシュ経由で高速完了すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` ➔ Phase 2 対象3ファイルを実装 ➔ `bun run ai:check src/lib/tactical/export/ src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` PASS
- **Worker Handoff Log**:
  - `renderPlayerItem` に focus / visionCone の Canvas2D 描画を追加。`tactical-phase-frame-renderer` にピッチ背景キャッシュ（Proxy防御付き）を導入し、`useResolvedSceneGraph` を個別セレクタ購読＆直前スライド参照に最適化。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 14:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Scene Compilerのプレースホルダを完全撤去し軌道計算・visionCone/focus描画・3D投影・ドラッグデルタ・キャッシュ高速化を実装。4大定性監査オールクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
