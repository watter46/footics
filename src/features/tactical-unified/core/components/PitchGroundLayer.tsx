'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { Group, Layer, Rect } from 'react-konva';
import { PlayerGhostTrajectory } from '@/features/tactical-unified/objects/player/components/player-ghost-trajectory';
import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { useCanvasStore } from '../hooks/use-canvas-store';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
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
  nodesRegistryRef?: React.MutableRefObject<any>;
  cleanRender?: boolean;
}

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export function PitchGroundLayer({
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

  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const updatePlayerTrajectory = useTacticalUnifiedStore(
    (s) => s.updatePlayerTrajectory,
  );

  const visibleMarkers =
    teamVisibility === 'both'
      ? markers
      : markers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

  const isInteractive = activeTool === 'select';
  const connectLineNodesRef = useRef<Map<string, Konva.Line>>(new Map());

  useEffect(() => {
    if (nodesRegistryRef?.current) {
      nodesRegistryRef.current.connectLineNodeMap = connectLineNodesRef.current;
    }
  });

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
        fill="#020617"
        listening={false}
      />
      <Group x={pitchRect.x} y={pitchRect.y}>
        {/* ピッチ背景画像 */}
        <PitchBackgroundImage
          width={pitchRect.width}
          height={pitchRect.height}
        />

        {/* メインキャンバス外枠確認枠線 (!cleanRender時) */}
        {!cleanRender && (
          <Rect
            x={0}
            y={0}
            width={pitchRect.width}
            height={pitchRect.height}
            stroke="#38bdf8"
            strokeWidth={2}
            listening={false}
          />
        )}

        {/* ゾーンオブジェクト群 */}
        {zones.map((zone) => (
          <ZoneObject
            key={zone.id}
            zone={zone}
            stageSize={{ width: pitchRect.width, height: pitchRect.height }}
            isSelected={selectedIds.includes(zone.id)}
            isInteractive={isInteractive}
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
            players={markers}
            stageSize={{ width: pitchRect.width, height: pitchRect.height }}
            isSelected={selectedIds.includes(arrow.id)}
            isInteractive={isInteractive}
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

        {/* スライド間ゴーストマーカー & 追跡曲線矢印 (cleanRender時は非表示) */}
        {!cleanRender &&
          visibleMarkers.map((marker) => {
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
                stageSize={{ width: pitchRect.width, height: pitchRect.height }}
                activeSlideId={activeSlideId}
                nodesRegistryRef={
                  nodesRegistryRef as
                    | React.MutableRefObject<CanvasNodesRegistry>
                    | undefined
                }
                aspectRatio={aspectRatio}
                onUpdateTrajectory={updatePlayerTrajectory}
              />
            );
          })}
      </Group>
    </Layer>
  );
}
