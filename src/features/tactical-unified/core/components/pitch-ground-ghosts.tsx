'use client';

import type React from 'react';
import type { ReactNode } from 'react';
import { Group } from 'react-konva';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import type {
  DomainPlayer,
  DomainPlayerTrajectory,
} from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';

export type DomainPitchPlayer = Extract<DomainPlayer, { area: 'pitch' }>;

export interface PitchGroundGhostsProps {
  visibleMarkers: readonly DomainPitchPlayer[];
  prevPlayers: readonly DomainPitchPlayer[];
  selectedIds: readonly string[];
  isDragging?: boolean;
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

export function PitchGroundGhosts({
  visibleMarkers,
  prevPlayers,
  selectedIds,
  isDragging = false,
  stageSize,
  activeSlideId,
  nodesRegistryRef,
  aspectRatio,
  onUpdateTrajectory,
}: PitchGroundGhostsProps): ReactNode {
  return visibleMarkers.map((marker) => {
    if (!selectedIds.includes(marker.id) && !isDragging) return null;
    const prevPlayer = prevPlayers.find((p) => p.id === marker.id);
    if (!prevPlayer) {
      return null;
    }
    return (
      <Group key={`ghost-${marker.id}`} id={`ghost-trajectory-${marker.id}`}>
        <PlayerGhostTrajectory
          player={marker}
          prevPlayer={prevPlayer}
          stageSize={stageSize}
          activeSlideId={activeSlideId}
          nodesRegistryRef={nodesRegistryRef}
          aspectRatio={aspectRatio}
          onUpdateTrajectory={onUpdateTrajectory as never}
        />
      </Group>
    );
  });
}
