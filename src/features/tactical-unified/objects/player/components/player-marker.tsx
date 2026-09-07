'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useCallback, useRef } from 'react';
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

  const dragGlowRef = useRef<Konva.Circle | null>(null);
  const spotlightGroupRef = useRef<Konva.Group | null>(null);
  const groupRef = useRef<Konva.Group | null>(null);
  const isDraggingRef = useRef(false);

  useNodePositionTransition({
    nodeRef: groupRef,
    x: pxX,
    y: pxY,
  });

  const handleDblClick = useCallback(
    (e: { cancelBubble: boolean }) => {
      e.cancelBubble = true;
      setRightPanelTab('inspector');
      setRightPanelOpen(true);
    },
    [setRightPanelTab, setRightPanelOpen],
  );

  const handleStartDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      isDraggingRef.current = true;
      onDragStart(e, player);
      if (dragGlowRef.current) {
        dragGlowRef.current.opacity(1);
        dragGlowRef.current.getLayer()?.batchDraw();
      }
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';
    },
    [onDragStart, player],
  );

  const handleEndDrag = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
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
    },
    [onDragEnd, player],
  );

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>) => {
      if (isDraggingRef.current) return;
      onSelect(e);
    },
    [onSelect],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      onDragMove(e, player);
    },
    [onDragMove, player],
  );

  const handleTransform = useCallback(() => {
    spotlightGroupRef.current?.getLayer()?.batchDraw();
  }, []);

  const handleSelectFocus = useCallback(() => {
    onSelectOption('focus');
  }, [onSelectOption]);

  const handleSelectVision = useCallback(() => {
    onSelectOption('vision');
  }, [onSelectOption]);

  const handleSelectBadge = useCallback(() => {
    onSelectOption('badge');
  }, [onSelectOption]);

  const dragBoundFunc = useCallback(
    function (this: Konva.Node, pos: Konva.Vector2d) {
      const parentPos = this.getParent()?.getAbsolutePosition() ?? {
        x: 0,
        y: 0,
      };
      return {
        x: Math.max(
          parentPos.x - width,
          Math.min(parentPos.x + width * 2, pos.x),
        ),
        y: Math.max(
          parentPos.y - height,
          Math.min(parentPos.y + height * 2, pos.y),
        ),
      };
    },
    [width, height],
  );

  const setGroupRef = useCallback(
    (node: Konva.Group | null) => {
      groupRef.current = node;
      if (nodesRegistryRef) {
        if (node) {
          nodesRegistryRef.current.playerNodes.set(player.id, node);
        } else {
          nodesRegistryRef.current.playerNodes.delete(player.id);
        }
      }
    },
    [nodesRegistryRef, player.id],
  );

  return (
    <Group
      ref={setGroupRef}
      x={pxX}
      y={pxY}
      listening={isInteractive}
      draggable={isInteractive && !player.locked}
      dragBoundFunc={dragBoundFunc}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragStart={handleStartDrag}
      onDragMove={handleDragMove}
      onDragEnd={handleEndDrag}
      onTransform={handleTransform}
    >
      {/* ── フォーカス ── */}
      {player.focus && (
        <PlayerFocusSpotlight
          focus={player.focus}
          radius={radius}
          isRing={player.style.markerType === 'ring'}
          spotlightGroupRef={spotlightGroupRef}
          isSelected={isFocusSelected}
          onSelectOption={handleSelectFocus}
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
          onSelectOption={handleSelectVision}
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
          onSelectOption={handleSelectBadge}
        />
      ))}
    </Group>
  );
});
