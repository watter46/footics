'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Group, Layer } from 'react-konva';
import {
  selectDomainActivePhase,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainTextAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { Player } from '@/lib/types/tactical-unified';
import type { SelectedObject } from '../types';
import {
  type PitchRectBounds,
  resolvePitchGroupTransform,
} from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { BillboardItemNode } from './billboard-item-node';
import { useMarkerDragHandlers } from './use-marker-drag-handlers';

export interface BillboardObjectLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  listening?: boolean;
  sceneGraph: ResolvedSceneGraphDTO;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export const BillboardObjectLayer = memo(function BillboardObjectLayer({
  pitchRect,
  editingTextId,
  onStartEditText,
  nodesRegistryRef,
  cleanRender,
  listening = true,
  sceneGraph,
}: BillboardObjectLayerProps): ReactNode {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const markerMode = useSessionStore((s) => s.markerMode);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const activeTool = useSessionStore((s) => s.activeTool);
  const connectingPlayerId = useSessionStore((s) => s.connectingPlayerId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const selectObject = useSessionStore((s) => s.selectObject);
  const setIsDragging = useSessionStore((s) => s.setIsDragging);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);
  const setConnectingPlayerId = useSessionStore((s) => s.setConnectingPlayerId);

  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );

  const selectedIds = useMemo(
    () => selectedObjects.map((o) => o.id),
    [selectedObjects],
  );
  const aspectRatio = activePhase?.aspectRatio;

  const groupTransform = resolvePitchGroupTransform(
    pitchRect,
    activeSlide?.pitchTransform,
  );
  const pitchMarkers = useMemo(
    () => (activeSlide?.players ?? []).filter((m) => m.area === 'pitch'),
    [activeSlide?.players],
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
  const capabilities = useMemo(
    () => ({
      hasBench: activePhase?.backgroundType !== 'image',
      hasBall: activeSlide?.ball.visible ?? false,
    }),
    [activePhase?.backgroundType, activeSlide?.ball.visible],
  );

  const updateMarker = useCallback(
    (id: string, patch: Partial<Player>) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_PLAYER',
        id,
        patch: patch as Partial<PitchPlayer>,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const updateMarkers = useCallback(
    (updates: { id: string; patch: Partial<Player> }[]) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'MOVE_PLAYERS',
        moves: updates.map((u) => ({
          id: u.id,
          x: clampToScreenNorm(u.patch.x ?? 0),
          y: clampToScreenNorm(u.patch.y ?? 0),
        })),
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const moveMarkerToBench = useCallback(
    (id: string, x?: number, y?: number) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'MOVE_PLAYER_TO_BENCH',
        id,
        benchX: x !== undefined ? clampToScreenNorm(x) : undefined,
        benchY: y !== undefined ? clampToScreenNorm(y) : undefined,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const handleSelectObjectForDrag = useCallback(
    (target: string | SelectedObject | null, isShift?: boolean) => {
      selectObject(
        typeof target === 'string' ? { id: target, kind: 'player' } : target,
        isShift,
      );
    },
    [selectObject],
  );

  const isInteractive = activeTool === 'select';
  const baseDim = Math.min(pitchRect.width, pitchRect.height);

  const { handleDragStart, handleMarkerDragMove, handleDragEnd } =
    useMarkerDragHandlers({
      pitchRect,
      visibleMarkers,
      selectedIds,
      selectObject: handleSelectObjectForDrag,
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
        const src = (activeSlide?.players ?? []).find(
          (m) => m.id === connectingPlayerId,
        );
        if (src) {
          dispatchSlide(activePhaseId, activeSlideId, {
            type: 'ADD_CONNECT_LINE',
            playerId: src.id,
            line: {
              id: `cl-${Date.now()}`,
              toPlayerId: markerId,
              lineStyle: 'solid',
              color: src.style?.color ?? '#034694',
              strokeWidth: 2,
              visible: true,
            },
          });
          setConnectingPlayerId(null);
          return;
        }
      }
      selectObject({ id: markerId, kind: 'player' }, isShift);
      setIsHudOpen(true);
    },
    [
      connectingPlayerId,
      activeSlide?.players,
      dispatchSlide,
      activePhaseId,
      activeSlideId,
      setConnectingPlayerId,
      selectObject,
      setIsHudOpen,
    ],
  );

  const handleSelectText = useCallback(
    (e: KonvaClickEvent, id: string) => {
      e.cancelBubble = true;
      selectObject(
        { id, kind: 'text' },
        (e.evt as MouseEvent)?.shiftKey ?? false,
      );
      setIsHudOpen(true);
    },
    [selectObject, setIsHudOpen],
  );

  const handleUpdateVisionCone = useCallback(
    (
      marker: PitchPlayer,
      patch: Partial<NonNullable<PitchPlayer['visionCone']>>,
    ) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'SET_PLAYER_VISION_CONE',
        playerId: marker.id,
        cone: marker.visionCone
          ? { ...marker.visionCone, ...patch }
          : undefined,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const handleUpdateText = useCallback(
    (id: string, patch: Partial<DomainTextAnnotation>) => {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_TEXT',
        id,
        patch,
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const visibleItems = useMemo(
    () =>
      teamVisibility === 'both'
        ? sceneGraph.billboardItems
        : sceneGraph.billboardItems.filter(
            (item) =>
              item.kind !== 'player' ||
              item.player.team === teamVisibility ||
              item.player.team === 'neutral',
          ),
    [sceneGraph.billboardItems, teamVisibility],
  );

  return (
    <Layer id="billboard-object-layer" listening={listening}>
      <Group
        x={groupTransform.x}
        y={groupTransform.y}
        scaleX={groupTransform.scaleX}
        scaleY={groupTransform.scaleY}
      >
        {visibleItems.map((item) => (
          <BillboardItemNode
            key={item.kind === 'ball' ? 'ball-object' : item.id}
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
            updateText={handleUpdateText}
          />
        ))}
      </Group>
    </Layer>
  );
});
