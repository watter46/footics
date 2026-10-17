'use client';

import type { ReactNode } from 'react';
import {
  Arrow as KonvaArrow,
  Line as KonvaLine,
  Rect as KonvaRect,
  Layer,
} from 'react-konva';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface DrawingPreviewLayerProps {
  width: number;
  height: number;
}

export function DrawingPreviewLayer({
  width,
  height,
}: DrawingPreviewLayerProps): ReactNode {
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);

  if (!drawingPreview?.isDrawing) {
    return <Layer listening={false} />;
  }

  const { tool, startX, startY, currentX, currentY, points } = drawingPreview;
  const sPxX = (startX / 100) * width;
  const sPxY = (startY / 100) * height;
  const cPxX = (currentX / 100) * width;
  const cPxY = (currentY / 100) * height;

  const isArrowTool = [
    'pass',
    'move',
    'dribble',
    'defend',
    'run',
    'line',
    'arrow',
  ].includes(tool);
  const isZoneTool = ['zone', 'rect'].includes(tool);

  return (
    <Layer listening={false}>
      {isArrowTool && (
        <KonvaArrow
          points={[sPxX, sPxY, cPxX, cPxY]}
          stroke={color}
          strokeWidth={strokeWidth}
          fill={color}
          pointerLength={10}
          pointerWidth={10}
          lineCap="round"
          lineJoin="round"
          dash={tool === 'dribble' ? [6, 4] : undefined}
          listening={false}
        />
      )}

      {isZoneTool && (
        <KonvaRect
          x={Math.min(sPxX, cPxX)}
          y={Math.min(sPxY, cPxY)}
          width={Math.abs(cPxX - sPxX)}
          height={Math.abs(cPxY - sPxY)}
          fill={color}
          opacity={0.3}
          stroke={color}
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
          listening={false}
        />
      )}

      {tool === 'freehand' && points && points.length > 2 && (
        <KonvaLine
          points={points.map((p, i) =>
            i % 2 === 0 ? (p / 100) * width : (p / 100) * height,
          )}
          stroke={color}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
    </Layer>
  );
}
