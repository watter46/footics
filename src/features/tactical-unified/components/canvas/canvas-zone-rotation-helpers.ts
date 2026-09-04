import type Konva from 'konva';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';

export const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/><path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'/><path d='M3 21v-5h5'/></svg>") 12 12, crosshair`;

const IDLE_ROTATION = {
  started: false,
  rotateCenter: { x: 0, y: 0 },
  startMouseAngle: 0,
  startShapeRotation: 0,
};

export interface ZoneBoundsInput {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  shapeType?: string;
  points?: Array<{ x: number; y: number }>;
}

export function getZonePixelBounds(
  zone: ZoneBoundsInput,
  stageWidth: number,
  stageHeight: number,
): { pxW: number; pxH: number; cx: number; cy: number; rotation: number } {
  const normPosX = zone.x ?? zone.points?.[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points?.[0]?.y ?? 20;
  let normW =
    zone.width ??
    (zone.points && zone.points.length >= 2
      ? Math.abs(zone.points[1].x - zone.points[0].x)
      : 30);
  let normH =
    zone.height ??
    (zone.points && zone.points.length >= 4
      ? Math.abs(zone.points[2].y - zone.points[0].y)
      : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = (normW / 100) * stageWidth;
  const pxH = (normH / 100) * stageHeight;
  const cx = (normPosX / 100) * stageWidth + pxW / 2;
  const cy = (normPosY / 100) * stageHeight + pxH / 2;
  const rotation = zone.rotation || 0;

  return { pxW, pxH, cx, cy, rotation };
}

export function checkCornerRotateZone(
  pos: { x: number; y: number },
  zone: ZoneBoundsInput,
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
  selectedZone: ZoneAnnotation | null | undefined,
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
