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
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;
  const pitchTransform = frame.slide.pitchTransform;

  return frame.slide.arrows.map((arrow) => {
    const sourcePlayer = arrow.sourcePlayerId
      ? resolvedPlayersMap.get(arrow.sourcePlayerId)
      : undefined;
    const targetPlayer = arrow.targetPlayerId
      ? resolvedPlayersMap.get(arrow.targetPlayerId)
      : undefined;

    let startRawPx: StagePixelPoint;
    if (sourcePlayer) {
      startRawPx = screenNormToStagePixel(sourcePlayer.screenNormPos, viewport);
    } else {
      const basePt = arrow.points[0] ?? { x: 0, y: 0 };
      const rawStartNorm = toScreenNormPoint(basePt.x, basePt.y, false);
      startRawPx = screenNormToStagePixel(rawStartNorm, viewport);
    }

    let endRawPx: StagePixelPoint;
    if (targetPlayer) {
      endRawPx = screenNormToStagePixel(targetPlayer.screenNormPos, viewport);
    } else {
      const basePt = arrow.points[arrow.points.length - 1] ?? {
        x: 100,
        y: 100,
      };
      const rawEndNorm = toScreenNormPoint(basePt.x, basePt.y, false);
      endRawPx = screenNormToStagePixel(rawEndNorm, viewport);
    }

    let cpRawPx: StagePixelPoint | undefined;
    if (arrow.controlPoint) {
      const cpNorm = toScreenNormPoint(
        arrow.controlPoint.x,
        arrow.controlPoint.y,
        false,
      );
      cpRawPx = screenNormToStagePixel(cpNorm, viewport);
    }

    const dims = computeArrowDimensions(viewport.width, arrow.strokeWidth);
    const sourceRadius = sourcePlayer ? sourcePlayer.radiusPx : 0;
    const targetRadius = targetPlayer ? targetPlayer.radiusPx : 0;

    const offsetRes = offsetArrowEndpoints({
      startX: startRawPx.x,
      startY: startRawPx.y,
      endX: endRawPx.x,
      endY: endRawPx.y,
      cpX: cpRawPx?.x,
      cpY: cpRawPx?.y,
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
      cpRawPx !== undefined;

    let basePointsPx: number[];
    if (isWavy) {
      basePointsPx = generateWavyLinePoints(
        offsetRes.startX,
        offsetRes.startY,
        offsetRes.endX,
        offsetRes.endY,
      );
    } else if (isCurved) {
      const effectiveCpX =
        cpRawPx?.x ?? (offsetRes.startX + offsetRes.endX) / 2;
      const effectiveCpY =
        cpRawPx?.y ?? (offsetRes.startY + offsetRes.endY) / 2;
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

    const rawFlatPointsPx =
      arrowEffect.progress < 1
        ? trimFlatPoints(basePointsPx, arrowEffect.progress, isWavy)
            .flatPointsPx
        : basePointsPx;

    const flatPointsPx: number[] = [];
    for (let i = 0; i < rawFlatPointsPx.length; i += 2) {
      const projected = projectStagePixelWithPitchTransform(
        toStagePixelPoint(rawFlatPointsPx[i], rawFlatPointsPx[i + 1]),
        viewport,
        pitchTransform,
      );
      flatPointsPx.push(projected.x, projected.y);
    }

    const endAngleRad = calculateLastSegmentAngle(flatPointsPx);

    let dashArrayPx: readonly number[] = [];
    if (arrow.dashArray && arrow.dashArray.length > 0) {
      dashArrayPx = arrow.dashArray.map((d) => Math.round(d * scale));
    } else if (arrow.arrowType === 'run') {
      dashArrayPx = [Math.round(8 * scale), Math.round(6 * scale)];
    }

    const startMarkerPointPx = projectStagePixelWithPitchTransform(
      toStagePixelPoint(offsetRes.startMarkerX, offsetRes.startMarkerY),
      viewport,
      pitchTransform,
    );
    const endMarkerPointPx = projectStagePixelWithPitchTransform(
      toStagePixelPoint(offsetRes.endMarkerX, offsetRes.endMarkerY),
      viewport,
      pitchTransform,
    );

    const controlHandlePx =
      !isWavy && cpRawPx
        ? projectStagePixelWithPitchTransform(
            toStagePixelPoint(
              0.25 * offsetRes.startX + 0.5 * cpRawPx.x + 0.25 * offsetRes.endX,
              0.25 * offsetRes.startY + 0.5 * cpRawPx.y + 0.25 * offsetRes.endY,
            ),
            viewport,
            pitchTransform,
          )
        : undefined;

    return {
      id: arrow.id,
      flatPointsPx,
      startPointPx: toStagePixelPoint(flatPointsPx[0], flatPointsPx[1]),
      endPointPx: toStagePixelPoint(
        flatPointsPx[flatPointsPx.length - 2],
        flatPointsPx[flatPointsPx.length - 1],
      ),
      startMarkerPointPx,
      endMarkerPointPx,
      controlHandlePx,
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
      sourceRadiusPx: sourceRadius,
      targetRadiusPx: targetRadius,
      endAngleRad,
      selected: selectedIds.has(arrow.id),
    };
  });
}
