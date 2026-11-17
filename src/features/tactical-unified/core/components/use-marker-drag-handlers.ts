import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useContext, useRef } from 'react';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { CanvasCapabilities, SelectedObject } from '../types';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { resolveBenchDrop } from './player-bench-drop';

export interface UseMarkerDragHandlersParams {
  pitchRect: PitchRectBounds;
  visibleMarkers: DomainPlayer[];
  arrows?: DomainArrowAnnotation[];
  selectedIds: string[];
  selectObject: (
    target: string | SelectedObject | null,
    isShift?: boolean,
  ) => void;
  updateMarker: (id: string, patch: Partial<PitchPlayer>) => void;
  updateMarkers: (
    updates: { id: string; patch: Partial<PitchPlayer> }[],
  ) => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsHudOpen: (isOpen: boolean) => void;
  capabilities?: Partial<CanvasCapabilities>;
  moveMarkerToBench?: (id: string, x?: number, y?: number) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function useMarkerDragHandlers({
  pitchRect,
  visibleMarkers,
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
  const tacticalStores = useContext(TacticalStoresContext);

  const dragStartNormRef = useRef<{
    markerId: string;
    normX: number;
    normY: number;
  } | null>(null);

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
      if (!selectedIds.includes(markerId)) {
        const isShift = Boolean((e.evt as MouseEvent)?.shiftKey);
        selectObject(markerId, isShift);
      }

      setIsDragging(true);
      setIsHudOpen(false);

      const draggedMarker = visibleMarkers.find((p) => p.id === markerId);
      dragStartNormRef.current = draggedMarker
        ? { markerId, normX: draggedMarker.x, normY: draggedMarker.y }
        : null;

      const effectiveSelectedIds = selectedIds.includes(markerId)
        ? selectedIds
        : [markerId];

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

      const multi = dragMultiStateRef.current;
      if (multi && multi.draggedMarkerId === markerId) {
        const deltaX = curX - multi.startPx.x;
        const deltaY = curY - multi.startPx.y;

        if (tacticalStores && pitchRect.width > 0 && pitchRect.height > 0) {
          tacticalStores.sessionStore.getState().setActiveDragDelta({
            entityIds: Array.from(multi.markers.keys()),
            deltaScreenNormX: (deltaX / pitchRect.width) * 100,
            deltaScreenNormY: (deltaY / pitchRect.height) * 100,
          });
        }
      } else if (
        tacticalStores &&
        pitchRect.width > 0 &&
        pitchRect.height > 0
      ) {
        const startNorm =
          dragStartNormRef.current?.markerId === markerId
            ? dragStartNormRef.current
            : (() => {
                const found = visibleMarkers.find((p) => p.id === markerId);
                return found
                  ? { markerId, normX: found.x, normY: found.y }
                  : null;
              })();
        if (startNorm) {
          const curNormX = (curX / pitchRect.width) * 100;
          const curNormY = (curY / pitchRect.height) * 100;
          tacticalStores.sessionStore.getState().setActiveDragDelta({
            entityIds: [markerId],
            deltaScreenNormX: curNormX - startNorm.normX,
            deltaScreenNormY: curNormY - startNorm.normY,
          });
        }
      }

      e.target.getLayer()?.batchDraw();
    },
    [visibleMarkers, pitchRect.width, pitchRect.height, tacticalStores],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: DomainPlayer) => {
      tacticalStores?.sessionStore.getState().setActiveDragDelta(null);
      dragStartNormRef.current = null;
      setIsDragging(false);

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

        const updates: { id: string; patch: Partial<PitchPlayer> }[] = [];
        for (const [id, initial] of multi.markers.entries()) {
          updates.push({
            id,
            patch: {
              x: clampToScreenNorm(initial.normX + deltaNormX, 0, 100),
              y: clampToScreenNorm(initial.normY + deltaNormY, 0, 100),
            },
          });
        }
        updateMarkers(updates);
        return;
      }

      // 16:9 スクリーン（0..100）にクランプ（白線外余白は配置可・境界線は無視）
      const nx = clampToScreenNorm(
        (e.target.x() / pitchRect.width) * 100,
        0,
        100,
      );
      const ny = clampToScreenNorm(
        (e.target.y() / pitchRect.height) * 100,
        0,
        100,
      );
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
      tacticalStores,
    ],
  );

  return {
    handleDragStart,
    handleMarkerDragMove,
    handleDragEnd,
  };
}
