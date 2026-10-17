'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Group, Layer } from 'react-konva';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface FootRingLayerProps {
  width: number;
  height: number;
}

export function FootRingLayer({
  width,
  height,
}: FootRingLayerProps): ReactNode {
  const markers = useCanvasStore((s) => s.annotations.markers);
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
        const isSelected = selectedIds.includes(marker.id);

        return (
          <Group
            key={marker.id}
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
            <PlayerMarkerRing
              player={marker}
              radius={radius}
              numScale={numScale}
              isSelected={isSelected}
            />
          </Group>
        );
      })}
    </Layer>
  );
}
