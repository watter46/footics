'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Group, Layer } from 'react-konva';
import { BallObject } from '@/features/tactical-unified/objects/ball/components/ball-object';
import type { BallObjectProps } from '@/features/tactical-unified/objects/ball/types';
import type { Player, TextAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import {
  type CameraState,
  DEFAULT_CAMERA_STATE,
  worldToScreen,
} from '../utils/matrix-coordinates';
import { updateAttachedArrowPositions } from './annotations/arrow-drag-updater';
import { TextObject } from './annotations/TextObject';
import { updateTrajectoryArrowPositions } from './annotations/trajectory-arrow-drag-updater';
import { updateConnectLinePositions } from './PlayerConnectLines';
import { PlayerMarkerItem } from './PlayerMarkerItem';

export interface BillboardObjectLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
  cleanRender?: boolean;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export function sortBillboardItemsByDepth<T extends { x?: number; y: number }>(
  items: readonly T[],
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
): T[] {
  return [...items].sort((a, b) => {
    const screenA = worldToScreen({ x: a.x ?? 50, y: a.y }, pitchRect, camera);
    const screenB = worldToScreen({ x: b.x ?? 50, y: b.y }, pitchRect, camera);
    return screenA.y - screenB.y;
  });
}

type BillboardItem =
  | { kind: 'player'; data: Player; x: number; y: number }
  | { kind: 'ball'; data: BallObjectProps['ball']; x: number; y: number }
  | { kind: 'text'; data: TextAnnotation; x: number; y: number };

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

  const visibleMarkers =
    teamVisibility === 'both'
      ? markers
      : markers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(pitchRect.width, pitchRect.height);

  const handleMarkerDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, markerId: string) => {
      const curX = e.target.x();
      const curY = e.target.y();
      const reg = nodesRegistryRef?.current as
        | {
            arrowNodes?: Map<string, any>;
            trajectoryArrowNodes?: Map<string, any>;
            connectLineNodeMap?: Map<string, Konva.Line>;
          }
        | undefined;

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
      const stage = e.target.getStage();
      const stageRect = stage?.container().getBoundingClientRect();

      const isOverBenchPanel =
        clientX !== undefined &&
        (stageRect
          ? clientX >= stageRect.right
          : typeof window !== 'undefined' &&
            clientX >= window.innerWidth - 340);

      if (isOverBenchPanel && capabilities?.hasBench && moveMarkerToBench) {
        moveMarkerToBench(marker.id);
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

  const makeSelectHandler = useCallback(
    (id: string, kind: 'text') => {
      return (e: KonvaClickEvent) => {
        e.cancelBubble = true;
        const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
        selectObject({ id, kind }, isShift);
        setIsHudOpen(true);
      };
    },
    [selectObject, setIsHudOpen],
  );

  // 深さソート対象アイテム群の構築
  const items: BillboardItem[] = [
    ...visibleMarkers.map((m) => ({
      kind: 'player' as const,
      data: m,
      x: m.x,
      y: m.y,
    })),
    ...(showBall
      ? [{ kind: 'ball' as const, data: ball, x: ball.x, y: ball.y }]
      : []),
    ...texts.map((t) => ({
      kind: 'text' as const,
      data: t,
      x: t.x,
      y: t.y,
    })),
  ];

  const sortedItems = sortBillboardItemsByDepth(items, pitchRect, camera);

  return (
    <Layer id="billboard-object-layer">
      <Group x={pitchRect.x} y={pitchRect.y}>
        {sortedItems.map((item) => {
          if (item.kind === 'player') {
            const marker = item.data;
            return (
              <PlayerMarkerItem
                key={marker.id}
                marker={marker}
                width={pitchRect.width}
                height={pitchRect.height}
                baseDim={baseDim}
                markerMode={markerMode}
                aspectRatio={aspectRatio}
                isSelected={!cleanRender && selectedIds.includes(marker.id)}
                isInteractive={!cleanRender && isInteractive}
                cleanRender={cleanRender}
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
            );
          }

          if (item.kind === 'ball') {
            return (
              <BallObject
                key="ball-object"
                ball={item.data}
                stageSize={{
                  width: pitchRect.width,
                  height: pitchRect.height,
                }}
                nodesRegistryRef={nodesRegistryRef}
                cleanRender={cleanRender}
              />
            );
          }

          if (item.kind === 'text') {
            const text = item.data;
            return (
              <TextObject
                key={text.id}
                text={text}
                stageSize={{
                  width: pitchRect.width,
                  height: pitchRect.height,
                }}
                isSelected={!cleanRender && selectedIds.includes(text.id)}
                isEditing={editingTextId === text.id}
                isInteractive={!cleanRender && isInteractive}
                onSelect={makeSelectHandler(text.id, 'text')}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  onStartEditText?.(text.id);
                }}
                updateText={updateText}
                nodesRegistryRef={nodesRegistryRef}
              />
            );
          }

          return null;
        })}
      </Group>
    </Layer>
  );
}
