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
import {
  computeArrowDimensions,
  generateWavyLinePoints,
} from './geometry-primitives';
import type {
  DrawingPreviewInput,
  EphemeralSessionState,
  ResolvedArrowPrimitive,
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

export type CompiledDrawingPreview =
  | ResolvedArrowPrimitive
  | ResolvedZonePrimitive
  | ResolvedDrawingPreview;

const ZONE_SHAPE_TOOLS = new Set([
  'zone',
  'zone-rect',
  'zone_circle',
  'zone-ellipse',
]);

const ARROW_LINE_TOOLS = new Set([
  'line',
  'route_line',
  'arrow_solid',
  'arrow-straight',
  'pass',
  'arrow',
  'arrow_dash',
  'arrow-curved',
  'arrow_wavy',
  'dribble',
]);

export function compileDrawingPreview(
  drawingPreview: DrawingPreviewInput | null | undefined,
  viewport: StageViewport,
  style: { readonly color: string; readonly strokeWidth: number },
): CompiledDrawingPreview | null {
  if (!drawingPreview) return null;
  const dp = drawingPreview;
  const startPx = screenNormToStagePixel(dp.startPoint, viewport);
  const currentPx = screenNormToStagePixel(dp.currentPoint, viewport);
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  if (ZONE_SHAPE_TOOLS.has(dp.tool)) {
    const resolvedColor =
      style.color && style.color !== '#ffffff' ? style.color : '#ef4444';
    const shapeType =
      dp.tool === 'zone_circle' || dp.tool === 'zone-ellipse'
        ? 'ellipse'
        : 'rect';
    return {
      id: 'drawing-preview',
      shapeType,
      xPx: startPx.x <= currentPx.x ? startPx.x : currentPx.x,
      yPx: startPx.y <= currentPx.y ? startPx.y : currentPx.y,
      widthPx: Math.abs(currentPx.x - startPx.x),
      heightPx: Math.abs(currentPx.y - startPx.y),
      color: resolvedColor,
      opacity: 0.25,
      strokeColor: resolvedColor,
      strokeOpacity: 1,
      strokeWidthPx: Math.max(1.5, Math.round(style.strokeWidth * scale)),
      visible: true,
      selected: false,
    };
  }

  if (dp.tool === 'polygon_zone') {
    const resolvedColor =
      style.color && style.color !== '#ffffff' ? style.color : '#ef4444';
    const pts = dp.polygonPoints ?? [];
    const flatPointsPx = pts.flatMap((pt) => {
      const px = screenNormToStagePixel(pt, viewport);
      return [px.x, px.y];
    });
    const lastPt = pts[pts.length - 1];
    if (
      !lastPt ||
      lastPt.x !== dp.currentPoint.x ||
      lastPt.y !== dp.currentPoint.y
    ) {
      flatPointsPx.push(currentPx.x, currentPx.y);
    }
    return {
      id: 'drawing-preview',
      shapeType: 'polygon',
      flatPointsPx,
      color: resolvedColor,
      opacity: 0.25,
      strokeColor: resolvedColor,
      strokeOpacity: 1,
      strokeWidthPx: 2,
      visible: true,
      selected: false,
    };
  }

  if (ARROW_LINE_TOOLS.has(dp.tool)) {
    const dims = computeArrowDimensions(viewport.width, style.strokeWidth);
    const isDefaultColor = !style.color || style.color === '#ffffff';
    const resolvedColor = isDefaultColor
      ? dp.tool === 'route_line'
        ? '#38bdf8'
        : dp.tool === 'arrow_wavy'
          ? '#eab308'
          : style.color || '#ffffff'
      : style.color;

    const isWavy = dp.tool === 'arrow_wavy' || dp.tool === 'dribble';
    const flatPointsPx = isWavy
      ? generateWavyLinePoints(startPx.x, startPx.y, currentPx.x, currentPx.y)
      : [startPx.x, startPx.y, currentPx.x, currentPx.y];

    let dashArrayPx: readonly number[] = [];
    let startMarker: 'none' | 'arrow' | 'dot' = 'none';
    let endMarker: 'none' | 'arrow' | 'dot' = 'none';

    if (
      dp.tool === 'dribble' ||
      dp.tool === 'arrow_dash' ||
      dp.tool === 'arrow-curved'
    ) {
      dashArrayPx = [6, 4];
      endMarker = 'arrow';
    } else if (dp.tool === 'arrow_wavy') {
      endMarker = 'arrow';
    } else if (
      dp.tool === 'arrow_solid' ||
      dp.tool === 'arrow-straight' ||
      dp.tool === 'pass' ||
      dp.tool === 'arrow'
    ) {
      endMarker = 'arrow';
    } else if (dp.tool === 'route_line') {
      startMarker = 'dot';
      endMarker = 'dot';
    }

    return {
      id: 'drawing-preview',
      flatPointsPx,
      startPointPx: startPx,
      endPointPx: currentPx,
      color: resolvedColor,
      strokeWidthPx: dims.strokeWidth,
      dashArrayPx,
      dashOffsetPx: 0,
      opacity: 1,
      visible: true,
      startMarker,
      endMarker,
      pointerLengthPx: dims.pointerLength,
      pointerWidthPx: dims.pointerWidth,
      dotRadiusPx: dims.dotRadius,
      endAngleRad: Math.atan2(currentPx.y - startPx.y, currentPx.x - startPx.x),
      selected: false,
    };
  }

  const flatPolygonPointsPx = dp.polygonPoints
    ? dp.polygonPoints.flatMap((pt) => {
        const px = screenNormToStagePixel(pt, viewport);
        return [px.x, px.y];
      })
    : undefined;

  return {
    tool: dp.tool,
    startPointPx: startPx,
    currentPointPx: currentPx,
    flatPolygonPointsPx,
  };
}
