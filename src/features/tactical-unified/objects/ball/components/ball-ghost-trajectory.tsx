'use client';

import React from 'react';
import { Group } from 'react-konva';
import { GhostTrajectoryArrow } from '@/features/tactical-unified/objects/arrow';
import type { BallState, PlayerTrajectory } from '@/lib/types/tactical-unified';
import { BallGhost } from './ball-ghost';

interface BallGhostTrajectoryProps {
  isSelected: boolean;
  hasPrevBall: boolean;
  prevBall?: BallState;
  ball: BallState;
  isBallMoved: boolean;
  prevPxX: number;
  prevPxY: number;
  radius: number;
  ballImage: HTMLImageElement | null;
  stageSize: { width: number; height: number };
  onUpdateTrajectory: (traj: PlayerTrajectory | undefined) => void;
}

export const BallGhostTrajectory = React.memo(function BallGhostTrajectory({
  isSelected,
  hasPrevBall,
  prevBall,
  ball,
  isBallMoved,
  prevPxX,
  prevPxY,
  radius,
  ballImage,
  stageSize,
  onUpdateTrajectory,
}: BallGhostTrajectoryProps) {
  if (!isSelected || !hasPrevBall || !prevBall || !isBallMoved) {
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
