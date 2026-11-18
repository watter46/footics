import type React from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import type { ResolvedBillboardBallItem } from '@/lib/tactical/compiler/scene-graph-dto';
import type { DomainBallState } from '@/lib/types/tactical/domain-entities';

export interface BallObjectProps {
  ball: DomainBallState;
  resolvedBall: ResolvedBillboardBallItem;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  isInteractive?: boolean;
}

export interface BallGhostProps {
  prevPxX: number;
  prevPxY: number;
  radius: number;
  ballImage: HTMLImageElement | null;
}
