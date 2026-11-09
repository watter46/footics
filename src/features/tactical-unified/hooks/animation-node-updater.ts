/**
 * animation-node-updater.ts
 * Pure functions for direct Konva node updates during animation playback
 * (Zero React re-render: imperatively mutates Konva node properties)
 */

import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { applyDotOffsets } from '@/features/tactical-unified/core/components/annotations/arrow-geometry';
import {
  getQuadraticBezierPoints,
  getWavyPoints,
} from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
import { trimRenderPoints } from '@/lib/tactical/effect-geometry';
import type {
  InterpolatedArrowState,
  InterpolatedBallState,
  InterpolatedPlayerState,
  InterpolatedTextState,
} from '@/lib/tactical/unified-interpolation';
import { updatePlayerRippleRings } from './animation-ripple-updater';

export { updateZoneNodes } from './animation-zone-updater';

declare module '@/lib/tactical/interpolation-annotation' {
  interface InterpolatedArrowState {
    dashArray?: number[];
  }
}

export function updatePlayerNodes(
  players: Record<string, InterpolatedPlayerState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
  timeInSlideMs = 0,
  isPlaying = false,
): void {
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

      updatePlayerRippleRings(playerGroup, pState, timeInSlideMs, isPlaying);
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
): void {
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

export function updateArrowNodes(
  arrows: Record<string, InterpolatedArrowState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
): void {
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
    const isWavy =
      aState.arrowType === 'dribble' ||
      (aState.arrowType as string) === 'arrow_wavy';
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

    if (aState.progress !== undefined) {
      const clampedProgress = Math.max(0, Math.min(1, aState.progress));
      const ptsList: { x: number; y: number }[] = [];
      for (let i = 0; i < renderPts.length; i += 2) {
        ptsList.push({ x: renderPts[i], y: renderPts[i + 1] });
      }
      const { trimmedPoints } = trimRenderPoints(ptsList, clampedProgress);
      renderPts = trimmedPoints.flatMap((pt) => [pt.x, pt.y]);

      if (arrowEntry.endDotNode && trimmedPoints.length > 0) {
        const lastPt = trimmedPoints[trimmedPoints.length - 1];
        arrowEntry.endDotNode.position({ x: lastPt.x, y: lastPt.y });
      }
    }

    arrowEntry.node.points(renderPts);
    arrowEntry.node.stroke(aState.color);
    arrowEntry.node.fill(aState.color);
    arrowEntry.node.strokeWidth(aState.strokeWidth);
    arrowEntry.node.opacity(aState.opacity);
    arrowEntry.node.visible(aState.visible);
    arrowEntry.node.dash?.(
      aState.dashArray && aState.dashArray.length > 0 ? aState.dashArray : [],
    );

    if (arrowEntry.startDotNode) {
      arrowEntry.startDotNode.position({ x: sPxX, y: sPxY });
      arrowEntry.startDotNode.opacity(aState.opacity);
      arrowEntry.startDotNode.visible(aState.visible);
    }

    if (arrowEntry.endDotNode) {
      if (aState.progress === undefined) {
        arrowEntry.endDotNode.position({ x: ePxX, y: ePxY });
      }
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
): void {
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
): void {
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
