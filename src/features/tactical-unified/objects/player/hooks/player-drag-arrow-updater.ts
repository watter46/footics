import type { CanvasNodesRegistry } from '@/features/tactical-unified/objects/canvas';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import { getQuadraticBezierPoints } from '@/lib/tactical/trajectory';
import type { AttachedArrowEntry } from '../types';

interface ArrowCoords {
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  cpX?: number;
  cpY?: number;
}

interface EffectiveEndpoints {
  effSx: number;
  effSy: number;
  effEx: number;
  effEy: number;
}

function computeMovedArrowCoords(
  entry: AttachedArrowEntry,
  dx: number,
  dy: number,
): ArrowCoords {
  let { sPxX, sPxY } = { sPxX: entry.initialP0.x, sPxY: entry.initialP0.y };
  let { ePxX, ePxY } = { ePxX: entry.initialP1.x, ePxY: entry.initialP1.y };
  let cpX = entry.initialCp?.x;
  let cpY = entry.initialCp?.y;

  if (entry.isSourceMoved && entry.isTargetMoved) {
    sPxX += dx;
    sPxY += dy;
    ePxX += dx;
    ePxY += dy;
    if (cpX !== undefined && cpY !== undefined) {
      cpX += dx;
      cpY += dy;
    }
  } else if (entry.isSourceMoved) {
    sPxX += dx;
    sPxY += dy;
    if (cpX !== undefined && cpY !== undefined) {
      cpX += dx * 0.5;
      cpY += dy * 0.5;
    }
  } else if (entry.isTargetMoved) {
    ePxX += dx;
    ePxY += dy;
    if (cpX !== undefined && cpY !== undefined) {
      cpX += dx * 0.5;
      cpY += dy * 0.5;
    }
  }
  return { sPxX, sPxY, ePxX, ePxY, cpX, cpY };
}

function updateArrowHandlePositions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles: any,
  entry: AttachedArrowEntry,
  coords: ArrowCoords,
): void {
  const { sPxX, sPxY, ePxX, ePxY, cpX, cpY } = coords;
  if (entry.isSourceMoved && handles.startHandleNode) {
    handles.startHandleNode.position({ x: sPxX, y: sPxY });
  }
  if (entry.isTargetMoved && handles.endHandleNode) {
    handles.endHandleNode.position({ x: ePxX, y: ePxY });
  }
  if (handles.controlHandleNode) {
    const midX =
      cpX !== undefined && cpY !== undefined
        ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
        : (sPxX + ePxX) / 2;
    const midY =
      cpX !== undefined && cpY !== undefined
        ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
        : (sPxY + ePxY) / 2;
    handles.controlHandleNode.position({ x: midX, y: midY });
  }
}

function computeEffectiveEndpoints(
  entry: AttachedArrowEntry,
  coords: ArrowCoords,
  isCurved: boolean,
  stageSize: { width: number; height: number },
): EffectiveEndpoints {
  const { sPxX, sPxY, ePxX, ePxY, cpX, cpY } = coords;
  let effSx = sPxX;
  let effSy = sPxY;
  let effEx = ePxX;
  let effEy = ePxY;

  if (entry.sourcePlayer) {
    const targetPt =
      isCurved && cpX !== undefined && cpY !== undefined
        ? { x: cpX, y: cpY }
        : { x: ePxX, y: ePxY };
    const bStart = getMarkerBoundaryPoint(
      { x: sPxX, y: sPxY },
      targetPt,
      entry.sourcePlayer,
      stageSize,
      true,
    );
    effSx = bStart.x;
    effSy = bStart.y;
  }

  if (entry.targetPlayer) {
    const sourcePt =
      isCurved && cpX !== undefined && cpY !== undefined
        ? { x: cpX, y: cpY }
        : { x: sPxX, y: sPxY };
    const bEnd = getMarkerBoundaryPoint(
      { x: ePxX, y: ePxY },
      sourcePt,
      entry.targetPlayer,
      stageSize,
      true,
    );
    effEx = bEnd.x;
    effEy = bEnd.y;
  }

  return { effSx, effSy, effEx, effEy };
}

function renderArrowNodePoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handles: any,
  entry: AttachedArrowEntry,
  coords: ArrowCoords,
  stageSize: { width: number; height: number },
): void {
  const isCurved =
    entry.arrow.curveType === 'curved' ||
    entry.arrow.curveType === 'arc' ||
    entry.arrow.controlPoint !== undefined;
  const { effSx, effSy, effEx, effEy } = computeEffectiveEndpoints(
    entry,
    coords,
    isCurved,
    stageSize,
  );
  const isDot =
    entry.arrow.endMarker === 'dot' || entry.arrow.arrowType === 'route_line';

  if (isDot && !isCurved) {
    const arrowDx = effEx - effSx;
    const arrowDy = effEy - effSy;
    const len = Math.hypot(arrowDx, arrowDy);
    const dotR = Math.max(5, entry.arrow.strokeWidth * 1.6);
    const ratio = len > 0 ? Math.max(0, len - dotR) / len : 0;
    handles.node.points([
      effSx,
      effSy,
      effSx + arrowDx * ratio,
      effSy + arrowDy * ratio,
    ]);
  } else if (isCurved && coords.cpX !== undefined && coords.cpY !== undefined) {
    handles.node.points(
      getQuadraticBezierPoints(
        effSx,
        effSy,
        coords.cpX,
        coords.cpY,
        effEx,
        effEy,
      ),
    );
  } else {
    handles.node.points([effSx, effSy, effEx, effEy]);
  }
}

export function updateAttachedArrows({
  attachedArrows,
  registry,
  dx,
  dy,
  stageSize,
}: {
  attachedArrows: AttachedArrowEntry[];
  registry: CanvasNodesRegistry | undefined;
  dx: number;
  dy: number;
  stageSize: { width: number; height: number };
}): void {
  if (!registry) return;
  for (const entry of attachedArrows) {
    const handles = registry.arrowNodes.get(entry.arrow.id);
    if (!handles?.node) continue;
    const coords = computeMovedArrowCoords(entry, dx, dy);
    updateArrowHandlePositions(handles, entry, coords);
    renderArrowNodePoints(handles, entry, coords, stageSize);
  }
}
