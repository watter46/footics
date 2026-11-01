import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef } from 'react';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import type { CanvasCapabilities, SelectedObject } from '../types';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { updateAttachedArrowPositions } from './annotations/arrow-drag-updater';
import { updateTrajectoryArrowPositions } from './annotations/trajectory-arrow-drag-updater';
import { updateConnectLinePositions } from './PlayerConnectLines';
import { resolveBenchDrop } from './player-bench-drop';

export interface UseMarkerDragHandlersParams {
  pitchRect: PitchRectBounds;
  visibleMarkers: Player[];
  arrows: ArrowAnnotation[];
  selectedIds: string[];
  selectObject: (
    target: string | SelectedObject | null,
    isShift?: boolean,
  ) => void;
  updateMarker: (id: string, patch: Partial<Player>) => void;
  updateMarkers: (updates: { id: string; patch: Partial<Player> }[]) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsHudOpen: (isOpen: boolean) => void;
  capabilities?: Partial<CanvasCapabilities>;
  moveMarkerToBench?: (id: string, x?: number, y?: number) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function useMarkerDragHandlers({
  pitchRect,
  visibleMarkers,
  arrows,
  selectedIds,
  selectObject,
  updateMarker,
  updateMarkers,
  setIsDragging,
  setIsHudOpen,
  capabilities,
  moveMarkerToBench,
  nodesRegistryRef,
}: UseMarkerDragHandlersParams) {
  const dragMultiStateRef = useRef<{
    draggedMarkerId: string;
    startPx: { x: number; y: number };
    markers: Map<
      string,
      { normX: number; normY: number; pxX: number; pxY: number }
    >;
  } | null>(null);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      setIsDragging(true);
      setIsHudOpen(false);

      const effectiveSelectedIds = selectedIds.includes(markerId)
        ? selectedIds
        : [markerId];

      if (!selectedIds.includes(markerId)) {
        const isShift = Boolean((e.evt as MouseEvent)?.shiftKey);
        selectObject(markerId, isShift);
      }

      if (
        effectiveSelectedIds.length > 1 &&
        effectiveSelectedIds.includes(markerId)
      ) {
        const map = new Map<
          string,
          { normX: number; normY: number; pxX: number; pxY: number }
        >();
        const reg = nodesRegistryRef?.current as
          | CanvasNodesRegistry
          | undefined;
        for (const id of effectiveSelectedIds) {
          const m = visibleMarkers.find((p) => p.id === id);
          if (m) {
            const node = reg?.playerNodes.get(id);
            const pxX = node ? node.x() : (m.x / 100) * pitchRect.width;
            const pxY = node ? node.y() : (m.y / 100) * pitchRect.height;
            map.set(id, { normX: m.x, normY: m.y, pxX, pxY });
          }
        }
        dragMultiStateRef.current = {
          draggedMarkerId: markerId,
          startPx: { x: e.target.x(), y: e.target.y() },
          markers: map,
        };
      } else {
        dragMultiStateRef.current = null;
      }
    },
    [
      selectedIds,
      selectObject,
      setIsDragging,
      setIsHudOpen,
      visibleMarkers,
      nodesRegistryRef,
      pitchRect.width,
      pitchRect.height,
    ],
  );

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      const curX = e.target.x();
      const curY = e.target.y();
      const reg = nodesRegistryRef?.current as CanvasNodesRegistry | undefined;

      const multi = dragMultiStateRef.current;
      if (multi && multi.draggedMarkerId === markerId) {
        const deltaX = curX - multi.startPx.x;
        const deltaY = curY - multi.startPx.y;

        for (const [id, initial] of multi.markers.entries()) {
          if (id === markerId) continue;
          const node = reg?.playerNodes.get(id);
          if (node) {
            const nextX = initial.pxX + deltaX;
            const nextY = initial.pxY + deltaY;
            node.position({ x: nextX, y: nextY });

            if (reg?.connectLineNodeMap) {
              updateConnectLinePositions(
                reg.connectLineNodeMap,
                visibleMarkers,
                id,
                nextX,
                nextY,
                pitchRect.width,
                pitchRect.height,
              );
            }
            updateAttachedArrowPositions(
              reg?.arrowNodes,
              arrows,
              visibleMarkers,
              id,
              nextX,
              nextY,
              pitchRect.width,
              pitchRect.height,
            );
            updateTrajectoryArrowPositions(
              reg?.trajectoryArrowNodes,
              id,
              nextX,
              nextY,
              pitchRect.width,
              pitchRect.height,
            );
          }
        }
      }

      if (reg?.connectLineNodeMap) {
        updateConnectLinePositions(
          reg.connectLineNodeMap,
          visibleMarkers,
          markerId,
          curX,
          curY,
          pitchRect.width,
          pitchRect.height,
        );
      }
      updateAttachedArrowPositions(
        reg?.arrowNodes,
        arrows,
        visibleMarkers,
        markerId,
        curX,
        curY,
        pitchRect.width,
        pitchRect.height,
      );
      updateTrajectoryArrowPositions(
        reg?.trajectoryArrowNodes,
        markerId,
        curX,
        curY,
        pitchRect.width,
        pitchRect.height,
      );
      e.target.getLayer()?.batchDraw();
    },
    [
      visibleMarkers,
      arrows,
      pitchRect.width,
      pitchRect.height,
      nodesRegistryRef,
    ],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      setIsDragging(false);
      setIsHudOpen(true);

      const clientX = (e.evt as MouseEvent | undefined)?.clientX;
      const clientY = (e.evt as MouseEvent | undefined)?.clientY;
      const stage = e.target.getStage();
      const stageRect = stage?.container().getBoundingClientRect();

      const { isOverBench, benchCoord } = resolveBenchDrop(
        clientX,
        clientY,
        stageRect,
      );

      const multi = dragMultiStateRef.current;
      dragMultiStateRef.current = null;

      if (isOverBench && capabilities?.hasBench && moveMarkerToBench) {
        if (multi && multi.markers.size > 1 && multi.markers.has(marker.id)) {
          for (const id of multi.markers.keys()) {
            moveMarkerToBench(id, benchCoord?.x, benchCoord?.y);
          }
        } else {
          moveMarkerToBench(marker.id, benchCoord?.x, benchCoord?.y);
        }
        return;
      }

      if (multi && multi.markers.size > 1 && multi.markers.has(marker.id)) {
        const deltaX = e.target.x() - multi.startPx.x;
        const deltaY = e.target.y() - multi.startPx.y;
        const deltaNormX = (deltaX / pitchRect.width) * 100;
        const deltaNormY = (deltaY / pitchRect.height) * 100;

        const updates: { id: string; patch: Partial<Player> }[] = [];
        for (const [id, initial] of multi.markers.entries()) {
          updates.push({
            id,
            patch: {
              x: initial.normX + deltaNormX,
              y: initial.normY + deltaNormY,
            },
          });
        }
        updateMarkers(updates);
        return;
      }

      // ピッチ外余白座標も保持（[0, 100] へのクランプは行わない）
      const nx = (e.target.x() / pitchRect.width) * 100;
      const ny = (e.target.y() / pitchRect.height) * 100;
      updateMarker(marker.id, { x: nx, y: ny });
    },
    [
      pitchRect.width,
      pitchRect.height,
      updateMarker,
      updateMarkers,
      setIsDragging,
      setIsHudOpen,
      capabilities?.hasBench,
      moveMarkerToBench,
    ],
  );

  return {
    handleDragStart,
    handleMarkerDragMove,
    handleDragEnd,
  };
}
