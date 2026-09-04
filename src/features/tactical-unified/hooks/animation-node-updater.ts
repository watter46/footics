/**
 * animation-node-updater.ts
 * Pure functions for direct Konva node updates during animation playback
 * (Zero React re-render: imperatively mutates Konva node properties)
 */

import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/canvas-registry';
import type {
  InterpolatedArrowState,
  InterpolatedBallState,
  InterpolatedPlayerState,
  InterpolatedTextState,
  InterpolatedZoneState,
} from '@/lib/tactical/unified-interpolation';

export function updatePlayerNodes(
  players: Record<string, InterpolatedPlayerState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
) {
  for (const [playerId, pState] of Object.entries(players)) {
    const playerGroup =
      registry.playerNodes.get(playerId) ||
      (pState.id ? registry.playerNodes.get(pState.id) : undefined);
    if (playerGroup) {
      const pxX = (pState.x / 100) * stageWidth;
      const pxY = (pState.y / 100) * stageHeight;
      playerGroup.position({ x: pxX, y: pxY });
      playerGroup.opacity(pState.opacity);
      playerGroup.visible(pState.visible);
    }
  }
}

export function updateBallNode(
  ball: InterpolatedBallState,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
) {
  if (!registry.ballNode) return;
  const ballPxX = (ball.x / 100) * stageWidth;
  const ballPxY = (ball.y / 100) * stageHeight;
  registry.ballNode.position({ x: ballPxX, y: ballPxY });
  registry.ballNode.opacity(ball.opacity);
  registry.ballNode.visible(ball.visible);
}

export function updateZoneNodes(
  zones: Record<string, InterpolatedZoneState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
) {
  for (const [zoneId, zState] of Object.entries(zones)) {
    const zoneShape = registry.zoneNodes.get(zoneId);
    if (!zoneShape) continue;

    const opacity = zState.opacity ?? 0.25;
    const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    const fillRGBA = (zState.color || '#22c55e') + alphaHex;
    const strokeColor = zState.strokeColor ?? zState.color ?? '#22c55e';

    zoneShape.visible(zState.visible);
    zoneShape.opacity(1);

    if (zState.shapeType === 'polygon' && 'points' in zoneShape) {
      const pxPoints = zState.points.flatMap((pt) => [
        (pt.x / 100) * stageWidth,
        (pt.y / 100) * stageHeight,
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).points(pxPoints);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).fill(fillRGBA);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).stroke(strokeColor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'rect') {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxX = (normX / 100) * stageWidth;
      const pxY = (normY / 100) * stageHeight;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      zoneShape.position({ x: pxX, y: pxY });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).width(pxW);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).height(pxH);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).rotation(zState.rotation || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).fill(fillRGBA);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).stroke(strokeColor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'ellipse') {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      const cx = (normX / 100) * stageWidth + pxW / 2;
      const cy = (normY / 100) * stageHeight + pxH / 2;
      zoneShape.position({ x: cx, y: cy });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).radiusX(pxW / 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).radiusY(pxH / 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).rotation(zState.rotation || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).fill(fillRGBA);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).stroke(strokeColor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (zoneShape as any).strokeWidth(zState.strokeWidth);
    }
  }
}

export function updateArrowNodes(
  arrows: Record<string, InterpolatedArrowState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
) {
  for (const [arrowId, aState] of Object.entries(arrows)) {
    const arrowEntry = registry.arrowNodes.get(arrowId);
    if (!arrowEntry?.node) continue;

    const rawP0 = aState.points[0] ?? { x: 20, y: 50 };
    const rawP1 = aState.points[1] ?? { x: 40, y: 50 };
    const sPxX = (rawP0.x / 100) * stageWidth;
    const sPxY = (rawP0.y / 100) * stageHeight;
    const ePxX = (rawP1.x / 100) * stageWidth;
    const ePxY = (rawP1.y / 100) * stageHeight;

    let renderPts = [sPxX, sPxY, ePxX, ePxY];
    if (aState.curveType === 'curved' && aState.controlPoint) {
      const cpPxX = (aState.controlPoint.x / 100) * stageWidth;
      const cpPxY = (aState.controlPoint.y / 100) * stageHeight;
      renderPts = [sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY];
    }

    arrowEntry.node.points(renderPts);
    arrowEntry.node.stroke(aState.color);
    arrowEntry.node.fill(aState.color);
    arrowEntry.node.strokeWidth(aState.strokeWidth);
    arrowEntry.node.opacity(aState.opacity);
    arrowEntry.node.visible(aState.visible);
  }
}

export function updateTextNodes(
  texts: Record<string, InterpolatedTextState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
) {
  for (const [textId, tState] of Object.entries(texts)) {
    const textNode = registry.textNodes.get(textId);
    if (!textNode) continue;
    const pxX = (tState.x / 100) * stageWidth;
    const pxY = (tState.y / 100) * stageHeight;
    textNode.position({ x: pxX, y: pxY });
    textNode.text(tState.content);
    textNode.fontSize(tState.fontSize);
    textNode.fill(tState.color);
    textNode.opacity(tState.opacity);
    textNode.visible(tState.visible);
  }
}

export function batchDrawLayers(
  registry: CanvasNodesRegistry,
  synchronous: boolean,
) {
  if (synchronous) {
    registry.backgroundLayer?.draw();
    registry.annotationLayer?.draw();
    registry.playerLayer?.draw();
    registry.ballLayer?.draw();
    registry.stage?.draw();
  } else {
    registry.playerLayer?.batchDraw();
    registry.ballLayer?.batchDraw();
    registry.annotationLayer?.batchDraw();
  }
}
