import {
  getBezierControlPoint,
  getBezierMidpoint,
  getQuadraticBezierPoints,
} from '@/lib/tactical/trajectory';
import type { TrajectoryArrowNodeEntry } from '../../utils/canvas-registry';

export function updateTrajectoryArrowPositions(
  trajectoryArrowNodesMap: Map<string, TrajectoryArrowNodeEntry> | undefined,
  targetId: string,
  curX: number,
  curY: number,
  width: number,
  height: number,
): void {
  if (!trajectoryArrowNodesMap) return;
  const entry = trajectoryArrowNodesMap.get(targetId);
  if (!entry?.arrowNode) return;

  const sPxX = entry.startPx.x;
  const sPxY = entry.startPx.y;
  const ePxX = curX;
  const ePxY = curY;

  const dist = Math.hypot(ePxX - sPxX, ePxY - sPxY);
  if (entry.groupNode) {
    entry.groupNode.visible(dist >= 4);
  }

  const isCurved =
    entry.trajectory?.type === 'custom' ||
    entry.trajectory?.type === 'arc_left' ||
    entry.trajectory?.type === 'arc_right' ||
    entry.trajectory?.controlPoint !== undefined;

  const curPosNorm = {
    x: (curX / width) * 100,
    y: (curY / height) * 100,
  };

  const cpNorm = getBezierControlPoint(
    entry.startPos,
    curPosNorm,
    entry.trajectory,
  );
  const cpPxX = (cpNorm.x / 100) * width;
  const cpPxY = (cpNorm.y / 100) * height;

  const midHandlePx = isCurved
    ? getBezierMidpoint(
        { x: sPxX, y: sPxY },
        { x: ePxX, y: ePxY },
        { x: cpPxX, y: cpPxY },
      )
    : { x: (sPxX + ePxX) / 2, y: (sPxY + ePxY) / 2 };

  if (entry.controlHandleNode) {
    entry.controlHandleNode.position(midHandlePx);
  }

  const pts = isCurved
    ? getQuadraticBezierPoints(sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY)
    : [sPxX, sPxY, ePxX, ePxY];

  entry.arrowNode.points(pts);
  entry.arrowNode.getLayer()?.batchDraw();
}
