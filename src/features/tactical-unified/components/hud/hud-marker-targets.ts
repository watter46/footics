import type React from 'react';
import type { BallState, Player } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../canvas/canvas-registry';

export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HudTarget {
  x: number;
  y: number;
  height: number;
}

export function getPlayerTarget(
  player: Player,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  let pxX = offset.x + (player.x / 100) * offset.width;
  let pxY = offset.y + (player.y / 100) * offset.height;

  const konvaNode = nodesRef?.current?.playerNodes.get(player.id);
  if (konvaNode) {
    const pos =
      typeof konvaNode.getAbsolutePosition === 'function'
        ? konvaNode.getAbsolutePosition()
        : konvaNode.position();
    if (
      typeof pos.x === 'number' &&
      typeof pos.y === 'number' &&
      !Number.isNaN(pos.x)
    ) {
      pxX = pos.x;
      pxY = pos.y;
    }
  }

  const baseDim = Math.min(offset.width, offset.height);
  const radius = baseDim * 0.032 * (player.style?.sizeScale ?? 1.0);
  return { x: pxX, y: pxY, height: radius * 2 };
}

export function getBallTarget(
  ball: BallState,
  offset: HudRect,
  nodesRef?: React.MutableRefObject<CanvasNodesRegistry>,
): HudTarget {
  let pxX = offset.x + (ball.x / 100) * offset.width;
  let pxY = offset.y + (ball.y / 100) * offset.height;

  const ballNode = nodesRef?.current?.ballNode;
  if (ballNode) {
    const pos =
      typeof ballNode.getAbsolutePosition === 'function'
        ? ballNode.getAbsolutePosition()
        : ballNode.position();
    if (typeof pos.x === 'number' && typeof pos.y === 'number') {
      pxX = pos.x;
      pxY = pos.y;
    }
  }

  return { x: pxX, y: pxY, height: 24 };
}
