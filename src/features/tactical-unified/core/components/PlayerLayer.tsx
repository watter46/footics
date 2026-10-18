'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Group, Layer, Line } from 'react-konva';
import { PlayerFocusSpotlight } from '@/features/tactical-unified/objects/player/components/player-focus-spotlight';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { PlayerMarkerLabel } from '@/features/tactical-unified/objects/player/components/player-marker-label';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import { PlayerVisionCone } from '@/features/tactical-unified/objects/player/components/player-vision-cone';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
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
      {/* ── Connect Lines (選手間コネクトライン) ── */}
      {markers
        .filter((p) => p.connectLines && p.connectLines.length > 0)
        .flatMap((p) =>
          (p.connectLines ?? [])
            .filter((cl) => cl.visible)
            .map((cl) => {
              const toPlayer = markers.find((m) => m.id === cl.toPlayerId);
              if (!toPlayer) return null;
              const rawP1 = { x: (p.x / 100) * width, y: (p.y / 100) * height };
              const rawP2 = {
                x: (toPlayer.x / 100) * width,
                y: (toPlayer.y / 100) * height,
              };
              const p1 = getMarkerBoundaryPoint(
                rawP1,
                rawP2,
                p,
                { width, height },
                true,
              );
              const p2 = getMarkerBoundaryPoint(
                rawP2,
                rawP1,
                toPlayer,
                { width, height },
                true,
              );
              const dash =
                cl.lineStyle === 'dashed'
                  ? [6, 4]
                  : cl.lineStyle === 'dotted'
                    ? [2, 3]
                    : undefined;
              return (
                <Line
                  key={cl.id}
                  points={[p1.x, p1.y, p2.x, p2.y]}
                  stroke={cl.color || '#38bdf8'}
                  strokeWidth={cl.strokeWidth ?? 2}
                  dash={dash}
                  listening={false}
                />
              );
            }),
        )}

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
            onDragStart={(e) => {
              if (!isSelected) {
                const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
                selectObject(marker.id, isShift);
              }
            }}
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
                onUpdateVisionCone={(patch) =>
                  updateMarker(marker.id, {
                    visionCone: marker.visionCone
                      ? { ...marker.visionCone, ...patch }
                      : undefined,
                  })
                }
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
      })}
    </Layer>
  );
}
