'use client';

import type { ReactNode } from 'react';
import {
  Group,
  Arrow as KonvaArrow,
  Circle as KonvaCircle,
  Ellipse as KonvaEllipse,
  Line as KonvaLine,
  Rect as KonvaRect,
} from 'react-konva';
import type { DrawingPreviewState } from '../types';
import {
  getDrawingToolBehavior,
  type PreviewShapeKind,
  resolveToolPreviewColor,
} from '../utils/canvas-drawing-factory';
import { computeArrowDimensions } from './annotations/arrow-geometry';
import { getWavyPoints } from './annotations/wavy-arrow-math';

export interface PreviewShapeRenderContext {
  sPxX: number;
  sPxY: number;
  cPxX: number;
  cPxY: number;
  color: string;
  strokeWidth: number;
  pointerLength?: number;
  pointerWidth?: number;
  dotRadius?: number;
}

export type PreviewShapeRenderer = (
  ctx: PreviewShapeRenderContext,
) => ReactNode;

export const PREVIEW_SHAPE_RENDERERS: Record<
  PreviewShapeKind,
  PreviewShapeRenderer
> = {
  line: ({ sPxX, sPxY, cPxX, cPxY, color, strokeWidth }) => (
    <KonvaLine
      points={[sPxX, sPxY, cPxX, cPxY]}
      stroke={color}
      strokeWidth={strokeWidth}
      opacity={0.85}
      perfectDrawEnabled={false}
    />
  ),
  route_line: ({
    sPxX,
    sPxY,
    cPxX,
    cPxY,
    color,
    strokeWidth,
    dotRadius = 6,
  }) => (
    <Group>
      <KonvaLine
        points={[sPxX, sPxY, cPxX, cPxY]}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.85}
        perfectDrawEnabled={false}
      />
      <KonvaCircle
        x={sPxX}
        y={sPxY}
        radius={dotRadius}
        stroke={color}
        strokeWidth={2}
        fill="transparent"
        perfectDrawEnabled={false}
      />
      <KonvaCircle
        x={cPxX}
        y={cPxY}
        radius={dotRadius}
        stroke={color}
        strokeWidth={2}
        fill="transparent"
        perfectDrawEnabled={false}
      />
    </Group>
  ),
  arrow_solid: ({
    sPxX,
    sPxY,
    cPxX,
    cPxY,
    color,
    strokeWidth,
    pointerLength = 15,
    pointerWidth = 15,
  }) => (
    <KonvaArrow
      points={[sPxX, sPxY, cPxX, cPxY]}
      stroke={color}
      strokeWidth={strokeWidth}
      fill={color}
      pointerLength={pointerLength}
      pointerWidth={pointerWidth}
      opacity={0.85}
      perfectDrawEnabled={false}
    />
  ),
  arrow_dash: ({
    sPxX,
    sPxY,
    cPxX,
    cPxY,
    color,
    strokeWidth,
    pointerLength = 15,
    pointerWidth = 15,
  }) => (
    <KonvaArrow
      points={[sPxX, sPxY, cPxX, cPxY]}
      stroke={color}
      strokeWidth={strokeWidth}
      fill={color}
      dash={[6, 4]}
      pointerLength={pointerLength}
      pointerWidth={pointerWidth}
      opacity={0.85}
      perfectDrawEnabled={false}
    />
  ),
  arrow_wavy: ({
    sPxX,
    sPxY,
    cPxX,
    cPxY,
    color,
    strokeWidth,
    pointerLength = 15,
    pointerWidth = 15,
  }) => (
    <KonvaArrow
      points={getWavyPoints(sPxX, sPxY, cPxX, cPxY)}
      stroke={color}
      strokeWidth={strokeWidth}
      fill={color}
      pointerLength={pointerLength}
      pointerWidth={pointerWidth}
      opacity={0.85}
      perfectDrawEnabled={false}
    />
  ),
  zone_rect: ({ sPxX, sPxY, cPxX, cPxY, color }) => (
    <KonvaRect
      x={Math.min(sPxX, cPxX)}
      y={Math.min(sPxY, cPxY)}
      width={Math.abs(cPxX - sPxX)}
      height={Math.abs(cPxY - sPxY)}
      fill={color}
      opacity={0.25}
      stroke={color}
      strokeWidth={1.5}
      dash={[4, 4]}
      cornerRadius={4}
      perfectDrawEnabled={false}
    />
  ),
  zone_ellipse: ({ sPxX, sPxY, cPxX, cPxY, color }) => (
    <KonvaEllipse
      x={(sPxX + cPxX) / 2}
      y={(sPxY + cPxY) / 2}
      radiusX={Math.abs(cPxX - sPxX) / 2}
      radiusY={Math.abs(cPxY - sPxY) / 2}
      fill={color}
      opacity={0.25}
      stroke={color}
      strokeWidth={1.5}
      dash={[4, 4]}
      perfectDrawEnabled={false}
    />
  ),
};

export function renderDrawingPreviewNode(
  dp: DrawingPreviewState | null | undefined,
  width: number,
  height: number,
  color?: string,
  strokeWidth = 2,
): ReactNode {
  if (!dp?.isDrawing) return null;

  const sPxX = (dp.startX / 100) * width;
  const sPxY = (dp.startY / 100) * height;
  const cPxX = (dp.currentX / 100) * width;
  const cPxY = (dp.currentY / 100) * height;
  const previewColor = resolveToolPreviewColor(dp.tool as string, color);

  const behavior = getDrawingToolBehavior(dp.tool as string);
  const renderer = behavior?.previewKind
    ? PREVIEW_SHAPE_RENDERERS[behavior.previewKind]
    : undefined;

  const dims = computeArrowDimensions(width, strokeWidth);

  return (
    <Group listening={false}>
      {renderer?.({
        sPxX,
        sPxY,
        cPxX,
        cPxY,
        color: previewColor,
        strokeWidth: dims.strokeWidth,
        pointerLength: dims.pointerLength,
        pointerWidth: dims.pointerWidth,
        dotRadius: dims.dotRadius,
      })}
      {dp.points && dp.points.length >= 4 && (
        <KonvaLine
          points={dp.points.map((p, i) =>
            i % 2 === 0 ? (p / 100) * width : (p / 100) * height,
          )}
          stroke={previewColor}
          strokeWidth={dims.strokeWidth}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
