import type { ArrowAnnotation, Slide } from '@/lib/types/tactical-unified';
import { computeArrowRenderPoints } from './arrow-geometry';
import { normX, normY } from './math-utils';

export interface UseArrowCurveParams {
  arrow: ArrowAnnotation;
  slide: Slide;
  stageSize: { width: number; height: number };
}

export function useArrowCurve({
  arrow,
  slide,
  stageSize,
}: UseArrowCurveParams) {
  const { width, height } = stageSize;
  const rawP0 = arrow.points[0] ?? { x: 20, y: 50 };
  const rawP1 = arrow.points[1] ?? { x: 40, y: 50 };

  const sourcePlayer = arrow.sourcePlayerId
    ? slide.players.find(
        (p) => p.id === arrow.sourcePlayerId && p.area === 'pitch',
      )
    : undefined;

  const targetPlayer = arrow.targetPlayerId
    ? slide.players.find(
        (p) => p.id === arrow.targetPlayerId && p.area === 'pitch',
      )
    : undefined;

  const isAttachedToPlayer = !!sourcePlayer;
  const p0 = sourcePlayer ? { x: sourcePlayer.x, y: sourcePlayer.y } : rawP0;
  const p1 = targetPlayer ? { x: targetPlayer.x, y: targetPlayer.y } : rawP1;

  const sPxX = normX(p0.x, width);
  const sPxY = normY(p0.y, height);
  const ePxX = normX(p1.x, width);
  const ePxY = normY(p1.y, height);

  const isCurved =
    arrow.curveType === 'curved' ||
    arrow.curveType === 'arc' ||
    arrow.controlPoint !== undefined;

  const cpPxX = arrow.controlPoint
    ? normX(arrow.controlPoint.x, width)
    : (sPxX + ePxX) / 2;
  const cpPxY = arrow.controlPoint
    ? normY(arrow.controlPoint.y, height)
    : (sPxY + ePxY) / 2;

  // 2次ベジェ曲線の頂点 M (t=0.5: M = 0.25*P0 + 0.5*P_control + 0.25*P1)
  const midHandlePxX = arrow.controlPoint
    ? 0.25 * sPxX + 0.5 * cpPxX + 0.25 * ePxX
    : (sPxX + ePxX) / 2;
  const midHandlePxY = arrow.controlPoint
    ? 0.25 * sPxY + 0.5 * cpPxY + 0.25 * ePxY
    : (sPxY + ePxY) / 2;

  const isDotEnd =
    arrow.endMarker === 'dot' || arrow.arrowType === 'route_line';
  const dotRadius = Math.max(5, arrow.strokeWidth * 1.6);
  const isWavy = arrow.arrowType === 'dribble';
  const hasArrowHead =
    arrow.arrowHead &&
    arrow.endMarker !== 'none' &&
    arrow.arrowType !== 'line' &&
    !isDotEnd;

  const renderPoints = computeArrowRenderPoints({
    sx: sPxX,
    sy: sPxY,
    ex: ePxX,
    ey: ePxY,
    cpX: cpPxX,
    cpY: cpPxY,
    isCurved,
    isWavy,
    isDotEnd,
    dotRadius,
    sourcePlayer,
    targetPlayer,
    stageSize,
  });

  return {
    rawP0,
    rawP1,
    sourcePlayer,
    targetPlayer,
    isAttachedToPlayer,
    p0,
    p1,
    sPxX,
    sPxY,
    ePxX,
    ePxY,
    isCurved,
    cpPxX,
    cpPxY,
    midHandlePxX,
    midHandlePxY,
    isDotEnd,
    dotRadius,
    isWavy,
    hasArrowHead,
    renderPoints,
  };
}
