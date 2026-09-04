'use client';

/**
 * player-layer.tsx
 * Orchestrates player markers, ghost trajectories, onionskins, and attached objects follow-up.
 */

import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { SelectedObjectKind } from '@/features/tactical-unified/stores/tool-slice';
import { usePlayerLayerDrag } from '../hooks/use-player-layer-drag';
import type { PlayerLayerProps } from '../types';
import { PlayerConnectLines } from './player-connect-lines';
import { PlayerGhostTrajectory } from './player-ghost-trajectory';
import { PlayerMarker } from './player-marker';
import { PlayerOnionskin } from './player-onionskin';

export type { PlayerLayerProps };

export function PlayerLayer({
  slide,
  stageSize,
  nodesRegistryRef,
}: PlayerLayerProps) {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
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
  const activeMarkerOptionTab = useTacticalUnifiedStore(
    (s) => s.activeMarkerOptionTab,
  );

  const {
    ghostGroupRef,
    ghostLineRef,
    ghostMarkerGroupRef,
    ghostCircleRef,
    ghostTextRef,
    ghostLabelRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = usePlayerLayerDrag({
    slide,
    prevSlide,
    stageSize,
    nodesRegistryRef,
  });

  const selectedVisionConePlayerIds = new Set(
    selectedObjects
      .filter((o) => o.kind === 'vision-cone')
      .map((o) => o.parentPlayerId ?? o.id.replace(/-vision-cone$/, '')),
  );
  const selectedFocusPlayerIds = new Set(
    selectedObjects
      .filter((o) => o.kind === 'focus')
      .map((o) => o.parentPlayerId ?? o.id.replace(/-focus$/, '')),
  );
  const selectedConnectLinePlayerIds = new Set(
    selectedObjects
      .filter((o) => o.kind === 'connect-line')
      .map((o) => o.parentPlayerId ?? o.id.replace(/-connect-line$/, '')),
  );

  return (
    <>
      {/* プレビューステージ用ゴースト描画 */}
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
        selectedPlayerIds={selectedConnectLinePlayerIds}
        onSelectConnectLine={(playerId) => {
          selectObject({
            id: `${playerId}-connect-line`,
            kind: 'connect-line',
            parentPlayerId: playerId,
          });
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
                nodesRegistryRef={nodesRegistryRef}
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
          const isPlayerSelected = selectedObjects.some(
            (o) => o.kind === 'player' && o.id === player.id,
          );
          const isSelected = selectedObjects.some((o) => o.id === player.id);
          const isConnectingSource = connectingPlayerId === player.id;
          const isVisionConeSelected =
            selectedVisionConePlayerIds.has(player.id) ||
            (isPlayerSelected && activeMarkerOptionTab === 'vision');
          const isFocusSelected =
            selectedFocusPlayerIds.has(player.id) ||
            (isPlayerSelected && activeMarkerOptionTab === 'focus');

          return (
            <PlayerMarker
              key={player.id}
              player={player}
              slide={slide}
              stageSize={stageSize}
              isSelected={isSelected || isConnectingSource}
              isVisionConeSelected={isVisionConeSelected}
              isFocusSelected={isFocusSelected}
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
                const kindMap: Record<string, SelectedObjectKind> = {
                  vision: 'vision-cone',
                  connect: 'connect-line',
                  badge: 'badge',
                  focus: 'focus',
                };
                const kind = kindMap[tab];
                if (kind) {
                  selectObject({
                    id: `${player.id}-${kind}`,
                    kind,
                    parentPlayerId: player.id,
                  });
                }
              }}
              onUpdateVisionCone={(patch) => {
                if (player.visionCone) {
                  setVisionCone(activeSlideId, player.id, {
                    ...player.visionCone,
                    ...patch,
                  });
                }
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
