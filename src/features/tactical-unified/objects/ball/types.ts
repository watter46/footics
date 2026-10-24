import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import type { BallState } from '@/lib/types/tactical-unified';

export interface BallObjectProps {
  ball: BallState;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
}

export interface BallGhostProps {
  prevPxX: number;
  prevPxY: number;
  radius: number;
  ballImage: HTMLImageElement | null;
}
