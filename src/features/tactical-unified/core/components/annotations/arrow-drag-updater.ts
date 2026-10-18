import type Konva from 'konva';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { resolveDynamicArrowPoints } from './arrow-geometry';

export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
}

export function updateAttachedArrowPositions(
  arrowNodesMap: Map<string, ArrowNodeEntry> | undefined,
  arrows: ArrowAnnotation[],
  markers: Player[],
  markerId: string,
  curX: number,
  curY: number,
  width: number,
  height: number,
): void {
  if (!arrowNodesMap) return;
  const stageSize = { width, height };

  for (const arrow of arrows) {
    if (
      arrow.sourcePlayerId !== markerId &&
      arrow.targetPlayerId !== markerId
    ) {
      continue;
    }
    const entry = arrowNodesMap.get(arrow.id);
    if (!entry?.node) continue;

    const sPlayer = markers.find((m) => m.id === arrow.sourcePlayerId);
    const tPlayer = markers.find((m) => m.id === arrow.targetPlayerId);

    const isSrc = arrow.sourcePlayerId === markerId;
    const isTgt = arrow.targetPlayerId === markerId;

    const sx = isSrc ? curX : ((arrow.points[0]?.x ?? 0) / 100) * width;
    const sy = isSrc ? curY : ((arrow.points[0]?.y ?? 0) / 100) * height;
    const ex = isTgt ? curX : ((arrow.points[1]?.x ?? 0) / 100) * width;
    const ey = isTgt ? curY : ((arrow.points[1]?.y ?? 0) / 100) * height;

    const effSPlayer =
      sPlayer && isSrc
        ? { ...sPlayer, x: (curX / width) * 100, y: (curY / height) * 100 }
        : sPlayer;
    const effTPlayer =
      tPlayer && isTgt
        ? { ...tPlayer, x: (curX / width) * 100, y: (curY / height) * 100 }
        : tPlayer;

    const pts = resolveDynamicArrowPoints({
      sx,
      sy,
      ex,
      ey,
      cpx: arrow.controlPoint
        ? (arrow.controlPoint.x / 100) * width
        : undefined,
      cpy: arrow.controlPoint
        ? (arrow.controlPoint.y / 100) * height
        : undefined,
      isCurved:
        arrow.curveType === 'curved' ||
        arrow.curveType === 'arc' ||
        arrow.controlPoint !== undefined,
      isWavy: arrow.arrowType === 'dribble',
      isDotEnd: arrow.endMarker === 'dot' || arrow.arrowType === 'route_line',
      dotRadius: Math.max(5, arrow.strokeWidth * 1.6),
      sourcePlayer: effSPlayer,
      targetPlayer: effTPlayer,
      stageSize,
    });

    entry.node.points(pts);
    entry.node.getLayer()?.batchDraw();
  }
}
