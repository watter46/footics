import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type StagePixel,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DrawingPreviewInput,
  EphemeralSessionState,
  ResolvedDrawingPreview,
  ResolvedZonePrimitive,
} from './scene-graph-dto';

export function compileZones(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): readonly ResolvedZonePrimitive[] {
  const selectedIds = new Set(session?.selectedIds ?? []);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;
  const pitchTransform = frame.slide.pitchTransform;

  return frame.slide.zones.map((zone) => {
    const zoneOpacity = frame.zoneOpacityMap[zone.id] ?? {
      opacity: zone.opacity,
      visible: zone.opacity > 0,
    };
    const isSelected = selectedIds.has(zone.id);
    const strokeWidthPx = Math.max(1, Math.round(zone.strokeWidth * scale));

    if (zone.shapeType === 'polygon') {
      const flatPointsPx = zone.points.flatMap((pt) => {
        const rawPx = screenNormToStagePixel(
          toScreenNormPoint(pt.x, pt.y, false),
          viewport,
        );
        const px = projectStagePixelWithPitchTransform(
          rawPx,
          viewport,
          pitchTransform,
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

    const rawTopLeft = screenNormToStagePixel(
      toScreenNormPoint(zone.x, zone.y, false),
      viewport,
    );
    const rawBottomRight = screenNormToStagePixel(
      toScreenNormPoint(zone.x + zone.width, zone.y + zone.height, false),
      viewport,
    );
    const topLeft = projectStagePixelWithPitchTransform(
      rawTopLeft,
      viewport,
      pitchTransform,
    );
    const bottomRight = projectStagePixelWithPitchTransform(
      rawBottomRight,
      viewport,
      pitchTransform,
    );
    const widthPx = bottomRight.x - topLeft.x;
    const heightPx = bottomRight.y - topLeft.y;

    return {
      id: zone.id,
      shapeType: zone.shapeType,
      xPx: topLeft.x as StagePixel,
      yPx: topLeft.y as StagePixel,
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
  drawingPreview: DrawingPreviewInput | null | undefined,
  viewport: StageViewport,
): ResolvedDrawingPreview | null {
  if (!drawingPreview) return null;
  const dp = drawingPreview;
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
