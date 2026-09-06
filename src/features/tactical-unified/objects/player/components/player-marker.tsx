'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useRef } from 'react';
import { Circle, Group } from 'react-konva';
import { useNodePositionTransition } from '@/features/tactical-unified/objects/canvas';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getLastName } from '@/lib/tactical/player-formatting';
import { usePlayerPhoto } from '../hooks/use-player-photo';
import { normX, normY, type PlayerMarkerProps } from '../types';
import { PlayerBadge } from './player-badge';
import { PlayerFocusSpotlight } from './player-focus-spotlight';
import { PlayerMarkerCircle } from './player-marker-circle';
import { PlayerMarkerLabel } from './player-marker-label';
import { PlayerMarkerRing } from './player-marker-ring';
import { PlayerVisionCone } from './player-vision-cone';

export const PlayerMarker = React.memo(function PlayerMarker({
  player,
  stageSize,
  isSelected,
  isVisionConeSelected,
  isFocusSelected,
  nodesRegistryRef,
  onSelect,
  onSelectOption,
  onUpdateVisionCone,
  onDragStart,
  onDragMove,
  onDragEnd,
}: PlayerMarkerProps) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const setRightPanelOpen = useTacticalUnifiedStore((s) => s.setRightPanelOpen);
  const isInteractive = activeTool === 'select' || connectingPlayerId !== null;

  const { width, height } = stageSize;
  const baseDim = Math.min(width, height);
  const sizeScale = player.style.sizeScale ?? 1.0;
  const radius = baseDim * 0.032 * sizeScale;
  const pxX = normX(player.x, width);
  const pxY = normY(player.y, height);
  const displayName = player.name ? getLastName(player.name) : '';
  const labelScale = player.style.labelSizeScale ?? 1.0;
  const numScale = player.style.numberSizeScale ?? 1.0;

  const loadedImage = usePlayerPhoto({
    insideContent: player.style.insideContent,
    photoUrl: player.style.photoUrl,
    playerId: player.playerId,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dragGlowRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spotlightGroupRef = useRef<any>(null);
  const groupRef = useRef<Konva.Group | null>(null);
  const isDraggingRef = useRef(false);

  useNodePositionTransition({
    nodeRef: groupRef,
    x: pxX,
    y: pxY,
  });

  const handleDblClick = (e: { cancelBubble: boolean }) => {
    e.cancelBubble = true;
    setRightPanelTab('inspector');
    setRightPanelOpen(true);
  };

  const handleStartDrag = (e: KonvaEventObject<DragEvent>) => {
    isDraggingRef.current = true;
    onDragStart(e, player);
    if (dragGlowRef.current) {
      dragGlowRef.current.opacity(1);
      dragGlowRef.current.getLayer()?.batchDraw();
    }
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grabbing';
  };

  const handleEndDrag = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    node.scale({ x: 1, y: 1 });
    if (dragGlowRef.current) {
      dragGlowRef.current.opacity(0);
      dragGlowRef.current.getLayer()?.batchDraw();
    }
    const stage = node.getStage();
    if (stage) stage.container().style.cursor = 'default';
    onDragEnd(e, player);
    // ドラッグ直後の誤クリック判定を防止
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 50);
  };

  const handleClick = (
    e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => {
    if (isDraggingRef.current) return;
    onSelect(e);
  };

  return (
    <Group
      ref={(node) => {
        groupRef.current = node;
        if (nodesRegistryRef) {
          if (node) {
            nodesRegistryRef.current.playerNodes.set(player.id, node);
          } else {
            nodesRegistryRef.current.playerNodes.delete(player.id);
          }
        }
      }}
      x={pxX}
      y={pxY}
      listening={isInteractive}
      draggable={isInteractive && !player.locked}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dragBoundFunc={function (this: any, pos) {
        const parentPos = this.getParent()?.getAbsolutePosition() ?? {
          x: 0,
          y: 0,
        };
        return {
          x: Math.max(parentPos.x, Math.min(parentPos.x + width, pos.x)),
          y: Math.max(parentPos.y, Math.min(parentPos.y + height, pos.y)),
        };
      }}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragStart={handleStartDrag}
      onDragMove={(e) => onDragMove(e as KonvaEventObject<DragEvent>, player)}
      onDragEnd={handleEndDrag}
      onTransform={() => spotlightGroupRef.current?.getLayer()?.batchDraw()}
    >
      {/* ── フォーカス ── */}
      {player.focus && (
        <PlayerFocusSpotlight
          focus={player.focus}
          radius={radius}
          isRing={player.style.markerType === 'ring'}
          spotlightGroupRef={spotlightGroupRef}
          isSelected={isFocusSelected}
          onSelectOption={() => onSelectOption('focus')}
        />
      )}

      {/* ── ドラッグ時オレンジ発光グロー ── */}
      <Circle
        ref={dragGlowRef}
        radius={radius + 5}
        fill="#f97316"
        opacity={0}
        shadowColor="#f97316"
        shadowBlur={14}
        shadowOpacity={0.75}
        listening={false}
      />

      {player.visionCone && (
        <PlayerVisionCone
          cone={player.visionCone}
          radius={radius}
          isRing={player.style.markerType === 'ring'}
          stageSize={stageSize}
          isSelected={isVisionConeSelected}
          onUpdateVisionCone={onUpdateVisionCone}
          onSelectOption={() => onSelectOption('vision')}
        />
      )}

      {/* ── メインの選手マーカー ── */}
      {player.style.markerType === 'ring' ? (
        <PlayerMarkerRing
          player={player}
          radius={radius}
          numScale={numScale}
          isSelected={isSelected}
        />
      ) : (
        <PlayerMarkerCircle
          player={player}
          radius={radius}
          numScale={numScale}
          isSelected={isSelected}
          loadedImage={loadedImage}
        />
      )}

      <PlayerMarkerLabel
        player={player}
        radius={radius}
        displayName={displayName}
        labelScale={labelScale}
      />

      {player.badges.map((badge) => (
        <PlayerBadge
          key={badge.id}
          badge={badge}
          radius={radius}
          onSelectOption={() => onSelectOption('badge')}
        />
      ))}
    </Group>
  );
});
