'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { Group, Layer } from 'react-konva';
import { PlayerFocusSpotlight } from '@/features/tactical-unified/objects/player/components/player-focus-spotlight';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { PlayerMarkerLabel } from '@/features/tactical-unified/objects/player/components/player-marker-label';
import { PlayerMarkerRing } from '@/features/tactical-unified/objects/player/components/player-marker-ring';
import { PlayerVisionCone } from '@/features/tactical-unified/objects/player/components/player-vision-cone';
import { getMarkerBoundaryPoint } from '@/lib/tactical/marker-geometry';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { PlayerConnectLines } from './PlayerConnectLines';

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
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);

  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(width, height);

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      const curX = e.target.x();
      const curY = e.target.y();
      for (const p of markers) {
        for (const cl of p.connectLines ?? []) {
          if (p.id === markerId || cl.toPlayerId === markerId) {
            const lineNode = connectLineNodesRef.current.get(cl.id);
            if (!lineNode) continue;
            const targetMarker = markers.find((m) => m.id === cl.toPlayerId);
            if (!targetMarker) continue;
            const isSource = p.id === markerId;
            const sPos = isSource
              ? { x: curX, y: curY }
              : { x: (p.x / 100) * width, y: (p.y / 100) * height };
            const tPos =
              cl.toPlayerId === markerId
                ? { x: curX, y: curY }
                : {
                    x: (targetMarker.x / 100) * width,
                    y: (targetMarker.y / 100) * height,
                  };
            const p1 = getMarkerBoundaryPoint(
              sPos,
              tPos,
              p,
              { width, height },
              true,
            );
            const p2 = getMarkerBoundaryPoint(
              tPos,
              sPos,
              targetMarker,
              { width, height },
              true,
            );
            lineNode.points([p1.x, p1.y, p2.x, p2.y]);
          }
        }
      }
      e.target.getLayer()?.batchDraw();
    },
    [markers, width, height],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      setIsDragging(false);
      setIsHudOpen(false);
      const node = e.target;
      const newNormX = (node.x() / width) * 100;
      const newNormY = (node.y() / height) * 100;

      updateMarker(marker.id, {
        x: Math.max(0, Math.min(100, newNormX)),
        y: Math.max(0, Math.min(100, newNormY)),
      });
    },
    [width, height, updateMarker, setIsDragging, setIsHudOpen],
  );

  return (
    <Layer>
      <PlayerConnectLines
        markers={markers}
        width={width}
        height={height}
        selectedIds={selectedIds}
        isInteractive={isInteractive}
        connectLineNodesRef={connectLineNodesRef}
        onSelectConnectLine={(id, parentPlayerId) => {
          selectObject({
            id,
            kind: 'connect-line',
            parentPlayerId,
          });
          setIsHudOpen(true);
        }}
      />

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
              setIsDragging(true);
              setIsHudOpen(false);
              if (!isSelected) {
                const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
                selectObject(marker.id, isShift);
              }
            }}
            onDragMove={(e) => handleMarkerDragMove(e, marker.id)}
            onClick={(e) => {
              e.cancelBubble = true;
              const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
              selectObject(marker.id, isShift);
              setIsHudOpen(true);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              selectObject(marker.id, false);
              setIsHudOpen(true);
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
