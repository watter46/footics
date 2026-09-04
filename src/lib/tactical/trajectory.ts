export type TrajectoryType = 'straight' | 'arc_left' | 'arc_right' | 'custom';

export interface PlayerTrajectory {
  type: TrajectoryType;
  curveOffset?: number; // -50 〜 +50 (デフォルト: 0)
  controlPoint?: { x: number; y: number }; // カスタム制御点 (0-100%)
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 始点・終点・軌道設定から、2次ベジェ曲線の制御点を算出する
 */
export function getBezierControlPoint(
  p0: Point2D,
  p1: Point2D,
  trajectory?: PlayerTrajectory,
): Point2D {
  if (!trajectory || trajectory.type === 'straight') {
    return {
      x: (p0.x + p1.x) / 2,
      y: (p0.y + p1.y) / 2,
    };
  }

  if (trajectory.type === 'custom') {
    if (trajectory.controlPoint) {
      return trajectory.controlPoint;
    }
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return { x: midX, y: midY };
    const normX = -dy / dist;
    const normY = dx / dist;
    return {
      x: midX + normX * (dist * 0.15),
      y: midY + normY * (dist * 0.15),
    };
  }

  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) {
    return { x: midX, y: midY };
  }

  // 法線ベクトル (進行方向に対して垂直)
  // 右回り (arc_right): 正の法線、左回り (arc_left): 負の法線
  const offsetMultiplier =
    trajectory.type === 'arc_right'
      ? 1
      : trajectory.type === 'arc_left'
        ? -1
        : 1;

  const offsetPercent =
    trajectory.curveOffset !== undefined ? trajectory.curveOffset : 25;
  const actualOffset = (dist * (offsetPercent * offsetMultiplier)) / 100;

  // 法線単位ベクトル: (-dy / dist, dx / dist)
  const normX = -dy / dist;
  const normY = dx / dist;

  return {
    x: midX + normX * actualOffset,
    y: midY + normY * actualOffset,
  };
}

/**
 * 2次ベジェ曲線上の点 (Quadratic Bezier Interpolation) を計算
 */
export function calculateBezierPoint(
  p0: Point2D,
  p1: Point2D,
  t: number,
  trajectory?: PlayerTrajectory,
): Point2D {
  const clampedT = Math.max(0, Math.min(1, t));

  if (!trajectory || trajectory.type === 'straight') {
    // 直線補間
    return {
      x: p0.x * (1 - clampedT) + p1.x * clampedT,
      y: p0.y * (1 - clampedT) + p1.y * clampedT,
    };
  }

  const cp = getBezierControlPoint(p0, p1, trajectory);

  // B(t) = (1-t)^2 * P0 + 2(1-t)t * P_control + t^2 * P1
  const oneMinusT = 1 - clampedT;
  const c0 = oneMinusT * oneMinusT;
  const c1 = 2 * oneMinusT * clampedT;
  const c2 = clampedT * clampedT;

  return {
    x: c0 * p0.x + c1 * cp.x + c2 * p1.x,
    y: c0 * p0.y + c1 * cp.y + c2 * p1.y,
  };
}

/**
 * 2次ベジェ曲線の中間頂点 M (t=0.5) を算出
 * M = 0.25*P0 + 0.5*CP + 0.25*P1
 */
export function getBezierMidpoint(
  p0: Point2D,
  p1: Point2D,
  cp: Point2D,
): Point2D {
  return {
    x: 0.25 * p0.x + 0.5 * cp.x + 0.25 * p1.x,
    y: 0.25 * p0.y + 0.5 * cp.y + 0.25 * p1.y,
  };
}

/**
 * ハンドル中間位置 M から 2次ベジェ曲線の制御点 CP を逆算
 * CP = 2*M - 0.5*(P0 + P1)
 */
export function getControlPointFromMidpoint(
  p0: Point2D,
  p1: Point2D,
  mid: Point2D,
): Point2D {
  return {
    x: 2 * mid.x - 0.5 * (p0.x + p1.x),
    y: 2 * mid.y - 0.5 * (p0.y + p1.y),
  };
}

/**
 * Konva Line / Arrow 用に 2次ベジェ曲線の点列配列 [x0, y0, x1, y1, ...] を生成
 */
export function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
): number[] {
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const oneMinusT = 1 - t;
    const x =
      oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * endX;
    const y =
      oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}
