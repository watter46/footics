import type { BallState } from '@/lib/types/tactical-unified';
import { lerp } from './interpolation-geometry';
import { calculateBezierPoint } from './trajectory';

export interface InterpolatedBallState {
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
}

/**
 * ボールの補間
 */
export function interpolateBall(
  ballA: BallState | undefined,
  ballB: BallState | undefined,
  ease: number,
): InterpolatedBallState {
  if (!ballA && !ballB) {
    return { x: 50, y: 50, visible: true, opacity: 1 };
  }
  if (!ballA && ballB) {
    return {
      x: ballB.x,
      y: ballB.y,
      visible: ballB.visible,
      opacity: ease,
    };
  }
  if (ballA && !ballB) {
    return {
      x: ballA.x,
      y: ballA.y,
      visible: ballA.visible,
      opacity: 1 - ease,
    };
  }
  if (!ballA || !ballB) {
    return { x: 50, y: 50, visible: true, opacity: 1 };
  }

  let x: number;
  let y: number;
  if (ballB.trajectory && ballB.trajectory.type !== 'straight') {
    const pt = calculateBezierPoint(
      { x: ballA.x, y: ballA.y },
      { x: ballB.x, y: ballB.y },
      ease,
      ballB.trajectory,
    );
    x = pt.x;
    y = pt.y;
  } else {
    x = lerp(ballA.x, ballB.x, ease);
    y = lerp(ballA.y, ballB.y, ease);
  }

  return {
    x,
    y,
    visible: ballA.visible || ballB.visible,
    opacity: 1,
  };
}
