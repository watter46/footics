'use client';

import type Konva from 'konva';
import type React from 'react';
import { memo, useEffect, useRef } from 'react';
import { Line } from 'react-konva';
import type { DomainPlayerTrajectory } from '@/lib/types/tactical/domain-entities';
import type {
  CanvasNodesRegistry,
  TrajectoryEffectLineEntry,
} from '../utils/canvas-registry';
import { syncTrajectoryEffectLineKonva } from '../utils/drag-konva-sync';

export interface TrajectoryEffectLineProps {
  playerId: string;
  flatPointsPx: readonly number[];
  color: string;
  dashArrayPx: readonly number[];
  startPx: { x: number; y: number };
  trajectory?: DomainPlayerTrajectory;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export const TrajectoryEffectLine = memo(function TrajectoryEffectLine({
  playerId,
  flatPointsPx,
  color,
  dashArrayPx,
  startPx,
  trajectory,
  stageSize,
  nodesRegistryRef,
}: TrajectoryEffectLineProps) {
  const lineRef = useRef<Konva.Line | null>(null);

  useEffect(() => {
    const registry = nodesRegistryRef?.current;
    if (!registry) return;

    const entry: TrajectoryEffectLineEntry = {
      lineNode: lineRef.current,
      startPx,
      trajectory,
    };
    registry.trajectoryEffectLines.set(playerId, entry);

    const targetNode =
      playerId === 'ball'
        ? registry.ballNode
        : registry.playerNodes.get(playerId);
    if (targetNode && flatPointsPx.length >= 2) {
      const currentPos = targetNode.position();
      const lastX = flatPointsPx[flatPointsPx.length - 2];
      const lastY = flatPointsPx[flatPointsPx.length - 1];
      if (
        Math.abs(currentPos.x - lastX) > 0.01 ||
        Math.abs(currentPos.y - lastY) > 0.01
      ) {
        syncTrajectoryEffectLineKonva(entry, currentPos, stageSize);
      }
    }

    return () => {
      nodesRegistryRef?.current?.trajectoryEffectLines.delete(playerId);
    };
  }, [
    nodesRegistryRef,
    playerId,
    startPx,
    trajectory,
    stageSize,
    flatPointsPx,
  ]);

  return (
    <Line
      ref={lineRef}
      points={flatPointsPx as number[]}
      stroke={color}
      strokeWidth={2}
      dash={dashArrayPx as number[]}
      lineCap="round"
      lineJoin="round"
      listening={false}
      perfectDrawEnabled={false}
    />
  );
});
