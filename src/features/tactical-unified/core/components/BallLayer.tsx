'use client';

import type React from 'react';
import { Layer } from 'react-konva';
import { BallObject } from '@/features/tactical-unified/objects/ball/components/ball-object';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';

export interface BallLayerProps {
  width: number;
  height: number;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function BallLayer({ width, height, nodesRegistryRef }: BallLayerProps) {
  const ball = useCanvasStore((s) => s.ball ?? { x: 50, y: 50, visible: true });

  if (ball.visible === false) return null;

  return (
    <Layer id="ball-layer">
      <BallObject
        ball={ball}
        stageSize={{ width, height }}
        nodesRegistryRef={nodesRegistryRef}
      />
    </Layer>
  );
}
