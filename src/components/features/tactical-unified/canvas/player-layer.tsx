'use client';

/**
 * player-layer.tsx
 * Konva player markers — D&D / Real-time Attached Objects Follow / Interactive VisionCone / ConnectLine / Badge / Photo
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect, useRef, useState } from 'react';
import {
  Arc,
  Circle,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
} from 'react-konva';
import { getLastName } from '@/lib/tactical/player-formatting';
import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';

export interface PlayerLayerProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

function getQuadraticBezierPoints(
  startX: number,
  startY: number,
  cpX: number,
  cpY: number,
  endX: number,
  endY: number,
  steps = 30,
) {
  const points: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * endY;
    points.push(x, y);
  }
  return points;
}

// ── VisionCone ──────────────────────────────────────────────────────────

function VisionConeShape({
  cone,
  radius,
  stageSize,
  isSelected,
  onUpdateVisionCone,
  onSelectOption,
}: {
  cone: NonNullable<Player['visionCone']>;
  radius: number;
  stageSize: { width: number; height: number };
  isSelected?: boolean;
  onUpdateVisionCone?: (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => void;
  onSelectOption?: () => void;
}) {
  if (!cone.visible) return null;
  const pxRadius = normX(cone.radius, stageSize.width);
  const spreadDeg = (cone.spreadRad * 180) / Math.PI;
  const angleDeg = (cone.angleRad * 180) / Math.PI - spreadDeg / 2;
  const alphaHex = Math.round((cone.opacity ?? 0.3) * 255)
    .toString(16)
    .padStart(2, '0');

  // Interactive handles positions
  const dirHandleX = pxRadius * Math.cos(cone.angleRad);
  const dirHandleY = pxRadius * Math.sin(cone.angleRad);

  const edge1Angle = cone.angleRad - cone.spreadRad / 2;
  const edge1X = pxRadius * 0.85 * Math.cos(edge1Angle);
  const edge1Y = pxRadius * 0.85 * Math.sin(edge1Angle);

  const edge2Angle = cone.angleRad + cone.spreadRad / 2;
  const edge2X = pxRadius * 0.85 * Math.cos(edge2Angle);
  const edge2Y = pxRadius * 0.85 * Math.sin(edge2Angle);

  return (
    <Group>
      <Arc
        x={0}
        y={0}
        innerRadius={radius + 2}
        outerRadius={pxRadius}
        angle={spreadDeg}
        rotation={angleDeg}
        fill={cone.color + alphaHex}
        stroke={isSelected ? '#38bdf8' : undefined}
        strokeWidth={isSelected ? 1 : 0}
        listening={true}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelectOption?.();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelectOption?.();
        }}
      />

      {isSelected && onUpdateVisionCone && (
        <Group>
          {/* 方向 & 視野長ドラッグハンドル */}
          <Circle
            x={dirHandleX}
            y={dirHandleY}
            radius={7}
            fill="#ffffff"
            stroke="#0284c7"
            strokeWidth={2}
            draggable
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={3}
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let angleRad = Math.atan2(curY, curX);
              if (angleRad < 0) angleRad += 2 * Math.PI;
              const newRadius = Math.max(
                8,
                Math.min(60, (Math.hypot(curX, curY) / stageSize.width) * 100),
              );
              onUpdateVisionCone({ angleRad, radius: Math.round(newRadius) });
            }}
          />

          {/* 広がり角ドラッグハンドル 1 */}
          <Circle
            x={edge1X}
            y={edge1Y}
            radius={5.5}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={1.5}
            draggable
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let dragAngle = Math.atan2(curY, curX);
              if (dragAngle < 0) dragAngle += 2 * Math.PI;
              let diff = Math.abs(dragAngle - cone.angleRad);
              if (diff > Math.PI) diff = 2 * Math.PI - diff;
              const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
              onUpdateVisionCone({ spreadRad });
            }}
          />

          {/* 広がり角ドラッグハンドル 2 */}
          <Circle
            x={edge2X}
            y={edge2Y}
            radius={5.5}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={1.5}
            draggable
            onMouseEnter={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const c = e.target.getStage()?.container();
              if (c) c.style.cursor = 'default';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const curX = e.target.x();
              const curY = e.target.y();
              let dragAngle = Math.atan2(curY, curX);
              if (dragAngle < 0) dragAngle += 2 * Math.PI;
              let diff = Math.abs(dragAngle - cone.angleRad);
              if (diff > Math.PI) diff = 2 * Math.PI - diff;
              const spreadRad = Math.max(0.3, Math.min(Math.PI, diff * 2));
              onUpdateVisionCone({ spreadRad });
            }}
          />
        </Group>
      )}
    </Group>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────

function BadgeShape({
  badge,
  radius,
  onSelectOption,
}: {
  badge: Player['badges'][number];
  radius: number;
  onSelectOption?: () => void;
}) {
  if (!badge.visible) return null;
  const bw = Math.max(badge.label.length * 6 + 8, 24);
  const bh = 14;
  const bx = badge.offsetX - bw / 2;
  const by = -radius - bh - 4 + badge.offsetY;

  return (
    <Group
      x={bx}
      y={by}
      listening={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
    >
      <Rect width={bw} height={bh} fill={badge.color} cornerRadius={3} />
      <Text
        x={0}
        y={2}
        width={bw}
        text={badge.label}
        fontSize={9}
        fill={badge.textColor}
        align="center"
        fontStyle="bold"
      />
    </Group>
  );
}

// ── ConnectLine Group ──────────────────────────────────────────────────

function ConnectLineGroup({
  slide,
  stageSize,
  nodesRegistryRef,
  onSelectConnectLine,
}: {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onSelectConnectLine?: (playerId: string) => void;
}) {
  const { width, height } = stageSize;
  const teamVisibility = useTacticalUnifiedStore((s) => s.teamVisibility);
  const pitchPlayers = slide.players.filter(
    (p) =>
      p.area === 'pitch' &&
      (teamVisibility === 'both' ||
        p.team === teamVisibility ||
        p.team === 'neutral'),
  );
  const playerMap = new Map(pitchPlayers.map((p) => [p.id, p]));

  return (
    <Group listening={false}>
      {pitchPlayers
        .filter((p) => p.connectLines.length > 0)
        .flatMap((p) =>
          p.connectLines
            .filter((cl) => cl.visible && playerMap.has(cl.toPlayerId))
            .map((cl) => {
              const toPlayer = playerMap.get(cl.toPlayerId);
              if (!toPlayer) return null;
              const x1 = normX(p.x, width);
              const y1 = normY(p.y, height);
              const x2 = normX(toPlayer.x, width);
              const y2 = normY(toPlayer.y, height);

              const dash =
                cl.lineStyle === 'dashed'
                  ? [6, 4]
                  : cl.lineStyle === 'dotted'
                    ? [2, 3]
                    : undefined;

              return (
                <Line
                  key={cl.id}
                  ref={(node) => {
                    if (nodesRegistryRef) {
                      if (node) {
                        nodesRegistryRef.current.connectLineNodes.set(
                          cl.id,
                          node,
                        );
                      } else {
                        nodesRegistryRef.current.connectLineNodes.delete(cl.id);
                      }
                    }
                  }}
                  points={[x1, y1, x2, y2]}
                  stroke={cl.color}
                  strokeWidth={cl.strokeWidth ?? 2}
                  dash={dash}
                  listening={true}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine?.(p.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine?.(p.id);
                  }}
                />
              );
            }),
        )}
    </Group>
  );
}

// ── Single Player Marker ──────────────────────────────────────────────

interface PlayerMarkerProps {
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
  onDragStart: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: Player) => void;
}

const PlayerMarker = React.memo(function PlayerMarker({
  player,
  stageSize,
  isSelected,
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
    if (player.style.insideContent === 'photo' && player.style.photoUrl) {
      const img = new window.Image();
      img.src = player.style.photoUrl;
      img.crossOrigin = 'Anonymous';
      img.onload = () => setLoadedImage(img);
      img.onerror = () => setLoadedImage(null);
    } else {
      setLoadedImage(null);
    }
  }, [player.style.insideContent, player.style.photoUrl]);

  const dragGlowRef = useRef<any>(null);

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
      onDragStart={(e) => {
        const node = e.currentTarget;
        node.moveToTop();
        if (dragGlowRef.current) {
          dragGlowRef.current.opacity(0.5);
          dragGlowRef.current.getLayer()?.batchDraw();
        }
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
        onDragStart(e as KonvaEventObject<DragEvent>, player);
      }}
      onDragMove={(e) => {
        onDragMove(e as KonvaEventObject<DragEvent>, player);
      }}
      onDragEnd={(e) => {
        const node = e.currentTarget;
        if (dragGlowRef.current) {
          dragGlowRef.current.opacity(0);
          dragGlowRef.current.getLayer()?.batchDraw();
        }
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';
        onDragEnd(e as KonvaEventObject<DragEvent>, player);
      }}
    >
      {/* ── フォーカス (スポットライト効果: 半径はプレイヤーの3~5倍) ── */}
      {player.focus?.enabled && (
        <Group listening={false}>
          <Circle
            radius={radius * (player.focus.radius ?? 3)}
            fill={player.focus.color ?? '#fbbf24'}
            opacity={(player.focus.opacity ?? 0.35) * 0.7}
            shadowColor={player.focus.color ?? '#fbbf24'}
            shadowBlur={22}
            shadowOpacity={0.8}
          />
          <Circle
            radius={radius * (player.focus.radius ?? 3)}
            stroke={player.focus.color ?? '#fbbf24'}
            strokeWidth={1.75}
            dash={[5, 4]}
            opacity={0.85}
          />
          <Circle
            radius={radius + 4}
            fill={player.focus.color ?? '#fbbf24'}
            opacity={0.25}
          />
        </Group>
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
        <VisionConeShape
          cone={player.visionCone}
          radius={radius}
          stageSize={stageSize}
          isSelected={isSelected}
          onUpdateVisionCone={onUpdateVisionCone}
          onSelectOption={() => onSelectOption('vision')}
        />
      )}

      {/* メインの選手サークル */}
      <Circle
        radius={radius}
        fill={player.style.color}
        stroke={
          isSelected ? '#60a5fa' : (player.style.strokeColor ?? '#ffffff')
        }
        strokeWidth={isSelected ? 3 : (player.style.strokeWidth ?? 2)}
        shadowColor={isSelected ? '#3b82f6' : 'rgba(0,0,0,0)'}
        shadowBlur={isSelected ? 8 : 0}
        shadowOffset={{ x: 0, y: isSelected ? 2 : 0 }}
        shadowOpacity={isSelected ? 0.6 : 0}
        perfectDrawEnabled={false}
      />

      {/* 写真表示 (insideContent === 'photo' かつ画像がある場合) */}
      {player.style.insideContent === 'photo' && loadedImage ? (
        <Group
          listening={false}
          clipFunc={(ctx) => {
            ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2, false);
          }}
        >
          <KonvaImage
            image={loadedImage}
            x={-radius * 0.88}
            y={-radius * 0.88}
            width={radius * 1.76}
            height={radius * 1.76}
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>
      ) : (
        /* 写真がない場合または insideContent === 'number' の場合は背番号を表示 */
        player.shirtNo && (
          <Text
            x={-radius}
            y={-radius * 0.55}
            width={radius * 2}
            text={player.shirtNo}
            fontSize={radius * 0.9 * numScale}
            fill="#ffffff"
            align="center"
            fontStyle="bold"
            listening={false}
            perfectDrawEnabled={false}
          />
        )
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
          align="center"
          fontStyle="bold"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {/* バッジ */}
      {player.badges.map((badge) => (
        <BadgeShape
          key={badge.id}
          badge={badge}
          radius={radius}
          onSelectOption={() => onSelectOption('badge')}
        />
      ))}
    </Group>
  );
});

// ── Main PlayerLayer ──────────────────────────────────────────────────

export function PlayerLayer({
  slide,
  stageSize,
  nodesRegistryRef,
}: PlayerLayerProps) {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
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

  const dragContextRef = useRef<{
    movingPlayers: Array<{
      id: string;
      initialPx: { x: number; y: number };
      initialNorm: { x: number; y: number };
    }>;
    movingPlayerIds: string[];
    draggedPlayerId: string;
    startPx: { x: number; y: number };
    prevPlayerPx: { x: number; y: number } | null;
    attachedArrows: Array<{
      arrow: ArrowAnnotation;
      isSourceMoved: boolean;
      isTargetMoved: boolean;
      initialP0: { x: number; y: number };
      initialP1: { x: number; y: number };
      initialCp?: { x: number; y: number };
    }>;
    attachedConnectLines: Array<{
      lineId: string;
      sourcePlayerId: string;
      targetPlayerId: string;
      isSourceMoved: boolean;
      isTargetMoved: boolean;
      initialP1: { x: number; y: number };
      initialP2: { x: number; y: number };
    }>;
    attachedZones: Array<{
      zone: ZoneAnnotation;
      initialPts?: Array<{ x: number; y: number }>;
      initialX?: number;
      initialY?: number;
    }>;
    attachedTexts: Array<{
      text: TextAnnotation;
      initialX: number;
      initialY: number;
    }>;
  } | null>(null);

  const handleDragStart = (
    _e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    const { width, height } = stageSize;
    const startPx = {
      x: normX(draggedPlayer.x, width),
      y: normY(draggedPlayer.y, height),
    };

    const selectedPlayerIds = selectedObjects
      .filter((o) => o.kind === 'player')
      .map((o) => o.id);

    const isDraggedSelected = selectedPlayerIds.includes(draggedPlayer.id);
    const movingPlayerIds = isDraggedSelected
      ? selectedPlayerIds
      : [draggedPlayer.id];

    if (!isDraggedSelected) {
      selectObject({ id: draggedPlayer.id, kind: 'player' });
    }

    const movingSet = new Set(movingPlayerIds);
    const movingPlayers = slide.players
      .filter((p) => movingSet.has(p.id) && p.area === 'pitch')
      .map((p) => ({
        id: p.id,
        initialPx: {
          x: normX(p.x, width),
          y: normY(p.y, height),
        },
        initialNorm: { x: p.x, y: p.y },
      }));

    // 前スライドにおける同一選手のゴースト座標取得 (オニオンスキン)
    const prevPlayer = prevSlide?.players.find(
      (p) => p.id === draggedPlayer.id,
    );
    let prevPlayerPx: { x: number; y: number } | null = null;

    if (prevPlayer && prevPlayer.area !== 'bench') {
      prevPlayerPx = {
        x: normX(prevPlayer.x, width),
        y: normY(prevPlayer.y, height),
      };
      if (ghostGroupRef.current) {
        ghostGroupRef.current.visible(true);
      }
      if (ghostMarkerGroupRef.current) {
        ghostMarkerGroupRef.current.position(prevPlayerPx);
      }
      if (ghostLineRef.current) {
        ghostLineRef.current.points([
          prevPlayerPx.x,
          prevPlayerPx.y,
          startPx.x,
          startPx.y,
        ]);
      }
      if (ghostCircleRef.current) {
        ghostCircleRef.current.fill(prevPlayer.style.color);
      }
      if (ghostTextRef.current) {
        ghostTextRef.current.text(prevPlayer.shirtNo || '');
      }
      if (ghostLabelRef.current) {
        const pName = prevPlayer.name ? getLastName(prevPlayer.name) : '';
        ghostLabelRef.current.text(pName);
      }
      ghostGroupRef.current?.getLayer()?.batchDraw();
    } else {
      if (ghostGroupRef.current) {
        ghostGroupRef.current.visible(false);
        ghostGroupRef.current.getLayer()?.batchDraw();
      }
    }

    // ドラッグ対象選手群に追従する矢印を抽出
    const attachedArrows: Array<{
      arrow: ArrowAnnotation;
      isSourceMoved: boolean;
      isTargetMoved: boolean;
      initialP0: { x: number; y: number };
      initialP1: { x: number; y: number };
      initialCp?: { x: number; y: number };
    }> = [];

    for (const arrow of slide.arrows) {
      const isSourceMoved = arrow.sourcePlayerId
        ? movingSet.has(arrow.sourcePlayerId)
        : false;
      const isTargetMoved = arrow.targetPlayerId
        ? movingSet.has(arrow.targetPlayerId)
        : false;
      if (!isSourceMoved && !isTargetMoved) continue;

      const p0 = arrow.points[0] ?? { x: 20, y: 50 };
      const p1 = arrow.points[1] ?? { x: 40, y: 50 };

      const sPxX = normX(p0.x, width);
      const sPxY = normY(p0.y, height);
      const ePxX = normX(p1.x, width);
      const ePxY = normY(p1.y, height);
      const cpX = arrow.controlPoint
        ? normX(arrow.controlPoint.x, width)
        : undefined;
      const cpY = arrow.controlPoint
        ? normY(arrow.controlPoint.y, height)
        : undefined;

      attachedArrows.push({
        arrow,
        isSourceMoved,
        isTargetMoved,
        initialP0: { x: sPxX, y: sPxY },
        initialP1: { x: ePxX, y: ePxY },
        initialCp:
          cpX !== undefined && cpY !== undefined
            ? { x: cpX, y: cpY }
            : undefined,
      });
    }

    // ドラッグ対象選手群に追従するコネクトラインを抽出
    const attachedConnectLines: Array<{
      lineId: string;
      sourcePlayerId: string;
      targetPlayerId: string;
      isSourceMoved: boolean;
      isTargetMoved: boolean;
      initialP1: { x: number; y: number };
      initialP2: { x: number; y: number };
    }> = [];

    const pitchPlayers = slide.players.filter((p) => p.area === 'pitch');
    const playerMap = new Map(pitchPlayers.map((p) => [p.id, p]));

    for (const p of pitchPlayers) {
      for (const cl of p.connectLines) {
        const targetP = playerMap.get(cl.toPlayerId);
        if (!targetP) continue;

        const isSourceMoved = movingSet.has(p.id);
        const isTargetMoved = movingSet.has(cl.toPlayerId);
        if (!isSourceMoved && !isTargetMoved) continue;

        attachedConnectLines.push({
          lineId: cl.id,
          sourcePlayerId: p.id,
          targetPlayerId: cl.toPlayerId,
          isSourceMoved,
          isTargetMoved,
          initialP1: { x: normX(p.x, width), y: normY(p.y, height) },
          initialP2: {
            x: normX(targetP.x, width),
            y: normY(targetP.y, height),
          },
        });
      }
    }

    const attachedZones = slide.zones
      .filter((z) => {
        const attachedIds =
          (z as unknown as { attachedPlayerIds?: string[] })
            .attachedPlayerIds ?? [];
        if (attachedIds.some((id) => movingSet.has(id))) return true;
        if (z.points.length === 0) return false;
        const cx =
          z.points.reduce((sum, pt) => sum + pt.x, 0) / z.points.length;
        const cy =
          z.points.reduce((sum, pt) => sum + pt.y, 0) / z.points.length;
        return movingPlayers.some(
          (mp) => Math.hypot(cx - mp.initialNorm.x, cy - mp.initialNorm.y) <= 8,
        );
      })
      .map((z) => ({
        zone: z,
        initialPts: z.points?.map((pt) => ({
          x: normX(pt.x, width),
          y: normY(pt.y, height),
        })),
        initialX: z.x !== undefined ? normX(z.x, width) : undefined,
        initialY: z.y !== undefined ? normY(z.y, height) : undefined,
      }));

    const attachedTexts = slide.texts
      .filter((t) => {
        const attachedId = (t as unknown as { attachedPlayerId?: string })
          .attachedPlayerId;
        if (attachedId && movingSet.has(attachedId)) return true;
        return movingPlayers.some(
          (mp) =>
            Math.hypot(t.x - mp.initialNorm.x, t.y - mp.initialNorm.y) <= 8,
        );
      })
      .map((t) => ({
        text: t,
        initialX: normX(t.x, width),
        initialY: normY(t.y, height),
      }));

    dragContextRef.current = {
      movingPlayers,
      movingPlayerIds,
      draggedPlayerId: draggedPlayer.id,
      startPx,
      prevPlayerPx,
      attachedArrows,
      attachedConnectLines,
      attachedZones,
      attachedTexts,
    };
  };

  const handleDragMove = (_e: KonvaEventObject<DragEvent>, _player: Player) => {
    const ctx = dragContextRef.current;
    const registry = nodesRegistryRef?.current;
    if (!ctx) return;

    const node = _e.currentTarget;
    const curX = node.x();
    const curY = node.y();
    const dx = curX - ctx.startPx.x;
    const dy = curY - ctx.startPx.y;

    const { width, height } = stageSize;

    // 1. 同時選択されている他の選手ノードを同一 Delta 分だけ滑らかに移動 (画面端クランプ付き)
    if (registry) {
      for (const p of ctx.movingPlayers) {
        if (p.id === ctx.draggedPlayerId) continue;
        const pNode = registry.playerNodes.get(p.id);
        if (pNode) {
          const nextX = Math.max(0, Math.min(width, p.initialPx.x + dx));
          const nextY = Math.max(0, Math.min(height, p.initialPx.y + dy));
          pNode.position({ x: nextX, y: nextY });
        }
      }
    }

    // 2. オニオンスキン軌跡ガイド線の更新
    if (ctx.prevPlayerPx && ghostLineRef.current) {
      ghostLineRef.current.points([
        ctx.prevPlayerPx.x,
        ctx.prevPlayerPx.y,
        curX,
        curY,
      ]);
    }

    // 3. アタッチされている矢印の追従更新
    if (registry) {
      for (const entry of ctx.attachedArrows) {
        const handles = registry.arrowNodes.get(entry.arrow.id);
        if (!handles?.node) continue;

        let sPxX = entry.initialP0.x;
        let sPxY = entry.initialP0.y;
        let ePxX = entry.initialP1.x;
        let ePxY = entry.initialP1.y;
        let cpX = entry.initialCp?.x;
        let cpY = entry.initialCp?.y;

        if (entry.isSourceMoved && entry.isTargetMoved) {
          sPxX = sPxX + dx;
          sPxY = sPxY + dy;
          ePxX = ePxX + dx;
          ePxY = ePxY + dy;
          if (cpX !== undefined && cpY !== undefined) {
            cpX = cpX + dx;
            cpY = cpY + dy;
          }
          if (handles.startHandleNode)
            handles.startHandleNode.position({ x: sPxX, y: sPxY });
          if (handles.endHandleNode)
            handles.endHandleNode.position({ x: ePxX, y: ePxY });
          if (handles.controlHandleNode) {
            const midX =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
                : (sPxX + ePxX) / 2;
            const midY =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
                : (sPxY + ePxY) / 2;
            handles.controlHandleNode.position({ x: midX, y: midY });
          }
        } else if (entry.isSourceMoved) {
          sPxX = sPxX + dx;
          sPxY = sPxY + dy;
          if (cpX !== undefined && cpY !== undefined) {
            cpX = cpX + dx * 0.5;
            cpY = cpY + dy * 0.5;
          }
          if (handles.startHandleNode)
            handles.startHandleNode.position({ x: sPxX, y: sPxY });
          if (handles.controlHandleNode) {
            const midX =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
                : (sPxX + ePxX) / 2;
            const midY =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
                : (sPxY + ePxY) / 2;
            handles.controlHandleNode.position({ x: midX, y: midY });
          }
        } else if (entry.isTargetMoved) {
          ePxX = ePxX + dx;
          ePxY = ePxY + dy;
          if (cpX !== undefined && cpY !== undefined) {
            cpX = cpX + dx * 0.5;
            cpY = cpY + dy * 0.5;
          }
          if (handles.endHandleNode)
            handles.endHandleNode.position({ x: ePxX, y: ePxY });
          if (handles.controlHandleNode) {
            const midX =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX
                : (sPxX + ePxX) / 2;
            const midY =
              cpX !== undefined && cpY !== undefined
                ? 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY
                : (sPxY + ePxY) / 2;
            handles.controlHandleNode.position({ x: midX, y: midY });
          }
        }

        const isDot =
          entry.arrow.endMarker === 'dot' ||
          entry.arrow.arrowType === 'route_line';
        const isCurved =
          entry.arrow.curveType === 'curved' ||
          entry.arrow.curveType === 'arc' ||
          entry.arrow.controlPoint !== undefined;

        if (isDot) {
          if (!isCurved) {
            const arrowDx = ePxX - sPxX;
            const arrowDy = ePxY - sPxY;
            const len = Math.hypot(arrowDx, arrowDy);
            const dotR = Math.max(5, entry.arrow.strokeWidth * 1.6);
            const shortenLen = Math.max(0, len - dotR);
            const ratio = len > 0 ? shortenLen / len : 0;
            handles.node.points([
              sPxX,
              sPxY,
              sPxX + arrowDx * ratio,
              sPxY + arrowDy * ratio,
            ]);
          } else if (cpX !== undefined && cpY !== undefined) {
            const pts = getQuadraticBezierPoints(
              sPxX,
              sPxY,
              cpX,
              cpY,
              ePxX,
              ePxY,
            );
            handles.node.points(pts);
          }
        } else {
          if (!isCurved) {
            handles.node.points([sPxX, sPxY, ePxX, ePxY]);
          } else if (cpX !== undefined && cpY !== undefined) {
            const pts = getQuadraticBezierPoints(
              sPxX,
              sPxY,
              cpX,
              cpY,
              ePxX,
              ePxY,
            );
            handles.node.points(pts);
          }
        }
      }

      // 4. コネクトライン更新
      for (const entry of ctx.attachedConnectLines) {
        const lineNode = registry.connectLineNodes.get(entry.lineId);
        if (!lineNode) continue;
        let x1 = entry.initialP1.x;
        let y1 = entry.initialP1.y;
        let x2 = entry.initialP2.x;
        let y2 = entry.initialP2.y;

        if (entry.isSourceMoved) {
          x1 = Math.max(0, Math.min(width, entry.initialP1.x + dx));
          y1 = Math.max(0, Math.min(height, entry.initialP1.y + dy));
        }
        if (entry.isTargetMoved) {
          x2 = Math.max(0, Math.min(width, entry.initialP2.x + dx));
          y2 = Math.max(0, Math.min(height, entry.initialP2.y + dy));
        }
        lineNode.points([x1, y1, x2, y2]);
      }

      // 5. ゾーン更新
      for (const entry of ctx.attachedZones) {
        const zNode = registry.zoneNodes.get(entry.zone.id);
        if (!zNode) continue;
        if (entry.initialX !== undefined && entry.initialY !== undefined) {
          zNode.position({
            x: entry.initialX + dx + (zNode.width() ?? 0) / 2,
            y: entry.initialY + dy + (zNode.height() ?? 0) / 2,
          });
        }
      }

      // 6. テキスト更新
      for (const entry of ctx.attachedTexts) {
        const tNode = registry.textNodes.get(entry.text.id);
        if (!tNode) continue;
        tNode.position({
          x: entry.initialX + dx,
          y: entry.initialY + dy,
        });
      }

      // 関連レイヤーの再描画
      registry.annotationLayer?.batchDraw();
    }

    node.getLayer()?.batchDraw();
  };

  const handleDragEnd = (
    _e: KonvaEventObject<DragEvent>,
    draggedPlayer: Player,
  ) => {
    const ctx = dragContextRef.current;
    const { width, height } = stageSize;
    const node = _e.currentTarget;

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
      <Group ref={ghostGroupRef} visible={false} listening={false}>
        <Line
          ref={ghostLineRef}
          points={[0, 0, 0, 0]}
          stroke="#94a3b8"
          strokeWidth={1.5}
          dash={[4, 4]}
          opacity={0.6}
        />
        <Group ref={ghostMarkerGroupRef} opacity={0.4}>
          <Circle
            ref={ghostCircleRef}
            radius={Math.min(stageSize.width, stageSize.height) * 0.032}
            fill="#64748b"
            stroke="#ffffff"
            strokeWidth={1}
          />
          <Text
            ref={ghostTextRef}
            x={-Math.min(stageSize.width, stageSize.height) * 0.032}
            y={-Math.min(stageSize.width, stageSize.height) * 0.032 * 0.55}
            width={Math.min(stageSize.width, stageSize.height) * 0.032 * 2}
            text=""
            fontSize={Math.min(stageSize.width, stageSize.height) * 0.032 * 0.9}
            fill="#ffffff"
            align="center"
            fontStyle="bold"
          />
          <Text
            ref={ghostLabelRef}
            x={-Math.min(stageSize.width, stageSize.height) * 0.032 * 2}
            y={Math.min(stageSize.width, stageSize.height) * 0.032 + 3}
            width={Math.min(stageSize.width, stageSize.height) * 0.032 * 4}
            text=""
            fontSize={
              Math.min(stageSize.width, stageSize.height) * 0.032 * 0.65
            }
            fill="#ffffff"
            stroke="#020617"
            strokeWidth={1.5}
            align="center"
          />
        </Group>
      </Group>

      {/* ConnectLine Layer */}
      <ConnectLineGroup
        slide={slide}
        stageSize={stageSize}
        nodesRegistryRef={nodesRegistryRef}
        onSelectConnectLine={(playerId) => {
          selectObject({ id: playerId, kind: 'player' });
          setActiveMarkerOptionTab('connect');
        }}
      />
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
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          );
        })}
    </>
  );
}
