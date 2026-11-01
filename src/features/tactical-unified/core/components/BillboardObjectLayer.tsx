'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Group, Layer } from 'react-konva';
import type { Player, TextAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { calculatePitchTransform } from '../utils/canvas-pitch-transform-helper';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import {
  type CameraState,
  DEFAULT_CAMERA_STATE,
} from '../utils/matrix-coordinates';
import {
  type BillboardItem,
  buildBillboardItems,
  sortBillboardItemsByDepth,
} from './billboard-depth-sort';
import { BillboardItemNode } from './billboard-item-node';
import { useMarkerDragHandlers } from './use-marker-drag-handlers';

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

export const BillboardObjectLayer = memo(function BillboardObjectLayer({
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
  const updateMarkers = useCanvasStore((s) => s.updateMarkers);
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

  const pitchTransform = useCanvasStore((s) => s.pitchTransform);

  const groupTransform = calculatePitchTransform(
    pitchRect,
    pitchTransform.panX,
    pitchTransform.panY,
    pitchTransform.zoom,
    0,
  );

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

  const { handleDragStart, handleMarkerDragMove, handleDragEnd } =
    useMarkerDragHandlers({
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
    });

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
  const billboardItems = useMemo(
    () => buildBillboardItems(visibleMarkers, ball, showBall, texts),
    [visibleMarkers, ball, showBall, texts],
  );

  const sortedItems = useMemo(
    () =>
      sortBillboardItemsByDepth(billboardItems, pitchRect, camera, selectedIds),
    [billboardItems, pitchRect, camera, selectedIds],
  );

  return (
    <Layer id="billboard-object-layer">
      <Group
        x={groupTransform.x}
        y={groupTransform.y}
        scaleX={groupTransform.scaleX}
        scaleY={groupTransform.scaleY}
      >
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
});
