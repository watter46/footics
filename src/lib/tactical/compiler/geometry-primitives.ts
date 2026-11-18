import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import { trimRenderPoints } from '@/lib/tactical/engine/effect-geometry';

export interface ArrowDimensions {
  readonly scale: number;
  readonly strokeWidth: number;
  readonly pointerLength: number;
  readonly pointerWidth: number;
  readonly dotRadius: number;
}

export function computeArrowDimensions(
  stageWidth: number,
  baseStrokeWidth = 3,
): ArrowDimensions {
  const scale = stageWidth > 0 ? stageWidth / 1200 : 1;
  const strokeWidth = Math.max(2, Math.round(baseStrokeWidth * scale));
  const pointerLength = Math.max(8, Math.round(15 * scale));
  const pointerWidth = Math.max(8, Math.round(15 * scale));
  const dotRadius = Math.max(5 * scale, strokeWidth * 1.6);
  return { scale, strokeWidth, pointerLength, pointerWidth, dotRadius };
}

export function computePlayerRadiusPx(
  viewport: StageViewport,
  sizeScale = 1.0,
): number {
  const baseDim = Math.min(viewport.width, viewport.height);
  return baseDim * 0.032 * sizeScale;
}

export function computeBallRadiusPx(
  viewport: StageViewport,
  sizeScale = 1.0,
): number {
  const baseDim = Math.min(viewport.width, viewport.height);
  return Math.max(8, baseDim * 0.022) * sizeScale;
}

export function subdivideQuadraticBezier(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
  maxT = 1,
): number[] {
  const clampedMaxT = Math.max(0, Math.min(1, maxT));
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * clampedMaxT;
    const oneMinusT = 1 - t;
    const x =
      oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * endX;
    const y =
      oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}

export function generateWavyLinePoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  wavelength = 24,
  amplitude = 7,
): number[] {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);
  if (dist < 5) return [startX, startY, endX, endY];

  const ux = dx / dist;
  const uy = dy / dist;
  const perpX = -uy;
  const perpY = ux;

  const numCycles = Math.max(1, Math.round(dist / wavelength));
  const steps = numCycles * 16;
  const points: number[] = [];

  for (let i = 0; i <= steps; i++) {
    if (i === steps && dist > 1) {
      points.push(endX - ux * 0.5, endY - uy * 0.5);
    }
    const t = i / steps;
    const baseDist = t * dist;
    const bx = startX + ux * baseDist;
    const by = startY + uy * baseDist;

    const envelope = Math.sin(t * Math.PI);
    const wave = Math.sin(t * numCycles * Math.PI * 2) * amplitude * envelope;

    points.push(bx + perpX * wave, by + perpY * wave);
  }

  return points;
}

export function offsetPointTowards(
  from: { x: number; y: number },
  towards: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  if (distance <= 0) return { x: from.x, y: from.y };
  const dx = towards.x - from.x;
  const dy = towards.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-4 || dist <= distance) {
    return { x: from.x, y: from.y };
  }
  const ratio = distance / dist;
  return {
    x: from.x + dx * ratio,
    y: from.y + dy * ratio,
  };
}

export interface OffsetArrowEndpointsParams {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly cpX?: number;
  readonly cpY?: number;
  readonly sourcePlayerRadius?: number;
  readonly targetPlayerRadius?: number;
  readonly startMarker?: 'none' | 'arrow' | 'dot';
  readonly endMarker?: 'none' | 'arrow' | 'dot';
  readonly dotRadius?: number;
}

export function offsetArrowEndpoints(params: OffsetArrowEndpointsParams): {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly startMarkerX: number;
  readonly startMarkerY: number;
  readonly endMarkerX: number;
  readonly endMarkerY: number;
} {
  const {
    startX,
    startY,
    endX,
    endY,
    cpX,
    cpY,
    sourcePlayerRadius = 0,
    targetPlayerRadius = 0,
    startMarker = 'none',
    endMarker = 'arrow',
    dotRadius = 0,
  } = params;

  const startAim =
    cpX !== undefined && cpY !== undefined
      ? { x: cpX, y: cpY }
      : { x: endX, y: endY };
  const endAim =
    cpX !== undefined && cpY !== undefined
      ? { x: cpX, y: cpY }
      : { x: startX, y: startY };

  const startMarkerOffset =
    startMarker === 'dot'
      ? sourcePlayerRadius > 0
        ? sourcePlayerRadius + dotRadius
        : 0
      : sourcePlayerRadius;
  const endMarkerOffset =
    endMarker === 'dot'
      ? targetPlayerRadius > 0
        ? targetPlayerRadius + dotRadius
        : 0
      : targetPlayerRadius;

  const startLineOffset =
    startMarker === 'dot'
      ? sourcePlayerRadius > 0
        ? sourcePlayerRadius + dotRadius * 2
        : dotRadius
      : sourcePlayerRadius;
  const endLineOffset =
    endMarker === 'dot'
      ? targetPlayerRadius > 0
        ? targetPlayerRadius + dotRadius * 2
        : dotRadius
      : targetPlayerRadius;

  const offStartMarker = offsetPointTowards(
    { x: startX, y: startY },
    startAim,
    startMarkerOffset,
  );
  const offEndMarker = offsetPointTowards(
    { x: endX, y: endY },
    endAim,
    endMarkerOffset,
  );

  const totalDist = Math.hypot(endX - startX, endY - startY);
  if (totalDist > 0 && startLineOffset + endLineOffset >= totalDist) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    return {
      startX: midX,
      startY: midY,
      endX: midX,
      endY: midY,
      startMarkerX: offStartMarker.x,
      startMarkerY: offStartMarker.y,
      endMarkerX: offEndMarker.x,
      endMarkerY: offEndMarker.y,
    };
  }

  const offStart = offsetPointTowards(
    { x: startX, y: startY },
    startAim,
    startLineOffset,
  );
  const offEnd = offsetPointTowards(
    { x: endX, y: endY },
    endAim,
    endLineOffset,
  );

  return {
    startX: offStart.x,
    startY: offStart.y,
    endX: offEnd.x,
    endY: offEnd.y,
    startMarkerX: offStartMarker.x,
    startMarkerY: offStartMarker.y,
    endMarkerX: offEndMarker.x,
    endMarkerY: offEndMarker.y,
  };
}

export function trimFlatPoints(
  flatPointsPx: readonly number[],
  progress: number,
  isWavy = false,
): { flatPointsPx: number[]; endAngleRad: number } {
  if (flatPointsPx.length < 4) {
    return {
      flatPointsPx: [...flatPointsPx],
      endAngleRad: 0,
    };
  }

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < flatPointsPx.length; i += 2) {
    pts.push({ x: flatPointsPx[i], y: flatPointsPx[i + 1] });
  }

  const trimmed = trimRenderPoints(pts, progress, isWavy);
  const result: number[] = [];
  for (const pt of trimmed.trimmedPoints) {
    result.push(pt.x, pt.y);
  }

  return {
    flatPointsPx: result,
    endAngleRad: trimmed.tipAngle,
  };
}

export function calculateLastSegmentAngle(
  flatPointsPx: readonly number[],
): number {
  if (flatPointsPx.length < 4) return 0;
  const len = flatPointsPx.length;
  const dx = flatPointsPx[len - 2] - flatPointsPx[len - 4];
  const dy = flatPointsPx[len - 1] - flatPointsPx[len - 3];
  return Math.atan2(dy, dx);
}
