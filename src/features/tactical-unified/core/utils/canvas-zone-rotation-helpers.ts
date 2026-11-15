import type Konva from 'konva';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';

export const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/><path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'/><path d='M3 21v-5h5'/></svg>") 12 12, crosshair`;

const IDLE_ROTATION = {
  started: false,
  rotateCenter: { x: 0, y: 0 },
  startMouseAngle: 0,
  startShapeRotation: 0,
};

export function getZonePixelBounds(
  zone: DomainZoneAnnotation,
  stageWidth: number,
  stageHeight: number,
): { pxW: number; pxH: number; cx: number; cy: number; rotation: number } {
  if (zone.shapeType === 'polygon') {
    const xs = zone.points.map((p) => p.x);
    const ys = zone.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const normW = maxX - minX > 0 ? maxX - minX : 20;
    const normH = maxY - minY > 0 ? maxY - minY : 15;
    const pxW = (normW / 100) * stageWidth;
    const pxH = (normH / 100) * stageHeight;
    const cx = ((minX + maxX) / 2 / 100) * stageWidth;
    const cy = ((minY + maxY) / 2 / 100) * stageHeight;
    return { pxW, pxH, cx, cy, rotation: 0 };
  }

  const normW = zone.width > 0 ? zone.width : 20;
  const normH = zone.height > 0 ? zone.height : 15;
  const pxW = (normW / 100) * stageWidth;
  const pxH = (normH / 100) * stageHeight;
  const cx = ((zone.x + normW / 2) / 100) * stageWidth;
  const cy = ((zone.y + normH / 2) / 100) * stageHeight;
  const rotation = zone.rotation ?? 0;

  return { pxW, pxH, cx, cy, rotation };
}

export function checkCornerRotateZone(
  pos: { x: number; y: number },
  zone: DomainZoneAnnotation,
  stageWidth: number,
  stageHeight: number,
): boolean {
  if (zone.shapeType === 'polygon') return false;
  const { pxW, pxH, cx, cy, rotation } = getZonePixelBounds(
    zone,
    stageWidth,
    stageHeight,
  );

  const rad = (rotation * Math.PI) / 180;
  const hw = pxW / 2;
  const hh = pxH / 2;
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
    if (dist >= 6 && dist <= 28) return true;
  }
  return false;
}

export function applyZoneNodeRotation(
  zoneNode: Konva.Node,
  pitchPos: { x: number; y: number },
  rotateCenter: { x: number; y: number },
  startMouseAngle: number,
  startShapeRotation: number,
): number {
  const currentAngle = Math.atan2(
    pitchPos.y - rotateCenter.y,
    pitchPos.x - rotateCenter.x,
  );
  const angleDiffRad = currentAngle - startMouseAngle;
  const angleDiffDeg = (angleDiffRad * 180) / Math.PI;
  const newRotation = (startShapeRotation + angleDiffDeg) % 360;
  zoneNode.rotation(newRotation);
  zoneNode.getLayer()?.batchDraw();
  return newRotation;
}

export function updateRotateCursor(
  container: HTMLDivElement | null,
  isOver: boolean,
): void {
  if (!container) return;
  if (isOver) {
    container.style.cursor = ROTATE_CURSOR;
  } else if (container.style.cursor.includes('data:image/svg+xml')) {
    container.style.cursor = 'default';
  }
}

export function checkAndStartRotation(
  activeTool: string,
  selectedZone: DomainZoneAnnotation | null | undefined,
  isOverRotateZone: boolean,
  isAnchor: boolean,
  pitchPos: { x: number; y: number },
  pitchWidth: number,
  pitchHeight: number,
  container: HTMLDivElement | null,
) {
  if (
    activeTool === 'select' &&
    selectedZone &&
    selectedZone.shapeType !== 'polygon' &&
    isOverRotateZone &&
    !isAnchor
  ) {
    const { cx, cy, rotation } = getZonePixelBounds(
      selectedZone,
      pitchWidth,
      pitchHeight,
    );
    if (container) container.style.cursor = ROTATE_CURSOR;
    return {
      started: true,
      rotateCenter: { x: cx, y: cy },
      startMouseAngle: Math.atan2(pitchPos.y - cy, pitchPos.x - cx),
      startShapeRotation: rotation,
    };
  }
  return IDLE_ROTATION;
}
