import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixelPoint,
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
      const rawStartNorm = toScreenNormPoint(
        basePt.x + aDx,
        basePt.y + aDy,
        false,
      );
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
      const rawEndNorm = toScreenNormPoint(
        basePt.x + aDx,
        basePt.y + aDy,
        false,
      );
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

    const dims = computeArrowDimensions(viewport.width, arrow.strokeWidth);
    const sourceRadius = sourcePlayer ? sourcePlayer.radiusPx : 0;
    const targetRadius = targetPlayer ? targetPlayer.radiusPx : 0;

    const offsetRes = offsetArrowEndpoints({
      startX: startPx.x,
      startY: startPx.y,
      endX: endPx.x,
      endY: endPx.y,
      cpX: cpPx?.x,
      cpY: cpPx?.y,
      sourcePlayerRadius: sourceRadius,
      targetPlayerRadius: targetRadius,
      startMarker: arrow.startMarker,
      endMarker: arrow.endMarker,
      dotRadius: dims.dotRadius,
    });

    const isWavy = arrow.arrowType === 'dribble';
    const isCurved =
      arrow.curveType === 'curved' ||
      arrow.curveType === 'arc' ||
      cpPx !== undefined;

    let basePointsPx: number[];
    if (isWavy) {
      basePointsPx = generateWavyLinePoints(
        offsetRes.startX,
        offsetRes.startY,
        offsetRes.endX,
        offsetRes.endY,
      );
    } else if (isCurved) {
      const effectiveCpX = cpPx?.x ?? (offsetRes.startX + offsetRes.endX) / 2;
      const effectiveCpY = cpPx?.y ?? (offsetRes.startY + offsetRes.endY) / 2;
      basePointsPx = subdivideQuadraticBezier(
        offsetRes.startX,
        offsetRes.startY,
        effectiveCpX,
        effectiveCpY,
        offsetRes.endX,
        offsetRes.endY,
      );
    } else {
      basePointsPx = [
        offsetRes.startX,
        offsetRes.startY,
        offsetRes.endX,
        offsetRes.endY,
      ];
    }

    const arrowEffect = frame.arrowProgressMap[arrow.id] ?? {
      progress: 1,
      dashOffset: 0,
      opacity: 1,
      visible: true,
    };

    let flatPointsPx = basePointsPx;
    let endAngleRad = calculateLastSegmentAngle(basePointsPx);

    if (arrowEffect.progress < 1) {
      const trimmed = trimFlatPoints(
        basePointsPx,
        arrowEffect.progress,
        isWavy,
      );
      flatPointsPx = trimmed.flatPointsPx;
      endAngleRad = trimmed.endAngleRad;
    }

    let dashArrayPx: readonly number[] = [];
    if (arrow.dashArray && arrow.dashArray.length > 0) {
      dashArrayPx = arrow.dashArray.map((d) => Math.round(d * scale));
    } else if (arrow.arrowType === 'run' || arrow.arrowType === 'route_line') {
      dashArrayPx = [Math.round(8 * scale), Math.round(6 * scale)];
    }

    return {
      id: arrow.id,
      flatPointsPx,
      startPointPx: toStagePixelPoint(flatPointsPx[0], flatPointsPx[1]),
      endPointPx: toStagePixelPoint(
        flatPointsPx[flatPointsPx.length - 2],
        flatPointsPx[flatPointsPx.length - 1],
      ),
      controlHandlePx: cpPx,
      color: arrow.color,
      strokeWidthPx: dims.strokeWidth,
      dashArrayPx,
      dashOffsetPx: arrowEffect.dashOffset,
      opacity: arrowEffect.opacity,
      visible: arrowEffect.visible,
      startMarker: arrow.startMarker,
      endMarker: arrow.endMarker,
      pointerLengthPx: dims.pointerLength,
      pointerWidthPx: dims.pointerWidth,
      dotRadiusPx: dims.dotRadius,
      endAngleRad,
      selected: selectedIds.has(arrow.id),
    };
  });
}
