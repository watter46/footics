import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/helpers/canvas-registry';
import type { BallState } from '@/lib/types/tactical-unified';

export interface BallObjectProps {
  ball: BallState;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export interface BallGhostProps {
  prevPxX: number;
  prevPxY: number;
  radius: number;
  ballImage: HTMLImageElement | null;
}

export interface BallOnionskinProps {
  ghostGroupRef: React.RefObject<any>;
  ghostLineRef: React.RefObject<any>;
  radius: number;
}
