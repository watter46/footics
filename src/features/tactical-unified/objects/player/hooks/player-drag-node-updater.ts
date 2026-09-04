import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/helpers/canvas-registry';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import {
  getBezierControlPoint,
  getBezierMidpoint,
  getQuadraticBezierPoints,
} from '@/lib/tactical/trajectory';
import { normX, normY, type PlayerDragContext } from '../types';

export function updateMovingPlayerNodes(
  ctx: PlayerDragContext,
  registry: CanvasNodesRegistry | undefined,
  dx: number,
  dy: number,
  stageSize: { width: number; height: number },
): void {
  if (!registry) return;
  const { width, height } = stageSize;
  for (const p of ctx.movingPlayers) {
    if (p.id === ctx.draggedPlayerId) continue;
    const pNode = registry.playerNodes.get(p.id);
    if (pNode) {
      pNode.position({
        x: Math.max(0, Math.min(width, p.initialPx.x + dx)),
        y: Math.max(0, Math.min(height, p.initialPx.y + dy)),
      });
    }
  }
}

export function updatePlayerTrajectoryArrows(
  ctx: PlayerDragContext,
  registry: CanvasNodesRegistry | undefined,
  curX: number,
  curY: number,
  dx: number,
  dy: number,
  stageSize: { width: number; height: number },
): void {
  if (!registry) return;
  const { width, height } = stageSize;

  for (const p of ctx.movingPlayers) {
    const entry = registry.trajectoryArrowNodes.get(p.id);
    if (!entry) continue;

    const pX =
      p.id === ctx.draggedPlayerId
        ? curX
        : Math.max(0, Math.min(width, p.initialPx.x + dx));
    const pY =
      p.id === ctx.draggedPlayerId
        ? curY
        : Math.max(0, Math.min(height, p.initialPx.y + dy));
    const { x: sPxX, y: sPxY } = entry.startPx;

    if (Math.hypot(pX - sPxX, pY - sPxY) < 4) {
      entry.groupNode?.visible(false);
      entry.arrowNode?.visible(false);
      entry.controlHandleNode?.visible(false);
      continue;
    }

    entry.groupNode?.visible(true);
    entry.arrowNode?.visible(true);
    entry.controlHandleNode?.visible(true);

    const isCurved =
      entry.trajectory?.type === 'custom' ||
      entry.trajectory?.type === 'arc_left' ||
      entry.trajectory?.type === 'arc_right' ||
      entry.trajectory?.controlPoint !== undefined;

    if (isCurved) {
      const curNorm = { x: (pX / width) * 100, y: (pY / height) * 100 };
      const cpNorm = getBezierControlPoint(
        entry.startPos,
        curNorm,
        entry.trajectory,
      );
      const cpPxX = normX(cpNorm.x, width);
      const cpPxY = normY(cpNorm.y, height);
      entry.arrowNode?.points(
        getQuadraticBezierPoints(sPxX, sPxY, cpPxX, cpPxY, pX, pY),
      );
      entry.controlHandleNode?.position(
        getBezierMidpoint(
          { x: sPxX, y: sPxY },
          { x: pX, y: pY },
          { x: cpPxX, y: cpPxY },
        ),
      );
    } else {
      entry.arrowNode?.points([sPxX, sPxY, pX, pY]);
      entry.controlHandleNode?.position({
        x: (sPxX + pX) / 2,
        y: (sPxY + pY) / 2,
      });
    }
  }
}

export function updateOnionSkinGhostLine(
  prevPlayerPx: { x: number; y: number } | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onionSkinGhostLine: any,
  curX: number,
  curY: number,
): void {
  if (prevPlayerPx && onionSkinGhostLine) {
    onionSkinGhostLine.points([prevPlayerPx.x, prevPlayerPx.y, curX, curY]);
  }
}

export function updateAttachedConnectLines(
  ctx: PlayerDragContext,
  registry: CanvasNodesRegistry | undefined,
  dx: number,
  dy: number,
  stageSize: { width: number; height: number },
): void {
  if (!registry) return;
  const { width, height } = stageSize;

  for (const entry of ctx.attachedConnectLines) {
    const lineEntry = registry.connectLineNodes.get(entry.lineId);
    if (!lineEntry) continue;

    const x1 = entry.isSourceMoved
      ? Math.max(0, Math.min(width, entry.initialP1.x + dx))
      : entry.initialP1.x;
    const y1 = entry.isSourceMoved
      ? Math.max(0, Math.min(height, entry.initialP1.y + dy))
      : entry.initialP1.y;
    const x2 = entry.isTargetMoved
      ? Math.max(0, Math.min(width, entry.initialP2.x + dx))
      : entry.initialP2.x;
    const y2 = entry.isTargetMoved
      ? Math.max(0, Math.min(height, entry.initialP2.y + dy))
      : entry.initialP2.y;

    const p1 = getMarkerBoundaryPoint(
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      entry.sourcePlayer,
      stageSize,
      true,
    );
    const p2 = getMarkerBoundaryPoint(
      { x: x2, y: y2 },
      { x: x1, y: y1 },
      entry.targetPlayer,
      stageSize,
      true,
    );

    const pts = [p1.x, p1.y, p2.x, p2.y];
    lineEntry.glowNode?.points(pts);
    lineEntry.highlightNode?.points(pts);
    lineEntry.coreNode?.points(pts);
  }
}

export function updateAttachedZonesAndTexts(
  ctx: PlayerDragContext,
  registry: CanvasNodesRegistry | undefined,
  dx: number,
  dy: number,
): void {
  if (!registry) return;
  for (const entry of ctx.attachedZones) {
    const zNode = registry.zoneNodes.get(entry.zone.id);
    if (zNode && entry.initialX !== undefined && entry.initialY !== undefined) {
      zNode.position({
        x: entry.initialX + dx + (zNode.width() ?? 0) / 2,
        y: entry.initialY + dy + (zNode.height() ?? 0) / 2,
      });
    }
  }
  for (const entry of ctx.attachedTexts) {
    const tNode = registry.textNodes.get(entry.text.id);
    if (tNode)
      tNode.position({ x: entry.initialX + dx, y: entry.initialY + dy });
  }
}
