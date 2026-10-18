'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Group } from 'react-konva';
import { PlayerFocusSpotlight } from '@/features/tactical-unified/objects/player/components/player-focus-spotlight';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { PlayerMarkerLabel } from '@/features/tactical-unified/objects/player/components/player-marker-label';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import { PlayerVisionCone } from '@/features/tactical-unified/objects/player/components/player-vision-cone';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerMarkerItemProps {
  marker: Player;
  width: number;
  height: number;
  baseDim: number;
  markerMode: string;
  isSelected: boolean;
  isInteractive: boolean;
  connectingPlayerId: string | null;
  nodesRegistryRef?: React.MutableRefObject<unknown>;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: Player) => void;
  onClick: (markerId: string, isShift: boolean) => void;
  onUpdateVisionCone: (patch: Record<string, unknown>) => void;
}

export function PlayerMarkerItem({
  marker,
  width,
  height,
  baseDim,
  markerMode,
  isSelected,
  isInteractive,
  connectingPlayerId,
  nodesRegistryRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  onUpdateVisionCone,
}: PlayerMarkerItemProps) {
  const pxX = (marker.x / 100) * width;
  const pxY = (marker.y / 100) * height;
  const sizeScale = marker.style?.sizeScale ?? 1.0;
  const radius = baseDim * 0.032 * sizeScale;
  const numScale = marker.style?.numberSizeScale ?? 1.0;
  const labelScale = marker.style?.labelSizeScale ?? 1.0;
  const displayName = marker.name ? getLastName(marker.name) : '';

  const is3D =
    markerMode === '3d-only' ||
    (markerMode !== '2d-only' && marker.style?.markerType === 'ring');

  return (
    <Group
      ref={(node: Konva.Group | null) => {
        const reg = nodesRegistryRef?.current as
          | { playerNodes?: Map<string, Konva.Group> }
          | undefined;
        if (reg?.playerNodes) {
          if (node) reg.playerNodes.set(marker.id, node);
          else reg.playerNodes.delete(marker.id);
        }
      }}
      x={pxX}
      y={pxY}
      draggable={isInteractive && !marker.locked}
      onMouseEnter={(e) => {
        if (connectingPlayerId && connectingPlayerId !== marker.id) {
          e.target
            .getStage()
            ?.container()
            .style.setProperty('cursor', 'pointer');
        }
      }}
      onMouseLeave={(e) => {
        if (connectingPlayerId) {
          e.target
            .getStage()
            ?.container()
            .style.setProperty('cursor', 'default');
        }
      }}
      onDragStart={(e) => onDragStart(e, marker.id)}
      onDragMove={(e) => onDragMove(e, marker.id)}
      onClick={(e) => {
        e.cancelBubble = true;
        e.target.getStage()?.container().style.setProperty('cursor', 'default');
        onClick(marker.id, Boolean((e.evt as MouseEvent)?.shiftKey));
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        e.target.getStage()?.container().style.setProperty('cursor', 'default');
        onClick(marker.id, false);
      }}
      onDragEnd={(e) => onDragEnd(e, marker)}
    >
      {marker.focus && (
        <PlayerFocusSpotlight
          focus={marker.focus}
          radius={radius}
          isRing={is3D}
          isSelected={isSelected}
        />
      )}

      {marker.visionCone && (
        <PlayerVisionCone
          cone={marker.visionCone}
          radius={radius}
          isRing={is3D}
          stageSize={{ width, height }}
          isSelected={isSelected}
          onUpdateVisionCone={onUpdateVisionCone}
        />
      )}

      {is3D ? (
        <PlayerMarkerRing
          player={marker}
          radius={radius}
          numScale={numScale}
          isSelected={isSelected}
        />
      ) : (
        <PlayerMarkerCircle
          player={marker}
          radius={radius}
          numScale={numScale}
          isSelected={isSelected}
          loadedImage={null}
        />
      )}

      <PlayerMarkerLabel
        player={marker}
        radius={radius}
        displayName={displayName}
        labelScale={labelScale}
      />
    </Group>
  );
}
