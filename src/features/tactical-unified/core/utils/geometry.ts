import type { KonvaEventObject } from 'konva/lib/Node';

export function isPointInPolygon(
  point: { x: number; y: number },
  vs: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i]?.x ?? 0;
    const yi = vs[i]?.y ?? 0;
    const xj = vs[j]?.x ?? 0;
    const yj = vs[j]?.y ?? 0;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number },
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y)),
  );
}

export function getPointerCoordinates(
  e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>,
  vRect: { width: number; height: number },
): { pixelPos: { x: number; y: number }; normPos: { x: number; y: number } } {
  const stage = e.target.getStage();
  const pointer = stage?.getPointerPosition();
  const evt = e.evt;
  const x = pointer?.x ?? ('clientX' in evt ? evt.clientX : 0);
  const y = pointer?.y ?? ('clientY' in evt ? evt.clientY : 0);
  const normX = vRect.width > 0 ? (x / vRect.width) * 100 : 0;
  const normY = vRect.height > 0 ? (y / vRect.height) * 100 : 0;
  return {
    pixelPos: { x, y },
    normPos: {
      x: Math.max(0, Math.min(100, normX)),
      y: Math.max(0, Math.min(100, normY)),
    },
  };
}
