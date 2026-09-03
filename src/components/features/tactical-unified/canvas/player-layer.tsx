'use client';

/**
 * player-layer.tsx
 * Orchestrates player markers, ghost trajectories, onionskins, and attached objects follow-up.
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useRef } from 'react';
import type { Player, Slide } from '@/lib/types/tactical-unified';
import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';
import { PlayerConnectLines } from './player-connect-lines';
import {
  createPlayerDragContext,
  handlePlayerDragMove,
  type PlayerDragContext,
} from './player-drag-handler';
import { PlayerGhostTrajectory } from './player-ghost-trajectory';
import { PlayerMarker } from './player-marker';
import { PlayerOnionskin } from './player-onionskin';

export interface PlayerLayerProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function PlayerLayer({
  slide,
  stageSize,
  nodesRegistryRef,
}: PlayerLayerProps) {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const movePlayer = useTacticalUnifiedStore((s) => s.movePlayer);
  const moveMultiplePlayersByDelta = useTacticalUnifiedStore(
    (s) => s.moveMultiplePlayersByDelta,
  );
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const addConnectLine = useTacticalUnifiedStore((s) => s.addConnectLine);
  const setVisionCone = useTacticalUnifiedStore((s) => s.setVisionCone);
  const setActiveMarkerOptionTab = useTacticalUnifiedStore(
    (s) => s.setActiveMarkerOptionTab,
  );
  const updatePlayerTrajectory = useTacticalUnifiedStore(
    (s) => s.updatePlayerTrajectory,
  );
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);

  // オニオンスキン (前スライドゴースト表示) 用 Refs
  const ghostGroupRef = useRef<any>(null);
  const ghostLineRef = useRef<any>(null);
  const ghostMarkerGroupRef = useRef<any>(null);
  const ghostCircleRef = useRef<any>(null);
  const ghostTextRef = useRef<any>(null);
  const ghostLabelRef = useRef<any>(null);

  const dragContextRef = useRef<PlayerDragContext | null>(null);

  const handleDragStart = (
    _e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    dragContextRef.current = createPlayerDragContext({
      draggedPlayer,
      slide,
      prevSlide,
      stageSize,
      selectedObjects,
      selectObject,
      onionSkinRefs: {
        ghostGroup: ghostGroupRef.current,
        ghostLine: ghostLineRef.current,
        ghostMarkerGroup: ghostMarkerGroupRef.current,
        ghostCircle: ghostCircleRef.current,
        ghostText: ghostTextRef.current,
        ghostLabel: ghostLabelRef.current,
      },
    });
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>, _player: Player) => {
    const ctx = dragContextRef.current;
    if (!ctx) return;
    handlePlayerDragMove({
      e,
      ctx,
      stageSize,
      nodesRegistryRef,
      onionSkinGhostLine: ghostLineRef.current,
    });
  };

  const handleDragEnd = (
    e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    const ctx = dragContextRef.current;
    const { width, height } = stageSize;
    const node = e.currentTarget;

    if (ctx && ctx.movingPlayerIds.length > 0) {
      const deltaNormX = ((node.x() - ctx.startPx.x) / width) * 100;
      const deltaNormY = ((node.y() - ctx.startPx.y) / height) * 100;

      moveMultiplePlayersByDelta(
        activeSlideId,
        ctx.movingPlayerIds,
        deltaNormX,
        deltaNormY,
      );
    } else {
      const finalNormX = Math.max(0, Math.min(100, (node.x() / width) * 100));
      const finalNormY = Math.max(0, Math.min(100, (node.y() / height) * 100));
      movePlayer(activeSlideId, draggedPlayer.id, finalNormX, finalNormY);
    }

    if (ghostGroupRef.current) {
      ghostGroupRef.current.visible(false);
      ghostGroupRef.current.getLayer()?.batchDraw();
    }

    dragContextRef.current = null;
  };

  return (
    <>
      {/* ── オニオンスキン (前スライドゴースト表示 & 軌跡破線) ── */}
      <PlayerOnionskin
        stageSize={stageSize}
        ghostGroupRef={ghostGroupRef}
        ghostLineRef={ghostLineRef}
        ghostMarkerGroupRef={ghostMarkerGroupRef}
        ghostCircleRef={ghostCircleRef}
        ghostTextRef={ghostTextRef}
        ghostLabelRef={ghostLabelRef}
      />

      {/* ConnectLine Layer */}
      <PlayerConnectLines
        slide={slide}
        stageSize={stageSize}
        nodesRegistryRef={nodesRegistryRef}
        onSelectConnectLine={(playerId) => {
          selectObject({ id: playerId, kind: 'player' });
          setActiveMarkerOptionTab('connect');
        }}
      />

      {/* ── 選択中の選手に対するゴーストマーカー & 軌道矢印 & ベジェハンドル (常時表示: activeSlideIndex >= 1) ── */}
      {slide.index >= 1 &&
        prevSlide &&
        slide.players
          .filter(
            (p) =>
              p.area === 'pitch' &&
              selectedObjects.some((o) => o.kind === 'player' && o.id === p.id),
          )
          .map((player) => {
            const prevPlayer = prevSlide.players.find(
              (p) => p.id === player.id,
            );
            if (!prevPlayer || prevPlayer.area === 'bench') return null;

            return (
              <PlayerGhostTrajectory
                key={`ghost-traj-${player.id}`}
                player={player}
                prevPlayer={prevPlayer}
                stageSize={stageSize}
                activeSlideId={activeSlideId}
                onUpdateTrajectory={updatePlayerTrajectory}
              />
            );
          })}

      {slide.players
        .filter(
          (p) =>
            p.area === 'pitch' &&
            (teamVisibility === 'both' ||
              p.team === teamVisibility ||
              p.team === 'neutral'),
        )
        .map((player) => {
          const isSelected = selectedObjects.some((o) => o.id === player.id);
          const isConnectingSource = connectingPlayerId === player.id;

          return (
            <PlayerMarker
              key={player.id}
              player={player}
              slide={slide}
              stageSize={stageSize}
              isSelected={isSelected || isConnectingSource}
              nodesRegistryRef={nodesRegistryRef}
              onSelect={(e) => {
                e.cancelBubble = true;

                // コネクタ接続モード中
                if (connectingPlayerId) {
                  if (
                    player.id === connectingPlayerId ||
                    player.area === 'bench'
                  ) {
                    return;
                  }

                  const sourcePlayer = slide.players.find(
                    (p) => p.id === connectingPlayerId,
                  );
                  const connectColor = sourcePlayer?.style.color || '#3b82f6';

                  addConnectLine(activeSlideId, connectingPlayerId, {
                    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    toPlayerId: player.id,
                    lineStyle: 'solid',
                    color: connectColor,
                    strokeWidth: 2,
                    visible: true,
                  });
                  setConnectingPlayerId(null);
                  return;
                }

                // 通常の選択
                const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
                selectObject({ id: player.id, kind: 'player' }, isShift);
                if (!isSelected) {
                  setActiveMarkerOptionTab('vision');
                }
              }}
              onSelectOption={(tab) => {
                selectObject({ id: player.id, kind: 'player' });
                setActiveMarkerOptionTab(tab);
              }}
              onUpdateVisionCone={(patch) => {
                if (player.visionCone) {
                  setVisionCone(activeSlideId, player.id, {
                    ...player.visionCone,
                    ...patch,
                  });
                }
              }}
              onUpdatePlayerStyle={(stylePatch) => {
                updatePlayer(activeSlideId, player.id, {
                  style: { ...player.style, ...stylePatch },
                });
              }}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          );
        })}
    </>
  );
}
