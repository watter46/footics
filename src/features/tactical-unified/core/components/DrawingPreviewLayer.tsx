'use client';

import type { ReactNode } from 'react';
import {
  Group,
  Arrow as KonvaArrow,
  Circle as KonvaCircle,
  Ellipse as KonvaEllipse,
  Line as KonvaLine,
  Rect as KonvaRect,
  Layer,
} from 'react-konva';
import type { SelectionBox } from '../hooks/use-canvas-selection-box';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { getWavyPoints } from './annotations/wavy-arrow-math';

export interface DrawingPreviewLayerProps {
  width: number;
  height: number;
  selectionBox?: SelectionBox | null;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
}

export function DrawingPreviewLayer({
  width,
  height,
  selectionBox,
}: DrawingPreviewLayerProps): ReactNode {
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);

  const dp = drawingPreview;
  const sPxX = dp ? (dp.startX / 100) * width : 0;
  const sPxY = dp ? (dp.startY / 100) * height : 0;
  const cPxX = dp ? (dp.currentX / 100) * width : 0;
  const cPxY = dp ? (dp.currentY / 100) * height : 0;

  return (
    <Layer listening={false}>
      {/* 範囲選択矩形 */}
      {selectionBox && (
        <KonvaRect
          x={Math.min(selectionBox.startX, selectionBox.currentX)}
          y={Math.min(selectionBox.startY, selectionBox.currentY)}
          width={Math.abs(selectionBox.currentX - selectionBox.startX)}
          height={Math.abs(selectionBox.currentY - selectionBox.startY)}
          fill="rgba(56, 189, 248, 0.12)"
          stroke="#38bdf8"
          strokeWidth={1}
          dash={[4, 3]}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* 描画プレビュー */}
      {dp?.isDrawing && (
        <Group listening={false}>
          {dp.tool === 'line' && (
            <KonvaLine
              points={[sPxX, sPxY, cPxX, cPxY]}
              stroke={color}
              strokeWidth={strokeWidth}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {dp.tool === 'route_line' && (
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
                radius={6}
                stroke={color}
                strokeWidth={2}
                fill="transparent"
                perfectDrawEnabled={false}
              />
              <KonvaCircle
                x={cPxX}
                y={cPxY}
                radius={6}
                stroke={color}
                strokeWidth={2}
                fill="transparent"
                perfectDrawEnabled={false}
              />
            </Group>
          )}

          {(dp.tool === 'arrow_solid' || dp.tool === 'arrow-straight') && (
            <KonvaArrow
              points={[sPxX, sPxY, cPxX, cPxY]}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={color}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {(dp.tool === 'arrow_dash' || dp.tool === 'arrow-curved') && (
            <KonvaArrow
              points={[sPxX, sPxY, cPxX, cPxY]}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={color}
              dash={[6, 4]}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {dp.tool === 'arrow_wavy' && (
            <KonvaArrow
              points={getWavyPoints(sPxX, sPxY, cPxX, cPxY)}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={color}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {dp.tool === 'zone_circle' && (
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
          )}

          {dp.tool === 'zone' && (
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
          )}

          {dp.points && dp.points.length >= 4 && (
            <KonvaLine
              points={dp.points.map((p, i) =>
                i % 2 === 0 ? (p / 100) * width : (p / 100) * height,
              )}
              stroke={color}
              strokeWidth={strokeWidth}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      )}
    </Layer>
  );
}
