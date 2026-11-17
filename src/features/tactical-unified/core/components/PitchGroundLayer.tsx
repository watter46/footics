'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Group, Layer, Line, Rect } from 'react-konva';
import {
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
  selectDomainPreviousSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import type {
  DomainArrowAnnotation,
  DomainPlayerTrajectory,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import {
  type PitchRectBounds,
  resolvePitchGroupTransform,
} from '../utils/canvas-coordinates';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { ArrowObject } from './annotations/ArrowObject';
import { PitchBackgroundImage } from './BackgroundImageLayer';
import { PlayerConnectLines } from './PlayerConnectLines';
import { PitchGroundGhosts } from './pitch-ground-ghosts';
import { ZoneObject } from './zones/ZoneObject';

export interface PitchGroundLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  listening?: boolean;
  sceneGraph: ResolvedSceneGraphDTO;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

function sortBySelectedIds<T extends { id: string }>(
  items: readonly T[],
  selectedIds: readonly string[],
): readonly T[] {
  if (selectedIds.length === 0) return items;
  return [...items].sort(
    (a, b) =>
      Number(selectedIds.includes(a.id)) - Number(selectedIds.includes(b.id)),
  );
}

export const PitchGroundLayer = memo(function PitchGroundLayer({
  stageSize,
  pitchRect,
  nodesRegistryRef,
  cleanRender,
  listening = true,
  sceneGraph,
}: PitchGroundLayerProps): ReactNode {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const activeTool = useSessionStore((s) => s.activeTool);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const selectObject = useSessionStore((s) => s.selectObject);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);

  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const prevSlide = selectDomainPreviousSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const aspectRatio =
    activePhase?.aspectRatio ??
    selectDomainActivePhaseAspectRatio(project, activePhaseId);
  const selectedIds = useMemo(
    () => selectedObjects.map((o) => o.id),
    [selectedObjects],
  );
  const groupTransform = resolvePitchGroupTransform(
    pitchRect,
    activeSlide?.pitchTransform,
  );

  const { pitchMarkers, visibleMarkers } = useMemo(() => {
    const pitch = (activeSlide?.players ?? []).filter(
      (m) => m.area === 'pitch',
    );
    const visible =
      teamVisibility === 'both'
        ? pitch
        : pitch.filter(
            (m) => m.team === teamVisibility || m.team === 'neutral',
          );
    return { pitchMarkers: pitch, visibleMarkers: visible };
  }, [activeSlide?.players, teamVisibility]);

  const isInteractive = activeTool === 'select';
  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  const updateZone = useCallback(
    (id: string, patch: Partial<DomainZoneAnnotation>) =>
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_ZONE',
        id,
        patch,
      }),
    [dispatchSlide, activePhaseId, activeSlideId],
  );
  const updateArrow = useCallback(
    (id: string, patch: Partial<DomainArrowAnnotation>) =>
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_ARROW',
        id,
        patch,
      }),
    [dispatchSlide, activePhaseId, activeSlideId],
  );
  const updatePlayerTrajectory = useCallback(
    (
      slideId: string,
      playerId: string,
      trajectory: DomainPlayerTrajectory | undefined,
    ) =>
      dispatchSlide(activePhaseId, slideId, {
        type: 'SET_PLAYER_TRAJECTORY',
        playerId,
        trajectory,
      }),
    [dispatchSlide, activePhaseId],
  );

  useEffect(() => {
    if (nodesRegistryRef?.current) {
      nodesRegistryRef.current.connectLineNodeMap = connectLineNodesRef.current;
    }
  }, [nodesRegistryRef]);

  const makeSelectHandler = useCallback(
    (id: string, kind: 'arrow' | 'zone') => (e: KonvaClickEvent) => {
      e.cancelBubble = true;
      selectObject({ id, kind }, (e.evt as MouseEvent)?.shiftKey ?? false);
      setIsHudOpen(true);
    },
    [selectObject, setIsHudOpen],
  );

  return (
    <Layer id="pitch-ground-layer" listening={listening}>
      <Rect
        x={0}
        y={0}
        width={stageSize.width}
        height={stageSize.height}
        fill="#000000"
        listening={false}
      />
      <Group
        x={groupTransform.x}
        y={groupTransform.y}
        scaleX={groupTransform.scaleX}
        scaleY={groupTransform.scaleY}
      >
        <PitchBackgroundImage
          width={pitchRect.width}
          height={pitchRect.height}
        />

        {/* ゾーンオブジェクト群 */}
        {sortBySelectedIds(sceneGraph.zones, selectedIds).map(
          (resolvedZone) => {
            const zone = activeSlide?.zones.find(
              (z) => z.id === resolvedZone.id,
            );
            if (!zone) return null;
            return (
              <ZoneObject
                key={zone.id}
                zone={
                  ('points' in zone ? zone : { ...zone, points: [] }) as never
                }
                stageSize={{ width: pitchRect.width, height: pitchRect.height }}
                isSelected={!cleanRender && selectedIds.includes(zone.id)}
                isInteractive={!cleanRender && isInteractive}
                onSelect={makeSelectHandler(zone.id, 'zone')}
                updateZone={updateZone as never}
                nodesRegistryRef={nodesRegistryRef}
                resolvedZone={resolvedZone}
              />
            );
          },
        )}

        {/* 矢印オブジェクト群 */}
        {sortBySelectedIds(sceneGraph.arrows, selectedIds).map(
          (resolvedArrow) => {
            const arrow = activeSlide?.arrows.find(
              (a) => a.id === resolvedArrow.id,
            );
            if (!arrow) return null;
            return (
              <ArrowObject
                key={arrow.id}
                arrow={arrow}
                stageSize={{ width: pitchRect.width, height: pitchRect.height }}
                isSelected={!cleanRender && selectedIds.includes(arrow.id)}
                isInteractive={!cleanRender && isInteractive}
                onSelect={makeSelectHandler(arrow.id, 'arrow')}
                updateArrow={updateArrow as never}
                nodesRegistryRef={nodesRegistryRef}
                resolvedArrow={resolvedArrow}
              />
            );
          },
        )}

        {/* 選手間コネクトライン */}
        <PlayerConnectLines
          selectedIds={cleanRender ? [] : selectedIds}
          isInteractive={!cleanRender && isInteractive}
          connectLineNodesRef={connectLineNodesRef}
          onSelectConnectLine={(id, parentPlayerId) => {
            selectObject({ id, kind: 'connect-line', parentPlayerId });
            setIsHudOpen(true);
          }}
          resolvedConnectLines={sceneGraph.connectLines}
        />

        {/* ── 6. ゴースト & 移動軌道 (Ghost & Trajectories) ── */}
        {!cleanRender &&
          sceneGraph.trajectories.map((traj) => {
            if (!traj.visible || selectedIds.includes(traj.playerId))
              return null;
            return (
              <Line
                key={`traj-dto-${traj.playerId}`}
                points={traj.flatPointsPx as number[]}
                stroke={traj.color}
                strokeWidth={2}
                dash={traj.dashArrayPx as number[]}
                lineCap="round"
                lineJoin="round"
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          })}
        {!cleanRender && (
          <PitchGroundGhosts
            visibleMarkers={visibleMarkers}
            prevPlayers={(prevSlide?.players ?? []).filter(
              (p): p is (typeof visibleMarkers)[number] => p.area === 'pitch',
            )}
            selectedIds={selectedIds}
            activeDragDelta={activeDragDelta}
            stageSize={{
              width: pitchRect.width,
              height: pitchRect.height,
            }}
            activeSlideId={activeSlideId}
            nodesRegistryRef={nodesRegistryRef}
            aspectRatio={aspectRatio}
            onUpdateTrajectory={updatePlayerTrajectory}
          />
        )}
      </Group>
    </Layer>
  );
});
