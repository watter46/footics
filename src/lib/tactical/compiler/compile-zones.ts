import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixel,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  EphemeralSessionState,
  ResolvedDrawingPreview,
  ResolvedZonePrimitive,
} from './scene-graph-dto';

export function compileZones(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): readonly ResolvedZonePrimitive[] {
  const activeDrag = session?.activeDragDelta;
  const draggedIds = new Set(activeDrag?.entityIds ?? []);
  const dragDx = activeDrag?.deltaScreenNormX ?? 0;
  const dragDy = activeDrag?.deltaScreenNormY ?? 0;
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  return frame.slide.zones.map((zone) => {
    const isDragged = draggedIds.has(zone.id);
    const zDx = isDragged ? dragDx : 0;
    const zDy = isDragged ? dragDy : 0;
    const zoneOpacity = frame.zoneOpacityMap[zone.id] ?? {
      opacity: zone.opacity,
      visible: zone.opacity > 0,
    };
    const isSelected = selectedIds.has(zone.id);
    const strokeWidthPx = Math.max(1, Math.round(zone.strokeWidth * scale));

    if (zone.shapeType === 'polygon') {
      const flatPointsPx = zone.points.flatMap((pt) => {
        const px = screenNormToStagePixel(
          toScreenNormPoint(pt.x + zDx, pt.y + zDy, false),
          viewport,
        );
        return [px.x, px.y];
      });

      return {
        id: zone.id,
        shapeType: 'polygon',
        flatPointsPx,
        color: zone.color,
        opacity: zoneOpacity.opacity,
        strokeColor: zone.strokeColor ?? zone.color,
        strokeOpacity: zone.strokeOpacity ?? 1,
        strokeWidthPx,
        visible: zoneOpacity.visible,
        selected: isSelected,
      };
    }

    const pos = screenNormToStagePixel(
      toScreenNormPoint(zone.x + zDx, zone.y + zDy, false),
      viewport,
    );
    const widthPx = (zone.width / 100) * viewport.width;
    const heightPx = (zone.height / 100) * viewport.height;

    return {
      id: zone.id,
      shapeType: zone.shapeType,
      xPx: pos.x as StagePixel,
      yPx: pos.y as StagePixel,
      widthPx,
      heightPx,
      rotationDeg: zone.rotation ?? 0,
      color: zone.color,
      opacity: zoneOpacity.opacity,
      strokeColor: zone.strokeColor ?? zone.color,
      strokeOpacity: zone.strokeOpacity ?? 1,
      strokeWidthPx,
      visible: zoneOpacity.visible,
      selected: isSelected,
    };
  });
}

export function compileDrawingPreview(
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): ResolvedDrawingPreview | null {
  if (!session?.drawingPreview) return null;
  const dp = session.drawingPreview;
  const startPointPx = screenNormToStagePixel(dp.startPoint, viewport);
  const currentPointPx = screenNormToStagePixel(dp.currentPoint, viewport);
  const flatPolygonPointsPx = dp.polygonPoints
    ? dp.polygonPoints.flatMap((pt) => {
        const px = screenNormToStagePixel(pt, viewport);
        return [px.x, px.y];
      })
    : undefined;

  return {
    tool: dp.tool,
    startPointPx,
    currentPointPx,
    flatPolygonPointsPx,
  };
}
