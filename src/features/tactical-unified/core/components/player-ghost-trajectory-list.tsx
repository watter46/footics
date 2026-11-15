'use client';

import type React from 'react';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import type {
  DomainPlayer,
  DomainPlayerTrajectory,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';

export interface PlayerGhostTrajectoryListProps {
  markers: DomainPlayer[];
  prevSlide?: { players: DomainPlayer[] } | null;
  width: number;
  height: number;
  activeSlideId: string;
  aspectRatio?: AspectRatio;
  nodesRegistryRef?:
    | React.MutableRefObject<CanvasNodesRegistry>
    | React.MutableRefObject<unknown>;
  updatePlayerTrajectory?: (
    slideId: string,
    playerId: string,
    trajectory: DomainPlayerTrajectory | undefined,
  ) => void;
}

export function PlayerGhostTrajectoryList({
  markers,
  prevSlide,
  width,
  height,
  activeSlideId,
  aspectRatio,
  nodesRegistryRef,
  updatePlayerTrajectory,
}: PlayerGhostTrajectoryListProps) {
  if (!prevSlide) return null;

  return (
    <>
      {markers.map((marker) => {
        if (marker.area === 'bench') return null;
        const prevPlayer = prevSlide.players.find(
          (p): p is PitchPlayer => p.id === marker.id && p.area === 'pitch',
        );
        if (!prevPlayer) return null;
        const isMoved =
          Math.hypot(marker.x - prevPlayer.x, marker.y - prevPlayer.y) >= 1;
        if (!isMoved) return null;

        return (
          <PlayerGhostTrajectory
            key={`ghost-${marker.id}`}
            player={marker}
            prevPlayer={prevPlayer}
            stageSize={{ width, height }}
            activeSlideId={activeSlideId}
            nodesRegistryRef={
              nodesRegistryRef as
                | React.MutableRefObject<CanvasNodesRegistry>
                | undefined
            }
            aspectRatio={aspectRatio}
            onUpdateTrajectory={
              updatePlayerTrajectory
                ? (slideId, playerId, trajectory) =>
                    updatePlayerTrajectory(
                      slideId,
                      playerId,
                      trajectory as DomainPlayerTrajectory | undefined,
                    )
                : () => {
                    /* noop */
                  }
            }
          />
        );
      })}
    </>
  );
}
