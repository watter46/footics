'use client';

import type React from 'react';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import type {
  AspectRatio,
  Player,
  PlayerTrajectory,
  Slide,
} from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';

export interface PlayerGhostTrajectoryListProps {
  markers: Player[];
  prevSlide?: { players: Player[] } | null;
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
    trajectory: PlayerTrajectory | undefined,
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
          (p) => p.id === marker.id && p.area === 'pitch',
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
              updatePlayerTrajectory ??
              (() => {
                /* noop */
              })
            }
          />
        );
      })}
    </>
  );
}
