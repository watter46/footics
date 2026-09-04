import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import type { Slide } from '@/lib/types/tactical-unified';
import { getQuadraticBezierPoints, getWavyPoints } from './wavy-arrow-math';

type Player = Slide['players'][number];

export interface ComputeArrowPointsParams {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  cpX?: number;
  cpY?: number;
  isCurved: boolean;
  isWavy: boolean;
  isDotEnd: boolean;
  dotRadius: number;
  sourcePlayer?: Player;
  targetPlayer?: Player;
  stageSize: { width: number; height: number };
}

function computeBoundaryEndpoints(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cpX: number | undefined,
  cpY: number | undefined,
  isCurved: boolean,
  sourcePlayer: Player | undefined,
  targetPlayer: Player | undefined,
  stageSize: { width: number; height: number },
) {
  let effSx = sx;
  let effSy = sy;
  let effEx = ex;
  let effEy = ey;

  if (sourcePlayer) {
    const targetPt =
      isCurved && cpX !== undefined && cpY !== undefined
        ? { x: cpX, y: cpY }
        : { x: ex, y: ey };
    const bStart = getMarkerBoundaryPoint(
      { x: sx, y: sy },
      targetPt,
      sourcePlayer,
      stageSize,
      true,
    );
    effSx = bStart.x;
    effSy = bStart.y;
  }

  if (targetPlayer) {
    const sourcePt =
      isCurved && cpX !== undefined && cpY !== undefined
        ? { x: cpX, y: cpY }
        : { x: sx, y: sy };
    const bEnd = getMarkerBoundaryPoint(
      { x: ex, y: ey },
      sourcePt,
      targetPlayer,
      stageSize,
      true,
    );
    effEx = bEnd.x;
    effEy = bEnd.y;
  }

  return { effSx, effSy, effEx, effEy };
}

function applyStraightDotOffsets(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  dotRadius: number,
) {
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.hypot(dx, dy);
  if (dist <= dotRadius * 2) {
    return { rsx: sx, rsy: sy, rex: ex, rey: ey };
  }
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    rsx: sx + ux * dotRadius,
    rsy: sy + uy * dotRadius,
    rex: ex - ux * dotRadius,
    rey: ey - uy * dotRadius,
  };
}

function applyCurvedDotOffsets(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cpX: number | undefined,
  cpY: number | undefined,
  dotRadius: number,
) {
  const curCpX = cpX ?? (sx + ex) / 2;
  const curCpY = cpY ?? (sy + ey) / 2;
  const v0x = curCpX - sx;
  const v0y = curCpY - sy;
  const d0 = Math.hypot(v0x, v0y) || 1;
  const v1x = ex - curCpX;
  const v1y = ey - curCpY;
  const d1 = Math.hypot(v1x, v1y) || 1;

  return {
    rsx: sx + (v0x / d0) * dotRadius,
    rsy: sy + (v0y / d0) * dotRadius,
    rex: ex - (v1x / d1) * dotRadius,
    rey: ey - (v1y / d1) * dotRadius,
  };
}

function applyDotOffsets(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  cpX: number | undefined,
  cpY: number | undefined,
  isCurved: boolean,
  isWavy: boolean,
  isDotEnd: boolean,
  dotRadius: number,
) {
  if (!isDotEnd) {
    return { rsx: sx, rsy: sy, rex: ex, rey: ey };
  }
  if (!isCurved && !isWavy) {
    return applyStraightDotOffsets(sx, sy, ex, ey, dotRadius);
  }
  return applyCurvedDotOffsets(sx, sy, ex, ey, cpX, cpY, dotRadius);
}

export function computeArrowRenderPoints({
  sx,
  sy,
  ex,
  ey,
  cpX,
  cpY,
  isCurved,
  isWavy,
  isDotEnd,
  dotRadius,
  sourcePlayer,
  targetPlayer,
  stageSize,
}: ComputeArrowPointsParams): number[] {
  const { effSx, effSy, effEx, effEy } = computeBoundaryEndpoints(
    sx,
    sy,
    ex,
    ey,
    cpX,
    cpY,
    isCurved,
    sourcePlayer,
    targetPlayer,
    stageSize,
  );

  const { rsx, rsy, rex, rey } = applyDotOffsets(
    effSx,
    effSy,
    effEx,
    effEy,
    cpX,
    cpY,
    isCurved,
    isWavy,
    isDotEnd,
    dotRadius,
  );

  if (isWavy) {
    return getWavyPoints(rsx, rsy, rex, rey);
  }
  if (isCurved && cpX !== undefined && cpY !== undefined) {
    return getQuadraticBezierPoints(rsx, rsy, cpX, cpY, rex, rey);
  }
  return [rsx, rsy, rex, rey];
}

export interface ResolveDynamicPointsParams {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  cpx?: number;
  cpy?: number;
  controlHandlePos?: { x: number; y: number } | null;
  isCurved: boolean;
  isWavy: boolean;
  isDotEnd: boolean;
  dotRadius: number;
  sourcePlayer?: Player;
  targetPlayer?: Player;
  stageSize: { width: number; height: number };
}

export function resolveDynamicArrowPoints({
  sx,
  sy,
  ex,
  ey,
  cpx,
  cpy,
  controlHandlePos,
  isCurved,
  isWavy,
  isDotEnd,
  dotRadius,
  sourcePlayer,
  targetPlayer,
  stageSize,
}: ResolveDynamicPointsParams): number[] {
  const curCpX =
    cpx ??
    (controlHandlePos
      ? 2 * controlHandlePos.x - 0.5 * (sx + ex)
      : (sx + ex) / 2);
  const curCpY =
    cpy ??
    (controlHandlePos
      ? 2 * controlHandlePos.y - 0.5 * (sy + ey)
      : (sy + ey) / 2);

  const isCurrentlyCurved =
    isCurved ||
    cpx !== undefined ||
    cpy !== undefined ||
    (controlHandlePos &&
      Math.hypot(
        controlHandlePos.x - (sx + ex) / 2,
        controlHandlePos.y - (sy + ey) / 2,
      ) > 2);

  return computeArrowRenderPoints({
    sx,
    sy,
    ex,
    ey,
    cpX: curCpX,
    cpY: curCpY,
    isCurved: !!isCurrentlyCurved,
    isWavy,
    isDotEnd,
    dotRadius,
    sourcePlayer,
    targetPlayer,
    stageSize,
  });
}
