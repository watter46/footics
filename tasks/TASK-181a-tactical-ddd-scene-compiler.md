Created At: 2026-11-13T05:20:36+09:00
Completed At: 2026-11-13T05:20:36+09:00

# TASK-181a: Scene Compiler 全要素投影統一と Konva ボードの二重変形バグ解消

- **Status**: `DONE`
- **Commit**: `refactor(tactical): unify scene compiler pitch transform projection and fix double transform bug`

## 概要
`compile-zones.ts` と `compile-arrows.ts` にも `projectStagePixelWithPitchTransform` を適用し、Canvas2D ラスタライザ等で `pitchTransform`（ズーム・パン・チルト）が指定された際に全要素（ゾーン・矢印・接続線・移動軌道・選手・ボール・テキスト）が同一の座標系で投影されるように統一する。
また、Konva ボードの `useResolvedSceneGraph` では親 `<Group>` が `calculatePitchTransform` を一括適用しているため、`compileSceneGraph` 呼び出し時に `{ applyPitchTransform: false }` を指定して二重変形バグ（選手・ボール・テキストのみ2重にパン/ズームされる不具合）を解消する。

## Negative Contracts (残存禁止条件)
- 既存テストおよび新規テストにおいて `compileSceneGraph` の座標投影不整合がないこと。

---

## Phase 1: Scene Compiler 全要素投影統一と Konva ボードの二重変形バグ解消
- [x] Phase 1: Scene Compiler 全要素投影統一と Konva ボードの二重変形バグ解消
- **Worker Handoff Log**: `compile-zones` / `compile-arrows` に `projectStagePixelWithPitchTransform` を適用し、`useResolvedSceneGraph` で `{ applyPitchTransform: false }` を渡して二重変形を解消。Phase 1 `bun run ai:check` PASS。

### 対象ファイル
- `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts`
- `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts`
- `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
- `[MODIFY]` `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`

---

### 1-1. `[MODIFY]` `src/lib/tactical/compiler/compile-zones.ts`

`compileZones` において `frame.slide.pitchTransform` を `projectStagePixelWithPitchTransform` でポリゴン頂点および矩形・楕円のバウンディングボックスへ適用する。

#### Before (L1-L86)
```ts
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixel,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  EphemeralSessionState,
  ResolvedDrawingPreview,
  ResolvedZonePrimitive,
} from './scene-graph-dto';

export function compileZones(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): readonly ResolvedZonePrimitive[] {
  const activeDrag = session?.activeDragDelta;
  const draggedIds = new Set(activeDrag?.entityIds ?? []);
  const dragDx = activeDrag?.deltaScreenNormX ?? 0;
  const dragDy = activeDrag?.deltaScreenNormY ?? 0;
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  return frame.slide.zones.map((zone) => {
    const isDragged = draggedIds.has(zone.id);
    const zDx = isDragged ? dragDx : 0;
    const zDy = isDragged ? dragDy : 0;
    const zoneOpacity = frame.zoneOpacityMap[zone.id] ?? {
      opacity: zone.opacity,
      visible: zone.opacity > 0,
    };
    const isSelected = selectedIds.has(zone.id);
    const strokeWidthPx = Math.max(1, Math.round(zone.strokeWidth * scale));

    if (zone.shapeType === 'polygon') {
      const flatPointsPx = zone.points.flatMap((pt) => {
        const px = screenNormToStagePixel(
          toScreenNormPoint(pt.x + zDx, pt.y + zDy, false),
          viewport,
        );
        return [px.x, px.y];
      });

      return {
        id: zone.id,
        shapeType: 'polygon',
        flatPointsPx,
        color: zone.color,
        opacity: zoneOpacity.opacity,
        strokeColor: zone.strokeColor ?? zone.color,
        strokeOpacity: zone.strokeOpacity ?? 1,
        strokeWidthPx,
        visible: zoneOpacity.visible,
        selected: isSelected,
      };
    }

    const pos = screenNormToStagePixel(
      toScreenNormPoint(zone.x + zDx, zone.y + zDy, false),
      viewport,
    );
    const widthPx = (zone.width / 100) * viewport.width;
    const heightPx = (zone.height / 100) * viewport.height;

    return {
      id: zone.id,
      shapeType: zone.shapeType,
      xPx: pos.x as StagePixel,
      yPx: pos.y as StagePixel,
      widthPx,
      heightPx,
      rotationDeg: zone.rotation ?? 0,
      color: zone.color,
      opacity: zoneOpacity.opacity,
      strokeColor: zone.strokeColor ?? zone.color,
      strokeOpacity: zone.strokeOpacity ?? 1,
      strokeWidthPx,
      visible: zoneOpacity.visible,
      selected: isSelected,
    };
  });
}
```

#### After
```ts
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixel,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  EphemeralSessionState,
  ResolvedDrawingPreview,
  ResolvedZonePrimitive,
} from './scene-graph-dto';

export function compileZones(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): readonly ResolvedZonePrimitive[] {
  const activeDrag = session?.activeDragDelta;
  const draggedIds = new Set(activeDrag?.entityIds ?? []);
  const dragDx = activeDrag?.deltaScreenNormX ?? 0;
  const dragDy = activeDrag?.deltaScreenNormY ?? 0;
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;
  const pitchTransform = frame.slide.pitchTransform;

  return frame.slide.zones.map((zone) => {
    const isDragged = draggedIds.has(zone.id);
    const zDx = isDragged ? dragDx : 0;
    const zDy = isDragged ? dragDy : 0;
    const zoneOpacity = frame.zoneOpacityMap[zone.id] ?? {
      opacity: zone.opacity,
      visible: zone.opacity > 0,
    };
    const isSelected = selectedIds.has(zone.id);
    const strokeWidthPx = Math.max(1, Math.round(zone.strokeWidth * scale));

    if (zone.shapeType === 'polygon') {
      const flatPointsPx = zone.points.flatMap((pt) => {
        const rawPx = screenNormToStagePixel(
          toScreenNormPoint(pt.x + zDx, pt.y + zDy, false),
          viewport,
        );
        const px = projectStagePixelWithPitchTransform(
          rawPx,
          viewport,
          pitchTransform,
        );
        return [px.x, px.y];
      });

      return {
        id: zone.id,
        shapeType: 'polygon',
        flatPointsPx,
        color: zone.color,
        opacity: zoneOpacity.opacity,
        strokeColor: zone.strokeColor ?? zone.color,
        strokeOpacity: zone.strokeOpacity ?? 1,
        strokeWidthPx,
        visible: zoneOpacity.visible,
        selected: isSelected,
      };
    }

    const rawTopLeft = screenNormToStagePixel(
      toScreenNormPoint(zone.x + zDx, zone.y + zDy, false),
      viewport,
    );
    const rawBottomRight = screenNormToStagePixel(
      toScreenNormPoint(
        zone.x + zDx + zone.width,
        zone.y + zDy + zone.height,
        false,
      ),
      viewport,
    );
    const topLeft = projectStagePixelWithPitchTransform(
      rawTopLeft,
      viewport,
      pitchTransform,
    );
    const bottomRight = projectStagePixelWithPitchTransform(
      rawBottomRight,
      viewport,
      pitchTransform,
    );
    const widthPx = bottomRight.x - topLeft.x;
    const heightPx = bottomRight.y - topLeft.y;

    return {
      id: zone.id,
      shapeType: zone.shapeType,
      xPx: topLeft.x as StagePixel,
      yPx: topLeft.y as StagePixel,
      widthPx,
      heightPx,
      rotationDeg: zone.rotation ?? 0,
      color: zone.color,
      opacity: zoneOpacity.opacity,
      strokeColor: zone.strokeColor ?? zone.color,
      strokeOpacity: zone.strokeOpacity ?? 1,
      strokeWidthPx,
      visible: zoneOpacity.visible,
      selected: isSelected,
    };
  });
}
```

---

### 1-2. `[MODIFY]` `src/lib/tactical/compiler/compile-arrows.ts`

`compileArrows` において `sourcePlayer` / `targetPlayer` の座標には既に投影済みの `positionPx` を利用し、自由配置の端点や `controlPoint` にも `projectStagePixelWithPitchTransform` を適用する。

#### Before (L1-L141)
```ts
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type ScreenNormPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { ResolvedPlayerInternal } from './compile-billboards';
import {
  calculateLastSegmentAngle,
  computeArrowDimensions,
  generateWavyLinePoints,
  offsetArrowEndpoints,
  subdivideQuadraticBezier,
  trimFlatPoints,
} from './geometry-primitives';
import type {
  EphemeralSessionState,
  ResolvedArrowPrimitive,
  ResolvedBillboardPlayerItem,
  ResolvedConnectLinePrimitive,
} from './scene-graph-dto';

export function compileConnectLines(
  billboardPlayers: readonly ResolvedBillboardPlayerItem[],
  resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>,
  scale: number,
): readonly ResolvedConnectLinePrimitive[] {
  const connectLines: ResolvedConnectLinePrimitive[] = [];

  for (const playerItem of billboardPlayers) {
    for (const line of playerItem.player.connectLines) {
      const targetPlayer = resolvedPlayersMap.get(line.toPlayerId);
      if (!targetPlayer) continue;

      const fromPos = playerItem.positionPx;
      const toPos = targetPlayer.positionPx;

      let dashArrayPx: readonly number[] = [];
      if (line.lineStyle === 'dashed') {
        dashArrayPx = [Math.round(8 * scale), Math.round(6 * scale)];
      } else if (line.lineStyle === 'dotted') {
        dashArrayPx = [Math.round(3 * scale), Math.round(3 * scale)];
      }

      connectLines.push({
        id: line.id,
        fromPlayerId: playerItem.id,
        toPlayerId: line.toPlayerId,
        flatPointsPx: [fromPos.x, fromPos.y, toPos.x, toPos.y],
        color: line.color,
        strokeWidthPx: Math.max(
          1,
          Math.round((line.strokeWidth ?? 3.5) * scale),
        ),
        dashArrayPx,
        visible: line.visible !== false,
      });
    }
  }

  return connectLines;
}

export function compileArrows(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
  resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>,
): readonly ResolvedArrowPrimitive[] {
  const activeDrag = session?.activeDragDelta;
  const draggedIds = new Set(activeDrag?.entityIds ?? []);
  const dragDx = activeDrag?.deltaScreenNormX ?? 0;
  const dragDy = activeDrag?.deltaScreenNormY ?? 0;
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  return frame.slide.arrows.map((arrow) => {
    const isArrowDragged = draggedIds.has(arrow.id);
    const aDx = isArrowDragged ? dragDx : 0;
    const aDy = isArrowDragged ? dragDy : 0;

    const sourcePlayer = arrow.sourcePlayerId
      ? resolvedPlayersMap.get(arrow.sourcePlayerId)
      : undefined;
    const targetPlayer = arrow.targetPlayerId
      ? resolvedPlayersMap.get(arrow.targetPlayerId)
      : undefined;

    let startNorm: ScreenNormPoint;
    if (sourcePlayer) {
      startNorm = sourcePlayer.screenNormPos;
    } else {
      const basePt = arrow.points[0] ?? { x: 0, y: 0 };
      startNorm = toScreenNormPoint(basePt.x + aDx, basePt.y + aDy, false);
    }

    let endNorm: ScreenNormPoint;
    if (targetPlayer) {
      endNorm = targetPlayer.screenNormPos;
    } else {
      const basePt = arrow.points[arrow.points.length - 1] ?? {
        x: 100,
        y: 100,
      };
      endNorm = toScreenNormPoint(basePt.x + aDx, basePt.y + aDy, false);
    }

    const startPx = screenNormToStagePixel(startNorm, viewport);
    const endPx = screenNormToStagePixel(endNorm, viewport);

    let cpPx: ReturnType<typeof toStagePixelPoint> | undefined;
    if (arrow.controlPoint) {
      const cpNorm = toScreenNormPoint(
        arrow.controlPoint.x + aDx,
        arrow.controlPoint.y + aDy,
        false,
      );
      cpPx = screenNormToStagePixel(cpNorm, viewport);
    }
```

#### After
```ts
import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixelPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { ResolvedPlayerInternal } from './compile-billboards';
import {
  calculateLastSegmentAngle,
  computeArrowDimensions,
  generateWavyLinePoints,
  offsetArrowEndpoints,
  subdivideQuadraticBezier,
  trimFlatPoints,
} from './geometry-primitives';
import type {
  EphemeralSessionState,
  ResolvedArrowPrimitive,
  ResolvedBillboardPlayerItem,
  ResolvedConnectLinePrimitive,
} from './scene-graph-dto';

export function compileConnectLines(
  billboardPlayers: readonly ResolvedBillboardPlayerItem[],
  resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>,
  scale: number,
): readonly ResolvedConnectLinePrimitive[] {
  const connectLines: ResolvedConnectLinePrimitive[] = [];

  for (const playerItem of billboardPlayers) {
    for (const line of playerItem.player.connectLines) {
      const targetPlayer = resolvedPlayersMap.get(line.toPlayerId);
      if (!targetPlayer) continue;

      const fromPos = playerItem.positionPx;
      const toPos = targetPlayer.positionPx;

      let dashArrayPx: readonly number[] = [];
      if (line.lineStyle === 'dashed') {
        dashArrayPx = [Math.round(8 * scale), Math.round(6 * scale)];
      } else if (line.lineStyle === 'dotted') {
        dashArrayPx = [Math.round(3 * scale), Math.round(3 * scale)];
      }

      connectLines.push({
        id: line.id,
        fromPlayerId: playerItem.id,
        toPlayerId: line.toPlayerId,
        flatPointsPx: [fromPos.x, fromPos.y, toPos.x, toPos.y],
        color: line.color,
        strokeWidthPx: Math.max(
          1,
          Math.round((line.strokeWidth ?? 3.5) * scale),
        ),
        dashArrayPx,
        visible: line.visible !== false,
      });
    }
  }

  return connectLines;
}

export function compileArrows(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
  resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>,
): readonly ResolvedArrowPrimitive[] {
  const activeDrag = session?.activeDragDelta;
  const draggedIds = new Set(activeDrag?.entityIds ?? []);
  const dragDx = activeDrag?.deltaScreenNormX ?? 0;
  const dragDy = activeDrag?.deltaScreenNormY ?? 0;
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;
  const pitchTransform = frame.slide.pitchTransform;

  return frame.slide.arrows.map((arrow) => {
    const isArrowDragged = draggedIds.has(arrow.id);
    const aDx = isArrowDragged ? dragDx : 0;
    const aDy = isArrowDragged ? dragDy : 0;

    const sourcePlayer = arrow.sourcePlayerId
      ? resolvedPlayersMap.get(arrow.sourcePlayerId)
      : undefined;
    const targetPlayer = arrow.targetPlayerId
      ? resolvedPlayersMap.get(arrow.targetPlayerId)
      : undefined;

    let startPx: StagePixelPoint;
    if (sourcePlayer) {
      startPx = sourcePlayer.positionPx;
    } else {
      const basePt = arrow.points[0] ?? { x: 0, y: 0 };
      const rawStartNorm = toScreenNormPoint(basePt.x + aDx, basePt.y + aDy, false);
      const rawStartPx = screenNormToStagePixel(rawStartNorm, viewport);
      startPx = projectStagePixelWithPitchTransform(
        rawStartPx,
        viewport,
        pitchTransform,
      );
    }

    let endPx: StagePixelPoint;
    if (targetPlayer) {
      endPx = targetPlayer.positionPx;
    } else {
      const basePt = arrow.points[arrow.points.length - 1] ?? {
        x: 100,
        y: 100,
      };
      const rawEndNorm = toScreenNormPoint(basePt.x + aDx, basePt.y + aDy, false);
      const rawEndPx = screenNormToStagePixel(rawEndNorm, viewport);
      endPx = projectStagePixelWithPitchTransform(
        rawEndPx,
        viewport,
        pitchTransform,
      );
    }

    let cpPx: StagePixelPoint | undefined;
    if (arrow.controlPoint) {
      const cpNorm = toScreenNormPoint(
        arrow.controlPoint.x + aDx,
        arrow.controlPoint.y + aDy,
        false,
      );
      const rawCpPx = screenNormToStagePixel(cpNorm, viewport);
      cpPx = projectStagePixelWithPitchTransform(
        rawCpPx,
        viewport,
        pitchTransform,
      );
    }
```

---

### 1-3. `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`

`resolveSceneGraphFromState` に `options?: ResolveSceneGraphOptions` を追加し、Konva ボード用の `useResolvedSceneGraph` では `{ applyPitchTransform: false }` を渡して親 `<Group>` との二重変形を防止する。

#### Before (L50-L136)
```ts
export function resolveSceneGraphFromState(params: {
  readonly project: DomainTacticalProject;
  readonly session: EphemeralSessionState;
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;
  readonly viewport: StageViewport;
}): ResolvedSceneGraphDTO {
  const { project, session, isPlaying, timeMs, viewport } = params;

  const activePhase: DomainTacticalPhase | undefined =
    project.phases.find((p) => p.id === session.activePhaseId) ??
    project.phases[0];

  let frame: EvaluatedTimelineFrame;
  let prevSlide: DomainSlide | null = null;

  if (isPlaying && activePhase) {
    frame = evaluateTimelineFrame(activePhase, timeMs);
    prevSlide =
      frame.slideIndex > 0 ? activePhase.slides[frame.slideIndex - 1] : null;
  } else {
    const activeSlide =
      activePhase?.slides.find((s) => s.id === session.activeSlideId) ??
      activePhase?.slides[0] ??
      createFallbackSlide();

    const slideIndex =
      activePhase?.slides.findIndex((s) => s.id === activeSlide.id) ?? -1;
    prevSlide =
      activePhase && slideIndex > 0 ? activePhase.slides[slideIndex - 1] : null;

    frame = evaluateStaticSlideFrame(activeSlide, activeSlide.index ?? 0);
  }

  return compileSceneGraph(frame, session, viewport, prevSlide);
}

export function useResolvedSceneGraph(
  viewport: StageViewport,
): ResolvedSceneGraphDTO {
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const timeMs = usePlaybackStore((s) => s.timeMs);

  const session: EphemeralSessionState = useMemo(
    () => ({
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    }),
    [
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    ],
  );

  return useMemo(
    () =>
      resolveSceneGraphFromState({
        project,
        session,
        isPlaying,
        timeMs,
        viewport,
      }),
    [
      project,
      session,
      isPlaying,
      timeMs,
      viewport.width,
      viewport.height,
      viewport.offsetX,
      viewport.offsetY,
    ],
  );
}
```

#### After
```ts
export interface ResolveSceneGraphOptions {
  /**
   * false の場合、compileSceneGraph 内での pitchTransform 投影をスキップする。
   * Konva ボードのように親 <Group> が既に pan/zoom 変形を担っている場合は false を指定し二重変形を防ぐ。
   */
  readonly applyPitchTransform?: boolean;
}

export function resolveSceneGraphFromState(params: {
  readonly project: DomainTacticalProject;
  readonly session: EphemeralSessionState;
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;
  readonly viewport: StageViewport;
  readonly options?: ResolveSceneGraphOptions;
}): ResolvedSceneGraphDTO {
  const { project, session, isPlaying, timeMs, viewport, options } = params;

  const activePhase: DomainTacticalPhase | undefined =
    project.phases.find((p) => p.id === session.activePhaseId) ??
    project.phases[0];

  let frame: EvaluatedTimelineFrame;
  let prevSlide: DomainSlide | null = null;

  if (isPlaying && activePhase) {
    frame = evaluateTimelineFrame(activePhase, timeMs);
    prevSlide =
      frame.slideIndex > 0 ? activePhase.slides[frame.slideIndex - 1] : null;
  } else {
    const activeSlide =
      activePhase?.slides.find((s) => s.id === session.activeSlideId) ??
      activePhase?.slides[0] ??
      createFallbackSlide();

    const slideIndex =
      activePhase?.slides.findIndex((s) => s.id === activeSlide.id) ?? -1;
    prevSlide =
      activePhase && slideIndex > 0 ? activePhase.slides[slideIndex - 1] : null;

    frame = evaluateStaticSlideFrame(activeSlide, activeSlide.index ?? 0);
  }

  if (options?.applyPitchTransform === false && frame.slide.pitchTransform) {
    frame = {
      ...frame,
      slide: {
        ...frame.slide,
        pitchTransform: undefined,
      },
    };
  }

  return compileSceneGraph(frame, session, viewport, prevSlide);
}

export function useResolvedSceneGraph(
  viewport: StageViewport,
): ResolvedSceneGraphDTO {
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const timeMs = usePlaybackStore((s) => s.timeMs);

  const session: EphemeralSessionState = useMemo(
    () => ({
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    }),
    [
      activePhaseId,
      activeSlideId,
      selectedIds,
      activeDragDelta,
      drawingPreview,
    ],
  );

  return useMemo(
    () =>
      resolveSceneGraphFromState({
        project,
        session,
        isPlaying,
        timeMs,
        viewport,
        options: { applyPitchTransform: false },
      }),
    [
      project,
      session,
      isPlaying,
      timeMs,
      viewport.width,
      viewport.height,
      viewport.offsetX,
      viewport.offsetY,
    ],
  );
}
```

---

### 1-4. `[MODIFY]` `src/lib/tactical/compiler/__tests__/scene-compiler.test.ts`

`pitchTransform` が指定された際にゾーン・矢印・ビルボード要素がすべて統一的に投影されることを検証するテストを追加する。

#### Before (L212-L244)
```ts
  it('5. projects stage pixels with pitchTransform and computes tilt depth key', () => {
    const pt = toStagePixelPoint(500, 400); // Center in 1000x800
    const projectedCenter = projectStagePixelWithPitchTransform(pt, viewport, {
      zoom: 1.5,
      panX: 0,
      panY: 0,
      tilt: 45,
      isLocked: false,
    });
    // Center stays at center
    expect(projectedCenter.x).toBeCloseTo(500, 1);
    expect(projectedCenter.y).toBeCloseTo(400, 1);

    const offCenter = toStagePixelPoint(600, 500);
    const projectedOffCenter = projectStagePixelWithPitchTransform(
      offCenter,
      viewport,
      {
        zoom: 2,
        panX: 10,
        panY: 10,
        tilt: 30,
        isLocked: false,
      },
    );
    expect(projectedOffCenter.x).not.toBe(600);
    expect(projectedOffCenter.y).not.toBe(500);

    const depthTilt0 = computeBillboardDepthKey(pt, 'player', 0);
    const depthTilt60 = computeBillboardDepthKey(pt, 'player', 60);
    expect(depthTilt60).toBeLessThan(depthTilt0);
  });
});
```

#### After
```ts
  it('5. projects stage pixels with pitchTransform and computes tilt depth key', () => {
    const pt = toStagePixelPoint(500, 400); // Center in 1000x800
    const projectedCenter = projectStagePixelWithPitchTransform(pt, viewport, {
      zoom: 1.5,
      panX: 0,
      panY: 0,
      tilt: 45,
      isLocked: false,
    });
    // Center stays at center
    expect(projectedCenter.x).toBeCloseTo(500, 1);
    expect(projectedCenter.y).toBeCloseTo(400, 1);

    const offCenter = toStagePixelPoint(600, 500);
    const projectedOffCenter = projectStagePixelWithPitchTransform(
      offCenter,
      viewport,
      {
        zoom: 2,
        panX: 10,
        panY: 10,
        tilt: 30,
        isLocked: false,
      },
    );
    expect(projectedOffCenter.x).not.toBe(600);
    expect(projectedOffCenter.y).not.toBe(500);

    const depthTilt0 = computeBillboardDepthKey(pt, 'player', 0);
    const depthTilt60 = computeBillboardDepthKey(pt, 'player', 60);
    expect(depthTilt60).toBeLessThan(depthTilt0);
  });

  it('6. projects zones, arrows, and billboard items uniformly when slide.pitchTransform is set', () => {
    const pitchTransform = {
      zoom: 2,
      panX: 10,
      panY: -10,
      tilt: 20,
      isLocked: false,
    };
    const slide = createBaseSlide({
      pitchTransform,
      zones: [
        {
          id: 'z-poly',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          points: [
            toScreenNormPoint(20, 50, false),
            toScreenNormPoint(40, 50, false),
            toScreenNormPoint(30, 70, false),
          ],
          color: '#22c55e',
          opacity: 0.3,
          strokeColor: '#22c55e',
          strokeOpacity: 0.8,
          strokeWidth: 2,
        },
      ],
      arrows: [
        {
          id: 'a-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            toScreenNormPoint(20, 50, false),
            toScreenNormPoint(80, 50, false),
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      ],
    });

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    const expectedP1 = projectStagePixelWithPitchTransform(
      toStagePixelPoint(200, 400),
      viewport,
      pitchTransform,
    );

    const playerItem = scene.billboardItems.find(
      (item) => item.kind === 'player' && item.id === 'p1',
    );
    expect(playerItem?.positionPx.x).toBeCloseTo(expectedP1.x, 2);
    expect(playerItem?.positionPx.y).toBeCloseTo(expectedP1.y, 2);

    // Zone first vertex is also at (20%, 50%) -> must match player positionPx exactly!
    const zoneDto = scene.zones[0];
    expect(zoneDto.flatPointsPx?.[0]).toBeCloseTo(expectedP1.x, 2);
    expect(zoneDto.flatPointsPx?.[1]).toBeCloseTo(expectedP1.y, 2);

    // Arrow start is also at (20%, 50%) -> must match player positionPx!
    const arrowDto = scene.arrows[0];
    expect(arrowDto.flatPointsPx[0]).toBeCloseTo(expectedP1.x, 2);
    expect(arrowDto.flatPointsPx[1]).toBeCloseTo(expectedP1.y, 2);
  });
});
```

---

### Phase 1 検証コマンド
```bash
bun run ai:check src/lib/tactical/compiler/compile-zones.ts src/lib/tactical/compiler/compile-arrows.ts src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/lib/tactical/compiler/__tests__/scene-compiler.test.ts
```
