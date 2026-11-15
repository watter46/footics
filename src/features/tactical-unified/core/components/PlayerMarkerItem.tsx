'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { type MutableRefObject, memo } from 'react';
import { Group } from 'react-konva';
import { usePlayerPhotoImage } from '@/features/tactical-unified/core/hooks/player-photo-context';
import { PlayerFocusSpotlight } from '@/features/tactical-unified/objects/player/components/player-focus-spotlight';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { PlayerMarkerLabel } from '@/features/tactical-unified/objects/player/components/player-marker-label';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import { PlayerMarkerRingFade } from '@/features/tactical-unified/objects/player/components/player-marker-ring-fade';
import { PlayerVisionCone } from '@/features/tactical-unified/objects/player/components/player-vision-cone';
import type { ResolvedBillboardPlayerItem } from '@/lib/tactical/compiler/scene-graph-dto';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type { AspectRatio } from '@/lib/types/tactical/primitives';

export interface PlayerMarkerItemProps {
  marker: DomainPlayer;
  width: number;
  height: number;
  baseDim: number;
  markerMode: string;
  isSelected: boolean;
  isInteractive: boolean;
  cleanRender?: boolean;
  connectingPlayerId: string | null;
  nodesRegistryRef?: MutableRefObject<unknown>;
  aspectRatio?: AspectRatio;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: DomainPlayer) => void;
  onClick: (markerId: string, isShift: boolean) => void;
  onUpdateVisionCone: (patch: Record<string, unknown>) => void;
  resolvedPlayer: ResolvedBillboardPlayerItem;
}

export const PlayerMarkerItem = memo(function PlayerMarkerItem({
  marker,
  width,
  height,
  baseDim: _baseDim,
  markerMode,
  isSelected,
  isInteractive,
  cleanRender,
  connectingPlayerId,
  nodesRegistryRef,
  aspectRatio: _aspectRatio,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
  onUpdateVisionCone,
  resolvedPlayer,
}: PlayerMarkerItemProps) {
  const radius = resolvedPlayer.radiusPx;
  const opacity = resolvedPlayer.opacity;
  const numScale = marker.style?.numberSizeScale ?? 1.0;
  const labelScale = marker.style?.labelSizeScale ?? 1.0;
  const displayName = marker.name ? getLastName(marker.name) : '';

  const isRingFade = marker.style?.markerType === 'ring-fade';
  const is3D =
    markerMode === '3d-only' ||
    (markerMode !== '2d-only' &&
      (marker.style?.markerType === 'ring' || isRingFade));

  const photoImage = usePlayerPhotoImage(marker);

  if (marker.area !== 'pitch') return null;

  const effectiveIsSelected = !cleanRender && isSelected;

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
      x={resolvedPlayer.positionPx.x}
      y={resolvedPlayer.positionPx.y}
      opacity={opacity}
      visible={resolvedPlayer.visible}
      draggable={!cleanRender && isInteractive && !marker.locked}
      // 選手マーカーは 16:9 スクリーン内（0..100）にクランプ
      dragBoundFunc={function (this: Konva.Node, pos: Konva.Vector2d) {
        const parent = this.getParent?.();
        const parentPos = parent?.getAbsolutePosition?.() ?? {
          x: 0,
          y: 0,
        };
        const parentScale = parent?.getAbsoluteScale?.() ?? {
          x: 1,
          y: 1,
        };
        return {
          x: Math.max(
            parentPos.x,
            Math.min(parentPos.x + width * parentScale.x, pos.x),
          ),
          y: Math.max(
            parentPos.y,
            Math.min(parentPos.y + height * parentScale.y, pos.y),
          ),
        };
      }}
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
          isSelected={effectiveIsSelected}
        />
      )}

      {marker.visionCone && (
        <PlayerVisionCone
          cone={marker.visionCone}
          radius={radius}
          isRing={is3D}
          stageSize={{ width, height }}
          isSelected={effectiveIsSelected}
          onUpdateVisionCone={onUpdateVisionCone}
        />
      )}

      {isRingFade ? (
        <PlayerMarkerRingFade
          player={marker}
          radius={radius}
          numScale={numScale}
          isSelected={effectiveIsSelected}
        />
      ) : is3D ? (
        <PlayerMarkerRing
          player={marker}
          radius={radius}
          numScale={numScale}
          isSelected={effectiveIsSelected}
        />
      ) : (
        <PlayerMarkerCircle
          player={marker}
          radius={radius}
          numScale={numScale}
          isSelected={effectiveIsSelected}
          loadedImage={photoImage}
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
});
