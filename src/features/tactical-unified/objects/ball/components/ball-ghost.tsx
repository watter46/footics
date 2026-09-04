'use client';

import React from 'react';
import { Circle, Group, Image as KonvaImage } from 'react-konva';
import type { BallGhostProps } from '../types';

export const BallGhost = React.memo(function BallGhost({
  prevPxX,
  prevPxY,
  radius,
  ballImage,
}: BallGhostProps) {
  return (
    <Group x={prevPxX} y={prevPxY} opacity={0.45} listening={false}>
      {ballImage ? (
        <KonvaImage
          image={ballImage}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          perfectDrawEnabled={false}
        />
      ) : (
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth={1.5}
          dash={[3, 2]}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
});
