'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Group, Layer } from 'react-konva';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { PlayerMarkerLabel } from '@/features/tactical-unified/objects/player/components/player-marker-label';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface PlayerLayerProps {
  width: number;
  height: number;
  nodesRegistryRef?: React.MutableRefObject<any>;
}

export function PlayerLayer({
  width,
  height,
  nodesRegistryRef,
}: PlayerLayerProps): ReactNode {
  const markers = useCanvasStore((s) => s.annotations.markers);
  const markerMode = useCanvasStore((s) => s.markerMode);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateMarker = useCanvasStore((s) => s.updateMarker);

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(width, height);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      const node = e.target;
      const newPxX = node.x();
      const newPxY = node.y();
      const newNormX = (newPxX / width) * 100;
      const newNormY = (newPxY / height) * 100;

      updateMarker(marker.id, {
        x: Math.max(0, Math.min(100, newNormX)),
        y: Math.max(0, Math.min(100, newNormY)),
      });
    },
    [width, height, updateMarker],
  );

  return (
    <Layer>
      {markers.map((marker) => {
        const pxX = (marker.x / 100) * width;
        const pxY = (marker.y / 100) * height;
        const sizeScale = marker.style?.sizeScale ?? 1.0;
        const radius = baseDim * 0.032 * sizeScale;
        const numScale = marker.style?.numberSizeScale ?? 1.0;
        const labelScale = marker.style?.labelSizeScale ?? 1.0;
        const isSelected = selectedIds.includes(marker.id);
        const displayName = marker.name ? getLastName(marker.name) : '';

        const is3D =
          markerMode === '3d-only' ||
          (markerMode !== '2d-only' && marker.style?.markerType === 'ring');

        return (
          <Group
            key={marker.id}
            ref={(node) => {
              if (nodesRegistryRef?.current?.playerNodes) {
                if (node)
                  nodesRegistryRef.current.playerNodes.set(marker.id, node);
                else nodesRegistryRef.current.playerNodes.delete(marker.id);
              }
            }}
            x={pxX}
            y={pxY}
            draggable={isInteractive && !marker.locked}
            onClick={(e) => {
              e.cancelBubble = true;
              const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
              selectObject(marker.id, isShift);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              selectObject(marker.id, false);
            }}
            onDragEnd={(e) => handleDragEnd(e, marker)}
          >
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
      })}
    </Layer>
  );
}
