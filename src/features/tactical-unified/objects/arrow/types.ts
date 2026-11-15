import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type { DomainPlayerTrajectory } from '@/lib/types/tactical/domain-entities';

export interface GhostTrajectoryArrowProps {
  playerId?: string;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  trajectory?: DomainPlayerTrajectory;
  stageSize: { width: number; height: number };
  color?: string;
  onUpdateTrajectory: (trajectory: DomainPlayerTrajectory | undefined) => void;
}
