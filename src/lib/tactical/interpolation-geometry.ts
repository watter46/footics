import type { NormalizedPoint } from '@/lib/types/tactical-unified';

/**
 * 2つの数値の線形補間
 */
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

/**
 * 2つの角度 (rad) の最短回転方向での Lerp
 */
export function lerpAngle(startRad: number, endRad: number, t: number): number {
  const diff = (endRad - startRad) % (Math.PI * 2);
  const shortestDiff =
    diff > Math.PI
      ? diff - Math.PI * 2
      : diff < -Math.PI
        ? diff + Math.PI * 2
        : diff;
  return startRad + shortestDiff * t;
}

/**
 * 16進数カラー (#rrggbb) の線形補間
 */
export function interpolateColor(
  colorA: string,
  colorB: string,
  t: number,
): string {
  const clampT = Math.max(0, Math.min(1, t));
  const cleanA = colorA.replace('#', '');
  const cleanB = colorB.replace('#', '');

  if (cleanA.length !== 6 || cleanB.length !== 6) {
    return clampT < 0.5 ? colorA : colorB;
  }

  const rA = Number.parseInt(cleanA.substring(0, 2), 16);
  const gA = Number.parseInt(cleanA.substring(2, 4), 16);
  const bA = Number.parseInt(cleanA.substring(4, 6), 16);

  const rB = Number.parseInt(cleanB.substring(0, 2), 16);
  const gB = Number.parseInt(cleanB.substring(2, 4), 16);
  const bB = Number.parseInt(cleanB.substring(4, 6), 16);

  const r = Math.round(lerp(rA, rB, clampT));
  const g = Math.round(lerp(gA, gB, clampT));
  const b = Math.round(lerp(bA, bB, clampT));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 頂点列の周長（パス距離）を計算
 */
function getPolygonPerimeter(points: NormalizedPoint[], closed = true): number {
  if (points.length <= 1) return 0;
  let total = 0;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  return total;
}

/**
 * 多角形の頂点列を指定した頂点数 targetCount にリサンプリングして均等展開
 */
export function resamplePolygon(
  points: NormalizedPoint[],
  targetCount: number,
  closed = true,
): NormalizedPoint[] {
  if (points.length === 0) return [];
  if (points.length === targetCount) return points.map((p) => ({ ...p }));
  if (points.length === 1) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  const perimeter = getPolygonPerimeter(points, closed);
  if (perimeter === 0) {
    return Array.from({ length: targetCount }, () => ({ ...points[0] }));
  }

  // 累積距離テーブルの作成
  const segLengths: number[] = [];
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    segLengths.push(Math.hypot(p2.x - p1.x, p2.y - p1.y));
  }

  const resampled: NormalizedPoint[] = [];
  const step = closed ? perimeter / targetCount : perimeter / (targetCount - 1);

  for (let k = 0; k < targetCount; k++) {
    const targetDist = k * step;
    let accumulated = 0;
    let segIdx = 0;
    let segT = 0;

    for (let i = 0; i < segLengths.length; i++) {
      const len = segLengths[i];
      if (accumulated + len >= targetDist || i === segLengths.length - 1) {
        segIdx = i;
        const remain = targetDist - accumulated;
        segT = len > 0 ? Math.max(0, Math.min(1, remain / len)) : 0;
        break;
      }
      accumulated += len;
    }

    const p1 = points[segIdx];
    const p2 = points[(segIdx + 1) % points.length];
    resampled.push({
      x: lerp(p1.x, p2.x, segT),
      y: lerp(p1.y, p2.y, segT),
    });
  }

  return resampled;
}

/**
 * 2つの多角形頂点列をスムーズに変形補間（頂点数不一致時も自動リサンプリング）
 */
export function interpolatePolygonPoints(
  pointsA: NormalizedPoint[],
  pointsB: NormalizedPoint[],
  t: number,
  closed = true,
): NormalizedPoint[] {
  if (pointsA.length === 0 && pointsB.length === 0) return [];
  if (pointsA.length === 0) return pointsB.map((p) => ({ ...p }));
  if (pointsB.length === 0) return pointsA.map((p) => ({ ...p }));

  const maxVertices = Math.max(pointsA.length, pointsB.length);
  const normalizedA =
    pointsA.length === maxVertices
      ? pointsA
      : resamplePolygon(pointsA, maxVertices, closed);
  const normalizedB =
    pointsB.length === maxVertices
      ? pointsB
      : resamplePolygon(pointsB, maxVertices, closed);

  return normalizedA.map((pA, idx) => {
    const pB = normalizedB[idx];
    return {
      x: lerp(pA.x, pB.x, t),
      y: lerp(pA.y, pB.y, t),
    };
  });
}

/**
 * 四角形 (Rect) を回転考慮の 4 頂点配列に展開
 */
export function rectToPoints(
  x = 0,
  y = 0,
  width = 20,
  height = 15,
  rotation = 0,
): NormalizedPoint[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const hw = width / 2;
  const hh = height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return localCorners.map((pt) => ({
    x: Math.max(0, Math.min(100, cx + pt.x * cos - pt.y * sin)),
    y: Math.max(0, Math.min(100, cy + pt.x * sin + pt.y * cos)),
  }));
}
