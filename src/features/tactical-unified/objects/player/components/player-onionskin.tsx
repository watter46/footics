'use client';

import type React from 'react';
import { Circle, Group, Line, Text } from 'react-konva';

export interface PlayerOnionskinProps {
  stageSize: { width: number; height: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostGroupRef: React.Ref<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostLineRef: React.Ref<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostMarkerGroupRef: React.Ref<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostCircleRef: React.Ref<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostTextRef: React.Ref<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ghostLabelRef: React.Ref<any>;
}

export function PlayerOnionskin({
  stageSize,
  ghostGroupRef,
  ghostLineRef,
  ghostMarkerGroupRef,
  ghostCircleRef,
  ghostTextRef,
  ghostLabelRef,
}: PlayerOnionskinProps) {
  const baseDim = Math.min(stageSize.width, stageSize.height);

  return (
    <Group ref={ghostGroupRef} visible={false} listening={false}>
      <Line
        ref={ghostLineRef}
        points={[0, 0, 0, 0]}
        stroke="#94a3b8"
        strokeWidth={1.5}
        dash={[4, 4]}
        opacity={0.6}
      />
      <Group ref={ghostMarkerGroupRef} opacity={0.4}>
        <Circle
          ref={ghostCircleRef}
          radius={baseDim * 0.032}
          fill="#64748b"
          stroke="#ffffff"
          strokeWidth={1}
        />
        <Text
          ref={ghostTextRef}
          x={-baseDim * 0.032}
          y={-baseDim * 0.032 * 0.55}
          width={baseDim * 0.032 * 2}
          text=""
          fontSize={baseDim * 0.032 * 0.9}
          fill="#ffffff"
          align="center"
          fontStyle="bold"
        />
        <Text
          ref={ghostLabelRef}
          x={-baseDim * 0.032 * 2}
          y={baseDim * 0.032 + 3}
          width={baseDim * 0.032 * 4}
          text=""
          fontSize={baseDim * 0.032 * 0.65}
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={1.5}
          fillAfterStrokeEnabled={true}
          align="center"
        />
      </Group>
    </Group>
  );
}
