'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { Group, Layer } from 'react-konva';
import type { Player, TextAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import {
  type CameraState,
  DEFAULT_CAMERA_STATE,
} from '../utils/matrix-coordinates';
import { updateAttachedArrowPositions } from './annotations/arrow-drag-updater';
import { updateTrajectoryArrowPositions } from './annotations/trajectory-arrow-drag-updater';
import {
  type BillboardItem,
  buildBillboardItems,
  sortBillboardItemsByDepth,
} from './billboard-depth-sort';
import { BillboardItemNode } from './billboard-item-node';
import { updateConnectLinePositions } from './PlayerConnectLines';
import { resolveBenchDrop } from './player-bench-drop';

export { type BillboardItem, sortBillboardItemsByDepth };

export interface BillboardObjectLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export function BillboardObjectLayer({
  pitchRect,
  camera = DEFAULT_CAMERA_STATE,
  editingTextId,
  onStartEditText,
  nodesRegistryRef,
  cleanRender,
}: BillboardObjectLayerProps): ReactNode {
  const markers = useCanvasStore((s) => s.annotations.markers);
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const texts = useCanvasStore((s) => s.annotations.texts);
  const markerMode = useCanvasStore((s) => s.markerMode);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const updateText = useCanvasStore((s) => s.updateText);
  const setIsDragging = useCanvasStore((s) => s.setIsDragging);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useCanvasStore((s) => s.setConnectingPlayerId);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio);

  const capabilities = useCanvasStore((s) => s.capabilities);
  const ball = useCanvasStore((s) => s.ball);
  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');
  const moveMarkerToBench = useCanvasStore((s) => s.moveMarkerToBench);

  const showBall =
    (capabilities?.hasBall ?? false) && ball != null && ball.visible !== false;

  const pitchMarkers = useMemo(
    () => markers.filter((m) => m.area !== 'bench'),
    [markers],
  );

  const visibleMarkers = useMemo(
    () =>
      teamVisibility === 'both'
        ? pitchMarkers
        : pitchMarkers.filter(
            (m) => m.team === teamVisibility || m.team === 'neutral',
          ),
    [pitchMarkers, teamVisibility],
  );

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(pitchRect.width, pitchRect.height);

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      const curX = e.target.x();
      const curY = e.target.y();
      const reg = nodesRegistryRef?.current as CanvasNodesRegistry | undefined;

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

      const { isOverBench, benchCoord } = resolveBenchDrop(
        clientX,
        clientY,
        stageRect,
      );

      if (isOverBench && capabilities?.hasBench && moveMarkerToBench) {
        moveMarkerToBench(marker.id, benchCoord?.x, benchCoord?.y);
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
      setIsDragging,
      capabilities?.hasBench,
      moveMarkerToBench,
    ],
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

  const handleSelectText = useCallback(
    (e: KonvaClickEvent, id: string) => {
      e.cancelBubble = true;
      const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
      selectObject({ id, kind: 'text' }, isShift);
      setIsHudOpen(true);
    },
    [selectObject, setIsHudOpen],
  );

  const handleUpdateVisionCone = useCallback(
    (marker: Player, patch: Partial<NonNullable<Player['visionCone']>>) => {
      updateMarker(marker.id, {
        visionCone: marker.visionCone
          ? { ...marker.visionCone, ...patch }
          : undefined,
      });
    },
    [updateMarker],
  );

  // 深さソート対象アイテム群の構築
  const sortedItems = useMemo(
    () =>
      sortBillboardItemsByDepth(
        buildBillboardItems(visibleMarkers, ball, showBall, texts),
        pitchRect,
        camera,
      ),
    [visibleMarkers, ball, showBall, texts, pitchRect, camera],
  );

  return (
    <Layer id="billboard-object-layer">
      <Group x={pitchRect.x} y={pitchRect.y}>
        {sortedItems.map((item) => (
          <BillboardItemNode
            key={
              item.kind === 'player'
                ? item.data.id
                : item.kind === 'ball'
                  ? 'ball-object'
                  : item.data.id
            }
            item={item}
            pitchRect={pitchRect}
            baseDim={baseDim}
            markerMode={markerMode}
            aspectRatio={aspectRatio}
            selectedIds={selectedIds}
            cleanRender={cleanRender}
            isInteractive={!cleanRender && isInteractive}
            connectingPlayerId={connectingPlayerId}
            editingTextId={editingTextId}
            nodesRegistryRef={nodesRegistryRef}
            onStartEditText={onStartEditText}
            onDragStart={handleDragStart}
            onDragMove={handleMarkerDragMove}
            onDragEnd={handleDragEnd}
            onClickMarker={handleMarkerClick}
            onUpdateVisionCone={handleUpdateVisionCone}
            onSelectText={handleSelectText}
            updateText={(id, patch) =>
              updateText(id, patch as Partial<TextAnnotation>)
            }
          />
        ))}
      </Group>
    </Layer>
  );
}
