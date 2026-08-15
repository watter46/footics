import type { ShapeData } from './types';

export const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/></svg>") 12 12, auto`;

export function checkCornerRotateZone(
  pos: { x: number; y: number },
  shape: ShapeData,
): boolean {
  if (shape.type !== 'zone' || shape.x === undefined || shape.y === undefined)
    return false;
  const w = Math.abs(shape.width || 0);
  const h = Math.abs(shape.height || 0);
  if (w === 0 || h === 0) return false;

  const cx = shape.x + w / 2;
  const cy = shape.y + h / 2;
  const rad = ((shape.rotation || 0) * Math.PI) / 180;

  const hw = w / 2;
  const hh = h / 2;

  const cornersLocal = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: -hw, y: hh },
    { x: hw, y: hh },
  ];

  const corners = cornersLocal.map((pt) => ({
    x: cx + pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
    y: cy + pt.x * Math.sin(rad) + pt.y * Math.cos(rad),
  }));

  for (const corner of corners) {
    const dist = Math.hypot(pos.x - corner.x, pos.y - corner.y);
    if (dist >= 6 && dist <= 28) {
      return true;
    }
  }
  return false;
}

export function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}
