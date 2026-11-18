'use client';

import type Konva from 'konva';
import type React from 'react';
import { useRef } from 'react';
import { Circle, Group, Text } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { GhostTrajectoryArrow } from '@/features/tactical-unified/objects/arrow';
import { getLastName } from '@/lib/tactical/player-formatting';
import type {
  DomainPlayer,
  DomainPlayerTrajectory,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import { normX, normY } from '../types';

export interface PlayerGhostTrajectoryProps {
  player: PitchPlayer;
  prevPlayer: DomainPlayer;
  stageSize: { width: number; height: number };
  activeSlideId: string;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  aspectRatio?: AspectRatio;
  onUpdateTrajectory: (
    slideId: string,
    playerId: string,
    trajectory: DomainPlayerTrajectory | undefined,
  ) => void;
}

export function PlayerGhostTrajectory({
  player,
  prevPlayer,
  stageSize,
  activeSlideId,
  nodesRegistryRef,
  aspectRatio,
  onUpdateTrajectory,
}: PlayerGhostTrajectoryProps) {
  const { width, height } = stageSize;
  const baseDim = Math.min(width, height);
  const sizeScale = prevPlayer.style.sizeScale ?? 1.0;
  const isVerticalAspect = aspectRatio === '4:5' || aspectRatio === '9:16';
  const verticalScale = isVerticalAspect ? 0.85 : 1.0;
  const radius = baseDim * 0.032 * sizeScale * verticalScale;

  const sPxX = normX(prevPlayer.x, width);
  const sPxY = normY(prevPlayer.y, height);
  const ePxX = normX(player.x, width);
  const ePxY = normY(player.y, height);
  const isMoved = Math.hypot(ePxX - sPxX, ePxY - sPxY) >= 4;
  const ghostGroupRef = useRef<Konva.Group>(null);

  return (
    <Group>
      {/* ── 1つ前のスライドの位置（ゴーストマーカー） ── */}
      <Group
        ref={ghostGroupRef}
        x={sPxX}
        y={sPxY}
        visible={isMoved}
        opacity={0.45}
        listening={false}
      >
        <Circle
          radius={radius}
          fill={prevPlayer.style.color}
          stroke="#ffffff"
          strokeWidth={1.5}
          dash={[3, 2]}
          perfectDrawEnabled={false}
        />
        {prevPlayer.shirtNo && (
          <Text
            x={-radius}
            y={-radius * 0.55}
            width={radius * 2}
            text={prevPlayer.shirtNo}
            fontSize={radius * 0.9 * (prevPlayer.style.numberSizeScale ?? 1.0)}
            fill="#ffffff"
            align="center"
            fontStyle="bold"
            perfectDrawEnabled={false}
          />
        )}
        {prevPlayer.name && (
          <Text
            x={-radius * 2}
            y={radius + 3}
            width={radius * 4}
            text={getLastName(prevPlayer.name)}
            fontSize={radius * 0.65 * (prevPlayer.style.labelSizeScale ?? 1.0)}
            fill="#ffffff"
            stroke="#020617"
            strokeWidth={1.5}
            fillAfterStrokeEnabled={true}
            align="center"
            fontStyle="bold"
            perfectDrawEnabled={false}
          />
        )}
      </Group>

      {/* ── 移動軌道矢印 & 制御ポインタ (ツールバー矢印と完全同一の安定仕様) ── */}
      <GhostTrajectoryArrow
        playerId={player.id}
        nodesRegistryRef={nodesRegistryRef}
        ghostGroupRef={ghostGroupRef}
        startPos={{ x: prevPlayer.x, y: prevPlayer.y }}
        endPos={{ x: player.x, y: player.y }}
        trajectory={player.trajectory}
        stageSize={stageSize}
        color="#38bdf8"
        onUpdateTrajectory={(traj) =>
          onUpdateTrajectory(activeSlideId, player.id, traj)
        }
      />
    </Group>
  );
}
