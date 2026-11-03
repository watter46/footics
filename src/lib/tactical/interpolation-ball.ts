import type { BallState } from '@/lib/types/tactical-unified';
import { lerp } from './interpolation-geometry';
import { calculateBezierPoint } from './trajectory';

export interface InterpolatedBallState {
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  rotation?: number;
  sizeScale?: number;
}

export const BALL_ROTATION_FACTOR = 7.2;

/**
 * 複数スライド間の累積自転角度を算出
 */
export function calculateAccumulatedBallRotation(
  slides: Array<{ ball?: BallState }>,
  currentSlideIdx: number,
): number {
  let accumulatedRotation = 0;
  for (let i = 0; i < currentSlideIdx; i++) {
    const prevA = slides[i]?.ball;
    const prevB = slides[i + 1]?.ball;
    if (prevA && prevB) {
      const pdx = prevB.x - prevA.x;
      const pdy = prevB.y - prevA.y;
      if (pdx !== 0 || pdy !== 0) {
        const pdir = pdx >= 0 ? 1 : -1;
        const pdist = Math.hypot(pdx, pdy);
        accumulatedRotation += pdir * (pdist * BALL_ROTATION_FACTOR);
      }
    }
  }
  return accumulatedRotation;
}

/**
 * ボールの補間
 */
export function interpolateBall(
  ballA: BallState | undefined,
  ballB: BallState | undefined,
  ease: number,
  startRotation = 0,
): InterpolatedBallState {
  if (!ballA && !ballB) {
    return {
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      rotation: 0,
      sizeScale: 1.0,
    };
  }
  if (!ballA && ballB) {
    return {
      x: ballB.x,
      y: ballB.y,
      visible: ballB.visible,
      opacity: ease,
      rotation: startRotation,
      sizeScale: ballB.sizeScale ?? 1.0,
    };
  }
  if (ballA && !ballB) {
    return {
      x: ballA.x,
      y: ballA.y,
      visible: ballA.visible,
      opacity: 1 - ease,
      rotation: startRotation,
      sizeScale: ballA.sizeScale ?? 1.0,
    };
  }
  if (!ballA || !ballB) {
    return {
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      rotation: 0,
      sizeScale: 1.0,
    };
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

  const dx = ballB.x - ballA.x;
  const dy = ballB.y - ballA.y;
  const isStationary = dx === 0 && dy === 0;
  const dir = dx >= 0 ? 1 : -1;
  const distance = Math.hypot(x - ballA.x, y - ballA.y);
  const rotation = isStationary
    ? startRotation
    : startRotation + dir * (distance * BALL_ROTATION_FACTOR);

  const scaleA = ballA.sizeScale ?? 1.0;
  const scaleB = ballB.sizeScale ?? 1.0;
  const sizeScale = lerp(scaleA, scaleB, ease);

  return {
    x,
    y,
    visible: ballA.visible || ballB.visible,
    opacity: 1,
    rotation,
    sizeScale,
  };
}
