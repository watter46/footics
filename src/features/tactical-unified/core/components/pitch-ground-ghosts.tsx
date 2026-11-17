'use client';

import type React from 'react';
import type { ReactNode } from 'react';
import { Group } from 'react-konva';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import { resolveEffectiveScreenNormPos } from '@/lib/tactical/compiler/effective-coordinates';
import type { EphemeralDragDelta } from '@/lib/tactical/compiler/scene-graph-dto';
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
  activeDragDelta: EphemeralDragDelta | null | undefined;
  stageSize: { width: number; height: number };
  activeSlideId: string;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  aspectRatio: AspectRatio;
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
  activeDragDelta,
  stageSize,
  activeSlideId,
  nodesRegistryRef,
  aspectRatio,
  onUpdateTrajectory,
}: PitchGroundGhostsProps): ReactNode {
  return visibleMarkers.map((marker) => {
    const effPos = resolveEffectiveScreenNormPos(
      marker,
      marker.id,
      activeDragDelta,
    );
    const isDragged = Boolean(activeDragDelta?.entityIds.includes(marker.id));
    if (!selectedIds.includes(marker.id) && !isDragged) return null;
    const prevPlayer = prevPlayers.find((p) => p.id === marker.id);
    if (
      !prevPlayer ||
      Math.hypot(effPos.x - prevPlayer.x, effPos.y - prevPlayer.y) < 1.0
    ) {
      return null;
    }
    const effMarker = { ...marker, x: effPos.x, y: effPos.y };
    return (
      <Group key={`ghost-${marker.id}`} id={`ghost-trajectory-${marker.id}`}>
        <PlayerGhostTrajectory
          player={effMarker}
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
