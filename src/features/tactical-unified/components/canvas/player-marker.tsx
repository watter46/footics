'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useRef } from 'react';
import { Circle, Group, Text } from 'react-konva';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player, Slide } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from './helpers/canvas-registry';
import { PlayerBadge } from './player-badge';
import { PlayerFocusSpotlight } from './player-focus-spotlight';
import { PlayerMarkerCircle } from './player-marker-circle';
import { PlayerMarkerRing } from './player-marker-ring';
import { PlayerVisionCone } from './player-vision-cone';
import { useNodePositionTransition } from './use-node-position-transition';
import { usePlayerPhoto } from './use-player-photo';

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

export interface PlayerMarkerProps {
  player: Player;
  slide: Slide;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isVisionConeSelected?: boolean;
  isFocusSelected?: boolean;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onSelect: (
    e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => void;
  onSelectOption: (tab: 'vision' | 'connect' | 'badge' | 'focus') => void;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: Player) => void;
}

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

  // 顔写真ロード (カスタムフック)
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

  useNodePositionTransition({
    nodeRef: groupRef,
    x: pxX,
    y: pxY,
  });

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
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={(e) => {
        e.cancelBubble = true;
        setRightPanelTab('inspector');
        setRightPanelOpen(true);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        setRightPanelTab('inspector');
        setRightPanelOpen(true);
      }}
      onDragStart={(e) => {
        onDragStart(e as KonvaEventObject<DragEvent>, player);
        if (dragGlowRef.current) {
          dragGlowRef.current.opacity(1);
          dragGlowRef.current.getLayer()?.batchDraw();
        }
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
      }}
      onDragMove={(e) => {
        onDragMove(e as KonvaEventObject<DragEvent>, player);
      }}
      onDragEnd={(e) => {
        const node = e.target;
        node.scale({ x: 1, y: 1 });
        if (dragGlowRef.current) {
          dragGlowRef.current.opacity(0);
          dragGlowRef.current.getLayer()?.batchDraw();
        }
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';
        onDragEnd(e as KonvaEventObject<DragEvent>, player);
      }}
      onTransform={() => {
        if (spotlightGroupRef.current) {
          spotlightGroupRef.current.getLayer()?.batchDraw();
        }
      }}
    >
      {/* ── フォーカス (スポットライトピラー効果 / 2Dネオングロー) ── */}
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

      {/* ── メインの選手マーカー (3Dリング または 2Dサークル) ── */}
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

      {/* プレイヤー名ラベル */}
      {player.style.bottomLabel === 'name' && displayName && (
        <Text
          x={-radius * 2}
          y={radius + 3}
          width={radius * 4}
          text={displayName}
          fontSize={radius * 0.65 * labelScale}
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={2}
          fillAfterStrokeEnabled={true}
          align="center"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {player.style.bottomLabel === 'number' && player.shirtNo && (
        <Text
          x={-radius * 2}
          y={radius + 3}
          width={radius * 4}
          text={`#${player.shirtNo}`}
          fontSize={radius * 0.65 * labelScale}
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={2}
          fillAfterStrokeEnabled={true}
          align="center"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* バッジ */}
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
