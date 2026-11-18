import type Konva from 'konva';
import React from 'react';
import { Circle } from 'react-konva';

export interface ArrowHeadNodeProps {
  hasStartDot: boolean;
  hasEndDot: boolean;
  startDotRef: React.RefObject<Konva.Circle | null>;
  endDotRef: React.RefObject<Konva.Circle | null>;
  startDotPx: { x: number; y: number };
  endDotPx: { x: number; y: number };
  color: string;
  strokeWidth: number;
  dotRadius: number;
}

export const ArrowHeadNode = React.memo(function ArrowHeadNode({
  hasStartDot,
  hasEndDot,
  startDotRef,
  endDotRef,
  startDotPx,
  endDotPx,
  color,
  strokeWidth,
  dotRadius,
}: ArrowHeadNodeProps) {
  if (!hasStartDot && !hasEndDot) return null;

  return (
    <>
      {hasStartDot && (
        <Circle
          ref={startDotRef}
          x={startDotPx.x}
          y={startDotPx.y}
          radius={dotRadius}
          stroke={color}
          strokeWidth={Math.max(2, strokeWidth)}
          fill="transparent"
          perfectDrawEnabled={false}
          listening={false}
        />
      )}
      {hasEndDot && (
        <Circle
          ref={endDotRef}
          x={endDotPx.x}
          y={endDotPx.y}
          radius={dotRadius}
          stroke={color}
          strokeWidth={Math.max(2, strokeWidth)}
          fill="transparent"
          perfectDrawEnabled={false}
          listening={false}
        />
      )}
    </>
  );
});
