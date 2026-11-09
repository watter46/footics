/**
 * animation-zone-updater.ts
 * Pure functions for zone Konva node updates during animation playback
 */
import type Konva from 'konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import type { InterpolatedZoneState } from '@/lib/tactical/unified-interpolation';

function isKonvaLine(shape: Konva.Shape): shape is Konva.Line {
  return 'points' in shape;
}

function isKonvaRect(shape: Konva.Shape): shape is Konva.Rect {
  return 'width' in shape && 'height' in shape;
}

function isKonvaEllipse(shape: Konva.Shape): shape is Konva.Ellipse {
  return 'radiusX' in shape && 'radiusY' in shape;
}

export function updateZoneNodes(
  zones: Record<string, InterpolatedZoneState>,
  registry: CanvasNodesRegistry,
  stageWidth: number,
  stageHeight: number,
  offsetX = 0,
  offsetY = 0,
): void {
  for (const [zoneId, zState] of Object.entries(zones)) {
    const zoneShape = registry.zoneNodes.get(zoneId);
    if (!zoneShape) continue;

    const opacity = zState.opacity ?? 0.25;
    const alphaHex = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
      .toString(16)
      .padStart(2, '0');
    const fillRGBA = (zState.color || '#22c55e') + alphaHex;

    const strokeOpacity = zState.strokeOpacity ?? 1;
    const strokeAlphaHex = Math.round(
      Math.max(0, Math.min(1, strokeOpacity)) * 255,
    )
      .toString(16)
      .padStart(2, '0');
    const strokeBaseColor = zState.strokeColor ?? zState.color ?? '#22c55e';
    const strokeColorRGBA = strokeBaseColor + strokeAlphaHex;

    zoneShape.visible(zState.visible);
    zoneShape.opacity(1);

    if (zState.shapeType === 'polygon' && isKonvaLine(zoneShape)) {
      const pxPoints = zState.points.flatMap((pt) => [
        offsetX + (pt.x / 100) * stageWidth,
        offsetY + (pt.y / 100) * stageHeight,
      ]);
      zoneShape.points(pxPoints);
      zoneShape.fill(fillRGBA);
      zoneShape.stroke(strokeColorRGBA);
      zoneShape.strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'rect' && isKonvaRect(zoneShape)) {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      const cx = offsetX + (normX / 100) * stageWidth + pxW / 2;
      const cy = offsetY + (normY / 100) * stageHeight + pxH / 2;
      zoneShape.position({ x: cx, y: cy });
      zoneShape.width(pxW);
      zoneShape.height(pxH);
      zoneShape.offsetX(pxW / 2);
      zoneShape.offsetY(pxH / 2);
      zoneShape.rotation(zState.rotation || 0);
      zoneShape.fill(fillRGBA);
      zoneShape.stroke(strokeColorRGBA);
      zoneShape.strokeWidth(zState.strokeWidth);
    } else if (zState.shapeType === 'ellipse' && isKonvaEllipse(zoneShape)) {
      const normX = zState.x ?? zState.points[0]?.x ?? 20;
      const normY = zState.y ?? zState.points[0]?.y ?? 20;
      const normW = zState.width ?? 30;
      const normH = zState.height ?? 20;
      const pxW = (normW / 100) * stageWidth;
      const pxH = (normH / 100) * stageHeight;
      const cx = offsetX + (normX / 100) * stageWidth + pxW / 2;
      const cy = offsetY + (normY / 100) * stageHeight + pxH / 2;
      zoneShape.position({ x: cx, y: cy });
      zoneShape.radiusX(pxW / 2);
      zoneShape.radiusY(pxH / 2);
      zoneShape.rotation(zState.rotation || 0);
      zoneShape.fill(fillRGBA);
      zoneShape.stroke(strokeColorRGBA);
      zoneShape.strokeWidth(zState.strokeWidth);
    }
  }
}
