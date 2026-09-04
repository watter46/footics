import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/objects/canvas';
import type { PlayerTrajectory } from '@/lib/types/tactical-unified';

export interface GhostTrajectoryArrowProps {
  playerId?: string;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  trajectory?: PlayerTrajectory;
  stageSize: { width: number; height: number };
  color?: string;
  onUpdateTrajectory: (trajectory: PlayerTrajectory | undefined) => void;
}
