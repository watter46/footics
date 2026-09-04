'use client';

import type React from 'react';
import { Arrow, Circle, Group, Line, Rect } from 'react-konva';
import type { DrawingState, SelectionBox } from '../types';
import { getWavyPoints } from './annotation-layer';

interface DrawingPreviewLayerProps {
  drawingState: DrawingState | null;
  selectionBox: SelectionBox | null;
}

export const DrawingPreviewLayer: React.FC<DrawingPreviewLayerProps> = ({
  drawingState,
  selectionBox,
}) => {
  return (
    <>
      {/* 描画中プレビュー */}
      {drawingState?.isDrawing && (
        <Group listening={false}>
          {drawingState.tool === 'line' && (
            <Line
              points={[
                drawingState.startX,
                drawingState.startY,
                drawingState.currentX,
                drawingState.currentY,
              ]}
              stroke="#ef4444"
              strokeWidth={2.5}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {drawingState.tool === 'route_line' &&
            (() => {
              const dx = drawingState.currentX - drawingState.startX;
              const dy = drawingState.currentY - drawingState.startY;
              const dist = Math.hypot(dx, dy);
              const dotRadius = 6;
              let sx = drawingState.startX;
              let sy = drawingState.startY;
              let ex = drawingState.currentX;
              let ey = drawingState.currentY;
              if (dist > dotRadius * 2) {
                const ux = dx / dist;
                const uy = dy / dist;
                sx += ux * dotRadius;
                sy += uy * dotRadius;
                ex -= ux * dotRadius;
                ey -= uy * dotRadius;
              }
              return (
                <Group>
                  <Line
                    points={[sx, sy, ex, ey]}
                    stroke="#38bdf8"
                    strokeWidth={3}
                    opacity={0.85}
                    perfectDrawEnabled={false}
                  />
                  <Circle
                    x={drawingState.startX}
                    y={drawingState.startY}
                    radius={dotRadius}
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="transparent"
                    perfectDrawEnabled={false}
                  />
                  <Circle
                    x={drawingState.currentX}
                    y={drawingState.currentY}
                    radius={dotRadius}
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="transparent"
                    perfectDrawEnabled={false}
                  />
                </Group>
              );
            })()}

          {(drawingState.tool === 'arrow_solid' ||
            drawingState.tool === 'arrow-straight') && (
            <Arrow
              points={[
                drawingState.startX,
                drawingState.startY,
                drawingState.currentX,
                drawingState.currentY,
              ]}
              stroke="#38bdf8"
              fill="#38bdf8"
              strokeWidth={3}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {(drawingState.tool === 'arrow_dash' ||
            drawingState.tool === 'arrow-curved') && (
            <Arrow
              points={[
                drawingState.startX,
                drawingState.startY,
                drawingState.currentX,
                drawingState.currentY,
              ]}
              stroke="#ffffff"
              fill="#ffffff"
              strokeWidth={3}
              dash={[6, 4]}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {drawingState.tool === 'arrow_wavy' && (
            <Arrow
              points={getWavyPoints(
                drawingState.startX,
                drawingState.startY,
                drawingState.currentX,
                drawingState.currentY,
              )}
              stroke="#fbbf24"
              fill="#fbbf24"
              strokeWidth={3}
              pointerLength={15}
              pointerWidth={15}
              opacity={0.85}
              perfectDrawEnabled={false}
            />
          )}

          {(drawingState.tool === 'zone_circle' ||
            drawingState.tool === 'zone') && (
            <Line
              points={[
                Math.min(drawingState.startX, drawingState.currentX),
                Math.min(drawingState.startY, drawingState.currentY),
                Math.max(drawingState.startX, drawingState.currentX),
                Math.min(drawingState.startY, drawingState.currentY),
                Math.max(drawingState.startX, drawingState.currentX),
                Math.max(drawingState.startY, drawingState.currentY),
                Math.min(drawingState.startX, drawingState.currentX),
                Math.max(drawingState.startY, drawingState.currentY),
              ]}
              closed
              fill="rgba(239, 68, 68, 0.25)"
              stroke="#ef4444"
              strokeWidth={1.5}
              dash={[4, 4]}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      )}

      {/* 範囲選択 (Marquee Box) プレビュー */}
      {selectionBox && (
        <Rect
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
    </>
  );
};
