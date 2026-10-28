/**
 * animation-node-updater.ts
 * Pure functions for direct Konva node updates during animation playback
 * (Zero React re-render: imperatively mutates Konva node properties)
 */

import type Konva from 'konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { applyDotOffsets } from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import {
  getQuadraticBezierPoints,
  getWavyPoints,
} from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
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
  offsetX = 0,
  offsetY = 0,
) {
  for (const [playerId, pState] of Object.entries(players)) {
    const playerGroup =
      registry.playerNodes.get(playerId) ||
      (pState.id ? registry.playerNodes.get(pState.id) : undefined);
    if (playerGroup) {
      const pxX = offsetX + (pState.x / 100) * stageWidth;
      const pxY = offsetY + (pState.y / 100) * stageHeight;
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
  offsetX = 0,
  offsetY = 0,
) {
  if (!registry.ballNode) return;
  const ballPxX = offsetX + (ball.x / 100) * stageWidth;
  const ballPxY = offsetY + (ball.y / 100) * stageHeight;
  registry.ballNode.position({ x: ballPxX, y: ballPxY });
  registry.ballNode.opacity(ball.opacity);
  registry.ballNode.visible(ball.visible);
  if (typeof registry.ballNode.rotation === 'function') {
    registry.ballNode.rotation(ball.rotation ?? 0);
  }
}

export function updateZoneNodes(
  zones: Record<string, InterpolatedZoneState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
) {
  for (const [zoneId, zState] of Object.entries(zones)) {
    const zoneShape = registry.zoneNodes.get(zoneId);
    if (!zoneShape) continue;

    const opacity = zState.opacity ?? 0.25;
    const alphaHex = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0');
    const fillRGBA = (zState.color || '#22c55e') + alphaHex;
    const strokeColor = zState.strokeColor ?? zState.color ?? '#22c55e';

    zoneShape.visible(zState.visible);
    zoneShape.opacity(1);

    if (zState.shapeType === 'polygon' && 'points' in zoneShape) {
      const pxPoints = zState.points.flatMap((pt) => [
        offsetX + (pt.x / 100) * stageWidth,
        offsetY + (pt.y / 100) * stageHeight,
      ]);
      const polygonNode = zoneShape as unknown as Konva.Line;
      polygonNode.points(pxPoints);
      polygonNode.fill(fillRGBA);
      polygonNode.stroke(strokeColor);
      polygonNode.strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'rect') {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      const cx = offsetX + (normX / 100) * stageWidth + pxW / 2;
      const cy = offsetY + (normY / 100) * stageHeight + pxH / 2;
      zoneShape.position({ x: cx, y: cy });
      const rectNode = zoneShape as unknown as Konva.Rect;
      rectNode.width(pxW);
      rectNode.height(pxH);
      rectNode.offsetX(pxW / 2);
      rectNode.offsetY(pxH / 2);
      rectNode.rotation(zState.rotation || 0);
      rectNode.fill(fillRGBA);
      rectNode.stroke(strokeColor);
      rectNode.strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'ellipse') {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      const cx = offsetX + (normX / 100) * stageWidth + pxW / 2;
      const cy = offsetY + (normY / 100) * stageHeight + pxH / 2;
      zoneShape.position({ x: cx, y: cy });
      const ellipseNode = zoneShape as unknown as Konva.Ellipse;
      ellipseNode.radiusX(pxW / 2);
      ellipseNode.radiusY(pxH / 2);
      ellipseNode.rotation(zState.rotation || 0);
      ellipseNode.fill(fillRGBA);
      ellipseNode.stroke(strokeColor);
      ellipseNode.strokeWidth(zState.strokeWidth);
    }
  }
}

export function updateArrowNodes(
  arrows: Record<string, InterpolatedArrowState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
) {
  for (const [arrowId, aState] of Object.entries(arrows)) {
    const arrowEntry = registry.arrowNodes.get(arrowId);
    if (!arrowEntry?.node) continue;

    const rawP0 = aState.points[0] ?? { x: 20, y: 50 };
    const rawP1 = aState.points[1] ?? { x: 40, y: 50 };
    const sPxX = offsetX + (rawP0.x / 100) * stageWidth;
    const sPxY = offsetY + (rawP0.y / 100) * stageHeight;
    const ePxX = offsetX + (rawP1.x / 100) * stageWidth;
    const ePxY = offsetY + (rawP1.y / 100) * stageHeight;

    const isCurved =
      aState.curveType === 'curved' ||
      aState.curveType === 'arc' ||
      aState.controlPoint !== undefined;
    const isWavy = aState.arrowType === 'dribble';
    const isDotEnd =
      aState.arrowType === 'route_line' || aState.endMarker === 'dot';
    const dotRadius = aState.strokeWidth
      ? Math.max(5, aState.strokeWidth * 1.6)
      : 6;

    const cpPxX =
      isCurved && aState.controlPoint
        ? offsetX + (aState.controlPoint.x / 100) * stageWidth
        : undefined;
    const cpPxY =
      isCurved && aState.controlPoint
        ? offsetY + (aState.controlPoint.y / 100) * stageHeight
        : undefined;

    const { rsx, rsy, rex, rey } = applyDotOffsets(
      sPxX,
      sPxY,
      ePxX,
      ePxY,
      cpPxX,
      cpPxY,
      isCurved,
      isWavy,
      isDotEnd,
      dotRadius,
    );

    let renderPts: number[];
    if (isWavy) {
      renderPts = getWavyPoints(rsx, rsy, rex, rey);
    } else if (isCurved && cpPxX !== undefined && cpPxY !== undefined) {
      renderPts = getQuadraticBezierPoints(rsx, rsy, cpPxX, cpPxY, rex, rey);
    } else {
      renderPts = [rsx, rsy, rex, rey];
    }

    arrowEntry.node.points(renderPts);
    arrowEntry.node.stroke(aState.color);
    arrowEntry.node.fill(aState.color);
    arrowEntry.node.strokeWidth(aState.strokeWidth);
    arrowEntry.node.opacity(aState.opacity);
    arrowEntry.node.visible(aState.visible);

    if (arrowEntry.startDotNode) {
      arrowEntry.startDotNode.position({ x: sPxX, y: sPxY });
      arrowEntry.startDotNode.opacity(aState.opacity);
      arrowEntry.startDotNode.visible(aState.visible);
    }

    if (arrowEntry.endDotNode) {
      arrowEntry.endDotNode.position({ x: ePxX, y: ePxY });
      arrowEntry.endDotNode.opacity(aState.opacity);
      arrowEntry.endDotNode.visible(aState.visible);
    }
  }
}

export function updateTextNodes(
  texts: Record<string, InterpolatedTextState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
) {
  for (const [textId, tState] of Object.entries(texts)) {
    const textNode = registry.textNodes.get(textId);
    if (!textNode) continue;
    const pxX = offsetX + (tState.x / 100) * stageWidth;
    const pxY = offsetY + (tState.y / 100) * stageHeight;
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
    registry.stage?.batchDraw();
  }
}
