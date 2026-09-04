import type Konva from 'konva';
import React from 'react';
import { Circle } from 'react-konva';

export interface ArrowHeadNodeProps {
  isDotEnd: boolean;
  startDotRef: React.RefObject<Konva.Circle | null>;
  endDotRef: React.RefObject<Konva.Circle | null>;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  color: string;
  strokeWidth: number;
  dotRadius: number;
}

export const ArrowHeadNode = React.memo(function ArrowHeadNode({
  isDotEnd,
  startDotRef,
  endDotRef,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  color,
  strokeWidth,
  dotRadius,
}: ArrowHeadNodeProps) {
  if (!isDotEnd) return null;

  return (
    <>
      <Circle
        ref={startDotRef as any}
        x={sPxX}
        y={sPxY}
        radius={dotRadius}
        stroke={color}
        strokeWidth={Math.max(2, strokeWidth)}
        fill="transparent"
        perfectDrawEnabled={false}
        listening={false}
      />
      <Circle
        ref={endDotRef as any}
        x={ePxX}
        y={ePxY}
        radius={dotRadius}
        stroke={color}
        strokeWidth={Math.max(2, strokeWidth)}
        fill="transparent"
        perfectDrawEnabled={false}
        listening={false}
      />
    </>
  );
});
