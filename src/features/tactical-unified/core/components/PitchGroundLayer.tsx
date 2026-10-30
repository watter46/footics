'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Group, Layer, Rect } from 'react-konva';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { calculatePitchTransform } from '../utils/canvas-pitch-transform-helper';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import type { CameraState } from '../utils/matrix-coordinates';
import { ArrowObject } from './annotations/ArrowObject';
import { PitchBackgroundImage } from './BackgroundImageLayer';
import { PlayerConnectLines } from './PlayerConnectLines';
import { ZoneObject } from './zones/ZoneObject';

export interface PitchGroundLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export const PitchGroundLayer = memo(function PitchGroundLayer({
  stageSize,
  pitchRect,
  activePolygonId,
  mousePreviewPos,
  nodesRegistryRef,
  cleanRender,
}: PitchGroundLayerProps): ReactNode {
  const zones = useCanvasStore((s) => s.annotations.zones);
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateZone = useCanvasStore((s) => s.updateZone);
  const updateArrow = useCanvasStore((s) => s.updateArrow);
  const setIsHudOpen = useCanvasStore((s) => s.setIsHudOpen);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio);

  const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');
  const prevSlide = useCanvasStore((s) => s.prevSlide);
  const activeSlideId = useCanvasStore((s) => s.activeSlideId ?? '');
  const updatePlayerTrajectory = useCanvasStore(
    (s) => s.updatePlayerTrajectory,
  );
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
  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  useEffect(() => {
    if (nodesRegistryRef?.current) {
      nodesRegistryRef.current.connectLineNodeMap = connectLineNodesRef.current;
    }
  }, [nodesRegistryRef]);

  const makeSelectHandler = useCallback(
    (id: string, kind: 'arrow' | 'zone') => {
      return (e: KonvaClickEvent) => {
        e.cancelBubble = true;
        const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
        selectObject({ id, kind }, isShift);
        setIsHudOpen(true);
      };
    },
    [selectObject, setIsHudOpen],
  );

  return (
    <Layer id="pitch-ground-layer">
      {/* Stage 全面の背景 Rect */}
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
        {/* ピッチ背景画像 */}
        <PitchBackgroundImage
          width={pitchRect.width}
          height={pitchRect.height}
        />

        {/* ゾーンオブジェクト群 */}
        {zones.map((zone) => (
          <ZoneObject
            key={zone.id}
            zone={zone}
            stageSize={{ width: pitchRect.width, height: pitchRect.height }}
            isSelected={!cleanRender && selectedIds.includes(zone.id)}
            isInteractive={!cleanRender && isInteractive}
            onSelect={makeSelectHandler(zone.id, 'zone')}
            updateZone={updateZone}
            nodesRegistryRef={nodesRegistryRef}
            isCreatingThis={zone.id === activePolygonId}
            mousePreviewPos={mousePreviewPos}
          />
        ))}

        {/* 矢印オブジェクト群 */}
        {arrows.map((arrow) => (
          <ArrowObject
            key={arrow.id}
            arrow={arrow}
            players={pitchMarkers}
            stageSize={{ width: pitchRect.width, height: pitchRect.height }}
            isSelected={!cleanRender && selectedIds.includes(arrow.id)}
            isInteractive={!cleanRender && isInteractive}
            onSelect={makeSelectHandler(arrow.id, 'arrow')}
            updateArrow={updateArrow}
            nodesRegistryRef={nodesRegistryRef}
          />
        ))}

        {/* 選手間コネクトライン */}
        <PlayerConnectLines
          markers={visibleMarkers}
          width={pitchRect.width}
          height={pitchRect.height}
          selectedIds={cleanRender ? [] : selectedIds}
          isInteractive={!cleanRender && isInteractive}
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

        {/* スライド間ゴーストマーカー & 追跡曲線矢印 (cleanRender時は非表示) */}
        {!cleanRender &&
          visibleMarkers.map((marker) => {
            if (marker.area === 'bench') return null;
            const prevPlayer = prevSlide?.players.find(
              (p) => p.id === marker.id && p.area === 'pitch',
            );
            if (!prevPlayer) return null;
            if (!selectedIds.includes(marker.id)) return null;
            if (
              Math.hypot(marker.x - prevPlayer.x, marker.y - prevPlayer.y) < 1
            ) {
              return null;
            }

            return (
              <Group
                key={`ghost-${marker.id}`}
                id={`ghost-trajectory-${marker.id}`}
              >
                <PlayerGhostTrajectory
                  player={marker}
                  prevPlayer={prevPlayer}
                  stageSize={{
                    width: pitchRect.width,
                    height: pitchRect.height,
                  }}
                  activeSlideId={activeSlideId}
                  nodesRegistryRef={nodesRegistryRef}
                  aspectRatio={aspectRatio}
                  onUpdateTrajectory={updatePlayerTrajectory ?? (() => {})}
                />
              </Group>
            );
          })}
      </Group>
    </Layer>
  );
});
