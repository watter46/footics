import type Konva from 'konva';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';

export function normX(v: number, w: number): number {
  return (v / 100) * w;
}

export function normY(v: number, h: number): number {
  return (v / 100) * h;
}

export function pxToNormX(px: number, w: number): number {
  return (px / w) * 100;
}

export function pxToNormY(py: number, h: number): number {
  return (py / h) * 100;
}

export interface ZoneShapeMetrics {
  pxW: number;
  pxH: number;
  cx: number;
  cy: number;
  rotation: number;
}

export function computeZoneShapeMetrics(
  zone: ZoneAnnotation,
  width: number,
  height: number,
): ZoneShapeMetrics {
  const normPosX = zone.x ?? zone.points[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points[0]?.y ?? 20;
  let normW =
    zone.width ??
    (zone.points.length >= 2
      ? Math.abs(zone.points[1].x - zone.points[0].x)
      : 30);
  let normH =
    zone.height ??
    (zone.points.length >= 4
      ? Math.abs(zone.points[2].y - zone.points[0].y)
      : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = normX(normW, width);
  const pxH = normY(normH, height);
  const cx = normX(normPosX, width) + pxW / 2;
  const cy = normY(normPosY, height) + pxH / 2;
  const rotation = zone.rotation || 0;

  return { pxW, pxH, cx, cy, rotation };
}

export function computeTransformedZonePatch(
  node: Konva.Shape,
  pxW: number,
  pxH: number,
  width: number,
  height: number,
): Partial<ZoneAnnotation> {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  const rot = node.rotation();
  node.scaleX(1);
  node.scaleY(1);

  const newPxW = Math.abs(pxW * scaleX);
  const newPxH = Math.abs(pxH * scaleY);
  const newPxX = node.x() - newPxW / 2;
  const newPxY = node.y() - newPxH / 2;

  const newNormX = pxToNormX(newPxX, width);
  const newNormY = pxToNormY(newPxY, height);
  const newNormW = (newPxW / width) * 100;
  const newNormH = (newPxH / height) * 100;

  return {
    x: newNormX,
    y: newNormY,
    width: newNormW,
    height: newNormH,
    rotation: rot,
    points: [
      { x: newNormX, y: newNormY },
      { x: newNormX + newNormW, y: newNormY },
      { x: newNormX + newNormW, y: newNormY + newNormH },
      { x: newNormX, y: newNormY + newNormH },
    ],
  };
}
