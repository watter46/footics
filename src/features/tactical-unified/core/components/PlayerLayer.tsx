'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { Layer } from 'react-konva';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { PlayerConnectingGuide } from './PlayerConnectingGuide';
import {
  PlayerConnectLines,
  updateConnectLinePositions,
} from './PlayerConnectLines';
import { PlayerMarkerItem } from './PlayerMarkerItem';

export interface PlayerLayerProps {
  width: number;
  height: number;
  nodesRegistryRef?: React.MutableRefObject<unknown>;
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
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useCanvasStore((s) => s.setConnectingPlayerId);

  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(width, height);

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      updateConnectLinePositions(
        connectLineNodesRef.current,
        markers,
        markerId,
        e.target.x(),
        e.target.y(),
        width,
        height,
      );
      e.target.getLayer()?.batchDraw();
    },
    [markers, width, height],
  );

  const handleMarkerClick = useCallback(
    (markerId: string, isShift: boolean) => {
      if (connectingPlayerId && connectingPlayerId !== markerId) {
        const src = markers.find((m) => m.id === connectingPlayerId);
        if (src) {
          const lines = (src.connectLines ?? []).filter(
            (c) => c.toPlayerId !== markerId,
          );
          updateMarker(src.id, {
            connectLines: [
              ...lines,
              {
                id: `cl-${Date.now()}`,
                toPlayerId: markerId,
                lineStyle: 'solid',
                color: src.style?.color ?? '#3b82f6',
                strokeWidth: 2,
                visible: true,
              },
            ],
          });
          setConnectingPlayerId(null);
          return;
        }
      }
      selectObject(markerId, isShift);
      setIsHudOpen(true);
    },
    [
      connectingPlayerId,
      markers,
      updateMarker,
      setConnectingPlayerId,
      selectObject,
      setIsHudOpen,
    ],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      setIsDragging(false);
      setIsHudOpen(false);
      const nx = Math.max(0, Math.min(100, (e.target.x() / width) * 100));
      const ny = Math.max(0, Math.min(100, (e.target.y() / height) * 100));
      updateMarker(marker.id, { x: nx, y: ny });
    },
    [width, height, updateMarker, setIsDragging, setIsHudOpen],
  );

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      setIsDragging(true);
      setIsHudOpen(false);
      if (!selectedIds.includes(markerId)) {
        const isShift = Boolean((e.evt as MouseEvent)?.shiftKey);
        selectObject(markerId, isShift);
      }
    },
    [selectedIds, selectObject, setIsDragging, setIsHudOpen],
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

      {connectingPlayerId && (
        <PlayerConnectingGuide
          connectingPlayerId={connectingPlayerId}
          markers={markers}
          width={width}
          height={height}
          baseDim={baseDim}
        />
      )}

      {markers.map((marker) => (
        <PlayerMarkerItem
          key={marker.id}
          marker={marker}
          width={width}
          height={height}
          baseDim={baseDim}
          markerMode={markerMode}
          isSelected={selectedIds.includes(marker.id)}
          isInteractive={isInteractive}
          connectingPlayerId={connectingPlayerId}
          nodesRegistryRef={nodesRegistryRef}
          onDragStart={handleDragStart}
          onDragMove={handleMarkerDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleMarkerClick}
          onUpdateVisionCone={(patch) =>
            updateMarker(marker.id, {
              visionCone: marker.visionCone
                ? { ...marker.visionCone, ...patch }
                : undefined,
            })
          }
        />
      ))}
    </Layer>
  );
}
