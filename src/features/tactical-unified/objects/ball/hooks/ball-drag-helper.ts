import type Konva from 'konva';
import {
  clampNorm,
  normToPx,
  pxToNorm,
} from '@/features/tactical-unified/core';

export function setupGhostGroup(
  ghostGroup: Konva.Group | null,
  ghostLine: Konva.Line | null,
  pPxX: number,
  pPxY: number,
  currX: number,
  currY: number,
) {
  if (ghostGroup) {
    ghostGroup.position({ x: pPxX, y: pPxY });
    ghostGroup.visible(true);
    ghostGroup.getLayer()?.batchDraw();
  }
  if (ghostLine) {
    ghostLine.points([pPxX, pPxY, currX, currY]);
  }
}

export function hideGhostGroup(ghostGroup: Konva.Group | null) {
  if (ghostGroup) {
    ghostGroup.visible(false);
    ghostGroup.getLayer()?.batchDraw();
  }
}

export function computeFallbackNormPos(
  node: Konva.Group,
  stageSize: { width: number; height: number },
): { x: number; y: number } {
  const clampedPxX = Math.max(
    -stageSize.width,
    Math.min(stageSize.width * 2, node.x()),
  );
  const clampedPxY = Math.max(
    -stageSize.height,
    Math.min(stageSize.height * 2, node.y()),
  );
  return {
    x: clampNorm(pxToNorm(clampedPxX, stageSize.width), -100, 200),
    y: clampNorm(pxToNorm(clampedPxY, stageSize.height), -100, 200),
  };
}

export function setupBallGhostOnDragStart(
  prevSlideBall: { x: number; y: number; visible?: boolean } | undefined,
  stageSize: { width: number; height: number },
  node: Konva.Group,
  ghostGroup: Konva.Group | null,
  ghostLine: Konva.Line | null,
): { x: number; y: number } | null {
  if (prevSlideBall?.visible) {
    const pPxX = normToPx(prevSlideBall.x, stageSize.width);
    const pPxY = normToPx(prevSlideBall.y, stageSize.height);
    setupGhostGroup(ghostGroup, ghostLine, pPxX, pPxY, node.x(), node.y());
    return { x: pPxX, y: pPxY };
  }
  hideGhostGroup(ghostGroup);
  return null;
}

export function updateBallGhostLine(
  ghostLine: Konva.Line | null,
  prevBallPx: { x: number; y: number } | null,
  node: Konva.Group,
) {
  if (prevBallPx && ghostLine) {
    ghostLine.points([prevBallPx.x, prevBallPx.y, node.x(), node.y()]);
    node.getLayer()?.batchDraw();
  }
}
