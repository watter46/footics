'use client';

import React from 'react';
import { Group } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { GhostTrajectoryArrow } from '@/features/tactical-unified/objects/arrow';
import type { BallState, PlayerTrajectory } from '@/lib/types/tactical-unified';
import { BallGhost } from './ball-ghost';

interface BallGhostTrajectoryProps {
  isSelected?: boolean;
  isDragging?: boolean;
  cleanRender?: boolean;
  hasPrevBall: boolean;
  prevBall?: BallState;
  ball: BallState;
  isBallMoved?: boolean;
  prevPxX: number;
  prevPxY: number;
  radius: number;
  ballImage: HTMLImageElement | null;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onUpdateTrajectory: (traj: PlayerTrajectory | undefined) => void;
}

export const BallGhostTrajectory = React.memo(function BallGhostTrajectory({
  isSelected,
  isDragging,
  cleanRender,
  hasPrevBall,
  prevBall,
  ball,
  isBallMoved: _isBallMoved,
  prevPxX,
  prevPxY,
  radius,
  ballImage,
  stageSize,
  nodesRegistryRef,
  onUpdateTrajectory,
}: BallGhostTrajectoryProps) {
  if (cleanRender) {
    return null;
  }
  if (!isSelected && !isDragging) {
    return null;
  }
  if (!hasPrevBall || !prevBall) {
    return null;
  }

  return (
    <Group>
      <BallGhost
        prevPxX={prevPxX}
        prevPxY={prevPxY}
        radius={radius}
        ballImage={ballImage}
      />
      <GhostTrajectoryArrow
        playerId="ball"
        nodesRegistryRef={nodesRegistryRef}
        startPos={{ x: prevBall.x, y: prevBall.y }}
        endPos={{ x: ball.x, y: ball.y }}
        trajectory={ball.trajectory}
        stageSize={stageSize}
        color="#38bdf8"
        onUpdateTrajectory={onUpdateTrajectory}
      />
    </Group>
  );
});
