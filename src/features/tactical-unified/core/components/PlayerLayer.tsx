'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import { Layer } from 'react-konva';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { updateAttachedArrowPositions } from './annotations/arrow-drag-updater';
import { updateTrajectoryArrowPositions } from './annotations/trajectory-arrow-drag-updater';
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
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const markerMode = useCanvasStore((s) => s.markerMode);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useCanvasStore((s) => s.setConnectingPlayerId);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio);
  const moveMarkerToBench = useCanvasStore((s) => s.moveMarkerToBench);
  const prevSlide = useCanvasStore((s) => s.prevSlide);
  const activeSlideId = useCanvasStore((s) => s.activeSlideId ?? '');
  const updatePlayerTrajectory = useCanvasStore(
    (s) => s.updatePlayerTrajectory,
  );
  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');

  const pitchMarkers = markers.filter((m) => m.area !== 'bench');
  const visibleMarkers =
    teamVisibility === 'both'
      ? pitchMarkers
      : pitchMarkers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(width, height);

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      const curX = e.target.x();
      const curY = e.target.y();
      updateConnectLinePositions(
        connectLineNodesRef.current,
        visibleMarkers,
        markerId,
        curX,
        curY,
        width,
        height,
      );
      const reg = nodesRegistryRef?.current as
        | {
            arrowNodes?: Map<string, any>;
            trajectoryArrowNodes?: Map<string, any>;
          }
        | undefined;
      updateAttachedArrowPositions(
        reg?.arrowNodes,
        arrows,
        visibleMarkers,
        markerId,
        curX,
        curY,
        width,
        height,
      );
      updateTrajectoryArrowPositions(
        reg?.trajectoryArrowNodes,
        markerId,
        curX,
        curY,
        width,
        height,
      );
      e.target.getLayer()?.batchDraw();
    },
    [visibleMarkers, arrows, width, height, nodesRegistryRef],
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
                color: src.style?.color ?? '#034694',
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

      const clientX = (e.evt as MouseEvent | undefined)?.clientX;
      const clientY = (e.evt as MouseEvent | undefined)?.clientY;
      const stage = e.target.getStage();
      const stageRect = stage?.container().getBoundingClientRect();

      let isOverBench = false;
      let benchCoord: { x: number; y: number } | undefined;

      const benchCanvasEl =
        typeof document !== 'undefined'
          ? document.getElementById('tactical-bench-canvas')
          : null;
      const benchRect = benchCanvasEl?.getBoundingClientRect();

      if (benchRect && clientX !== undefined && clientY !== undefined) {
        if (
          clientX >= benchRect.left &&
          clientX <= benchRect.right &&
          clientY >= benchRect.top &&
          clientY <= benchRect.bottom
        ) {
          isOverBench = true;
          const bx = Math.max(
            0,
            Math.min(100, ((clientX - benchRect.left) / benchRect.width) * 100),
          );
          const by = Math.max(
            0,
            Math.min(100, ((clientY - benchRect.top) / benchRect.height) * 100),
          );
          benchCoord = { x: bx, y: by };
        }
      }

      const isOverBenchPanel =
        isOverBench ||
        (clientX !== undefined &&
          (stageRect
            ? clientX >= stageRect.right
            : typeof window !== 'undefined' &&
              clientX >= window.innerWidth - 400));

      if (isOverBenchPanel) {
        moveMarkerToBench?.(marker.id, benchCoord?.x, benchCoord?.y);
        return;
      }

      const nx = (e.target.x() / width) * 100;
      const ny = (e.target.y() / height) * 100;
      updateMarker(marker.id, { x: nx, y: ny });
    },
    [width, height, updateMarker, setIsDragging, moveMarkerToBench],
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
        markers={visibleMarkers}
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
          markers={visibleMarkers}
          width={width}
          height={height}
          baseDim={baseDim}
        />
      )}

      {/* ── スライド間ゴーストマーカー & 追跡曲線矢印 ── */}
      {visibleMarkers.map((marker) => {
        const prevPlayer = prevSlide?.players.find(
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

      {visibleMarkers.map((marker) => (
        <PlayerMarkerItem
          key={marker.id}
          marker={marker}
          width={width}
          height={height}
          baseDim={baseDim}
          markerMode={markerMode}
          aspectRatio={aspectRatio}
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
