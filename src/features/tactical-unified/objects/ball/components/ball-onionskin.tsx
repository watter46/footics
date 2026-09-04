'use client';

import React from 'react';
import { Circle, Group, Line } from 'react-konva';
import type { BallOnionskinProps } from '../types';

export const BallOnionskin = React.memo(function BallOnionskin({
  ghostGroupRef,
  ghostLineRef,
  radius,
}: BallOnionskinProps) {
  return (
    <Group ref={ghostGroupRef} visible={false} listening={false}>
      <Line
        ref={ghostLineRef}
        points={[]}
        stroke="#fbbf24"
        strokeWidth={2}
        dash={[4, 4]}
        opacity={0.65}
        listening={false}
        perfectDrawEnabled={false}
      />
      <Circle
        radius={radius}
        fill="#fbbf24"
        stroke="#ffffff"
        strokeWidth={1.5}
        dash={[3, 3]}
        opacity={0.35}
        shadowColor="#000000"
        shadowBlur={3}
        shadowOpacity={0.3}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
});
