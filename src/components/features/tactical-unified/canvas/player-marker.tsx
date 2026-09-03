'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect, useRef, useState } from 'react';
import { Circle, Group, Text, Transformer } from 'react-konva';
import { getPlayerMaster } from '@/lib/db/queries';
import { getLastName } from '@/lib/tactical/player-formatting';
import type { Player, Slide } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';
import { PlayerBadge } from './player-badge';
import { PlayerFocusSpotlight } from './player-focus-spotlight';
import { PlayerMarkerCircle } from './player-marker-circle';
import { PlayerMarkerRing } from './player-marker-ring';
import { PlayerVisionCone } from './player-vision-cone';

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
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onSelect: (
    e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => void;
  onSelectOption: (tab: 'vision' | 'connect' | 'badge' | 'focus') => void;
  onUpdateVisionCone: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onUpdatePlayerStyle?: (stylePatch: Partial<Player['style']>) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: Player) => void;
}

export const PlayerMarker = React.memo(function PlayerMarker({
  player,
  stageSize,
  isSelected,
  nodesRegistryRef,
  onSelect,
  onSelectOption,
  onUpdateVisionCone,
  onUpdatePlayerStyle,
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

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // 顔写真画像のロード
  useEffect(() => {
    let isMounted = true;
    let localBlobUrl: string | null = null;

    if (player.style.insideContent === 'photo') {
      if (player.style.photoUrl) {
        const img = new window.Image();
        img.src = player.style.photoUrl;
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          if (isMounted) setLoadedImage(img);
        };
        img.onerror = () => {
          if (isMounted) setLoadedImage(null);
        };
      } else if (player.playerId && !Number.isNaN(Number(player.playerId))) {
        getPlayerMaster(Number(player.playerId)).then((master) => {
          if (!isMounted) return;
          if (master?.photoBlob) {
            localBlobUrl = URL.createObjectURL(master.photoBlob);
            const img = new window.Image();
            img.src = localBlobUrl;
            img.onload = () => {
              if (isMounted) setLoadedImage(img);
            };
            img.onerror = () => {
              if (isMounted) setLoadedImage(null);
            };
          } else if (master?.photoUrl) {
            const img = new window.Image();
            img.src = master.photoUrl;
            img.onload = () => {
              if (isMounted) setLoadedImage(img);
            };
            img.onerror = () => {
              if (isMounted) setLoadedImage(null);
            };
          }
        });
      } else {
        setLoadedImage(null);
      }
    } else {
      setLoadedImage(null);
    }
    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [player.style.insideContent, player.style.photoUrl, player.playerId]);

  const dragGlowRef = useRef<any>(null);
  const ringShapeNodeRef = useRef<any>(null);
  const ringTransformerRef = useRef<any>(null);
  const spotlightGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!ringTransformerRef.current) return;
    if (
      isSelected &&
      player.style.markerType === 'ring' &&
      ringShapeNodeRef.current
    ) {
      ringTransformerRef.current.nodes([ringShapeNodeRef.current]);
      ringTransformerRef.current.getLayer()?.batchDraw();
    } else {
      ringTransformerRef.current.nodes([]);
      ringTransformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, player.style.markerType, radius]);

  return (
    <Group
      ref={(node) => {
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
      draggable={isInteractive}
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(width, pos.x)),
        y: Math.max(0, Math.min(height, pos.y)),
      })}
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
      {/* ── フォーカス (上から注ぐ光の柱 スポットライトピラー効果) ── */}
      {player.focus && (
        <PlayerFocusSpotlight
          focus={player.focus}
          radius={radius}
          spotlightGroupRef={spotlightGroupRef}
        />
      )}

      {/* ── ドラッグ時オレンジ発光グロー (半径5) ── */}
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
          isSelected={isSelected}
          onUpdateVisionCone={onUpdateVisionCone}
          onSelectOption={() => onSelectOption('vision')}
        />
      )}

      {/* ── メインの選手マーカー (2D Circle または 3D Foot Ring) ── */}
      {player.style.markerType === 'ring' ? (
        <PlayerMarkerRing
          player={player}
          radius={radius}
          numScale={numScale}
          isSelected={isSelected}
          shapeRef={ringShapeNodeRef}
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

      {/* プレイヤー名ラベル (白文字 + 黒アウトラインでピッチ上で高視認性) */}
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

      {/* 3D Foot Ring 選択時のキャンバス変形ハンドル (Transformer: 縦横比完全固定) */}
      {player.style.markerType === 'ring' && isSelected && (
        <Transformer
          ref={ringTransformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 15 || Math.abs(newBox.height) < 10)
              return oldBox;
            return newBox;
          }}
          keepRatio={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          rotateEnabled={false}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={2}
          onTransform={() => {
            const node = ringShapeNodeRef.current;
            if (!node) return;
            const sx = node.scaleX();
            node.position({ x: 0, y: 0 });
            node.scaleX(1);
            node.scaleY(1);
            const currentScale = player.style.sizeScale ?? 1.0;
            const newScale = Math.max(
              0.4,
              Math.min(3.0, currentScale * Math.abs(sx)),
            );
            const roundedScale = Math.round(newScale * 10) / 10;
            if (roundedScale !== currentScale) {
              onUpdatePlayerStyle?.({ sizeScale: roundedScale });
            }
          }}
          onTransformEnd={() => {
            const node = ringShapeNodeRef.current;
            if (!node) return;
            const sx = node.scaleX();
            node.position({ x: 0, y: 0 });
            node.scaleX(1);
            node.scaleY(1);
            const currentScale = player.style.sizeScale ?? 1.0;
            const newScale = Math.max(
              0.4,
              Math.min(3.0, currentScale * Math.abs(sx)),
            );
            const roundedScale = Math.round(newScale * 10) / 10;
            onUpdatePlayerStyle?.({ sizeScale: roundedScale });
          }}
        />
      )}
    </Group>
  );
});
