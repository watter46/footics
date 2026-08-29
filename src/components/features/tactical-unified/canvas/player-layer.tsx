'use client';

/**
 * player-layer.tsx
 * Konva player markers — D&D / Real-time Attached Objects Follow / Interactive VisionCone / ConnectLine / Badge
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useRef } from 'react';
import { Arc, Circle, Group, Line, Rect, Text } from 'react-konva';
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
        y={1}
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

// ── ConnectLinesGroup ──────────────────────────────────────────────────

function ConnectLinesGroup({
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
  return (
    <Group>
      {slide.players
        .filter((p) => p.area === 'pitch')
        .flatMap((player) =>
          player.connectLines
            .filter((l) => l.visible)
            .map((line) => {
              const target = slide.players.find(
                (p) => p.id === line.toPlayerId,
              );
              if (!target || target.area === 'bench') return null;
              const dash =
                line.lineStyle === 'dashed'
                  ? [6, 4]
                  : line.lineStyle === 'dotted'
                    ? [2, 4]
                    : [];
              const fromX = normX(player.x, width);
              const fromY = normY(player.y, height);
              const toX = normX(target.x, width);
              const toY = normY(target.y, height);

              const lineColor = line.color || player.style.color || '#3b82f6';

              return (
                <Line
                  key={line.id}
                  ref={(node) => {
                    if (nodesRegistryRef) {
                      if (node) {
                        nodesRegistryRef.current.connectLineNodes.set(
                          line.id,
                          node,
                        );
                      } else {
                        nodesRegistryRef.current.connectLineNodes.delete(
                          line.id,
                        );
                      }
                    }
                  }}
                  points={[fromX, fromY, toX, toY]}
                  stroke={lineColor}
                  strokeWidth={line.strokeWidth || 3.5}
                  shadowColor={lineColor}
                  shadowBlur={6}
                  shadowOpacity={0.6}
                  dash={dash}
                  hitStrokeWidth={16}
                  listening={true}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine?.(player.id);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    onSelectConnectLine?.(player.id);
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
      {player.style.insideContent === 'number' && player.shirtNo && (
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
      )}
      {player.style.bottomLabel === 'name' && displayName && (
        <Text
          x={-radius * 2}
          y={radius + 3}
          width={radius * 4}
          text={displayName}
          fontSize={radius * 0.65 * labelScale}
          fill="#ffffff"
          stroke="#020617"
          strokeWidth={1.5}
          align="center"
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
          strokeWidth={1.5}
          align="center"
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

  // オニオンスキン (前スライドゴースト表示) 用 Refs
  const ghostGroupRef = useRef<any>(null);
  const ghostLineRef = useRef<any>(null);
  const ghostMarkerGroupRef = useRef<any>(null);
  const ghostCircleRef = useRef<any>(null);
  const ghostTextRef = useRef<any>(null);
  const ghostLabelRef = useRef<any>(null);

  const dragContextRef = useRef<{
    attachedArrows: Array<{
      arrow: ArrowAnnotation;
      isSource: boolean;
      initialP0: { x: number; y: number };
      initialP1: { x: number; y: number };
      initialCp?: { x: number; y: number };
    }>;
    attachedConnectLines: Array<{
      lineId: string;
      sourcePlayerId: string;
      targetPlayerId: string;
      isSource: boolean;
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
    startPx: { x: number; y: number };
    prevPlayerPx: { x: number; y: number } | null;
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

    // 前スライドにおける同一選手のゴースト座標取得
    const prevPlayer = prevSlide?.players.find(
      (p) => p.id === draggedPlayer.id,
    );
    let prevPlayerPx: { x: number; y: number } | null = null;

    if (prevPlayer && prevPlayer.area !== 'bench') {
      prevPlayerPx = {
        x: normX(prevPlayer.x, width),
        y: normY(prevPlayer.y, height),
      };

      const baseDim = Math.min(width, height);
      const sizeScale = prevPlayer.style.sizeScale ?? 1.0;
      const radius = baseDim * 0.032 * sizeScale;
      const labelScale = prevPlayer.style.labelSizeScale ?? 1.0;
      const numScale = prevPlayer.style.numberSizeScale ?? 1.0;
      const displayName = prevPlayer.name ? getLastName(prevPlayer.name) : '';

      if (ghostMarkerGroupRef.current) {
        ghostMarkerGroupRef.current.position({
          x: prevPlayerPx.x,
          y: prevPlayerPx.y,
        });
      }
      if (ghostCircleRef.current) {
        ghostCircleRef.current.radius(radius);
        ghostCircleRef.current.fill(prevPlayer.style.color || '#3b82f6');
        ghostCircleRef.current.stroke(
          prevPlayer.style.strokeColor || '#ffffff',
        );
        ghostCircleRef.current.strokeWidth(prevPlayer.style.strokeWidth ?? 2);
      }
      if (ghostTextRef.current) {
        const showNum =
          prevPlayer.style.insideContent === 'number' && prevPlayer.shirtNo;
        ghostTextRef.current.text(showNum ? prevPlayer.shirtNo : '');
        ghostTextRef.current.fontSize(radius * 0.9 * numScale);
        ghostTextRef.current.x(-radius);
        ghostTextRef.current.y(-radius * 0.55);
        ghostTextRef.current.width(radius * 2);
      }
      if (ghostLabelRef.current) {
        let labelText = '';
        if (prevPlayer.style.bottomLabel === 'name' && displayName) {
          labelText = displayName;
        } else if (
          prevPlayer.style.bottomLabel === 'number' &&
          prevPlayer.shirtNo
        ) {
          labelText = `#${prevPlayer.shirtNo}`;
        }
        ghostLabelRef.current.text(labelText);
        ghostLabelRef.current.fontSize(radius * 0.65 * labelScale);
        ghostLabelRef.current.x(-radius * 2);
        ghostLabelRef.current.y(radius + 3);
        ghostLabelRef.current.width(radius * 4);
      }
      if (ghostLineRef.current) {
        ghostLineRef.current.points([
          prevPlayerPx.x,
          prevPlayerPx.y,
          startPx.x,
          startPx.y,
        ]);
      }
      if (ghostGroupRef.current) {
        ghostGroupRef.current.visible(true);
        ghostGroupRef.current.getLayer()?.batchDraw();
      }
    } else {
      if (ghostGroupRef.current) {
        ghostGroupRef.current.visible(false);
      }
    }

    const attachedArrows = slide.arrows
      .filter(
        (a) =>
          a.sourcePlayerId === draggedPlayer.id ||
          a.targetPlayerId === draggedPlayer.id,
      )
      .map((a) => ({
        arrow: a,
        isSource: a.sourcePlayerId === draggedPlayer.id,
        initialP0: {
          x: normX(a.points[0]?.x ?? 0, width),
          y: normY(a.points[0]?.y ?? 0, height),
        },
        initialP1: {
          x: normX(a.points[1]?.x ?? 0, width),
          y: normY(a.points[1]?.y ?? 0, height),
        },
        initialCp: a.controlPoint
          ? {
              x: normX(a.controlPoint.x, width),
              y: normY(a.controlPoint.y, height),
            }
          : undefined,
      }));

    const attachedConnectLines: Array<{
      lineId: string;
      sourcePlayerId: string;
      targetPlayerId: string;
      isSource: boolean;
    }> = [];

    for (const p of slide.players) {
      if (p.id === draggedPlayer.id) {
        for (const cl of p.connectLines) {
          attachedConnectLines.push({
            lineId: cl.id,
            sourcePlayerId: p.id,
            targetPlayerId: cl.toPlayerId,
            isSource: true,
          });
        }
      } else {
        for (const cl of p.connectLines) {
          if (cl.toPlayerId === draggedPlayer.id) {
            attachedConnectLines.push({
              lineId: cl.id,
              sourcePlayerId: p.id,
              targetPlayerId: cl.toPlayerId,
              isSource: false,
            });
          }
        }
      }
    }

    const attachedZones = slide.zones
      .filter((z) =>
        (
          (z as unknown as { attachedPlayerIds?: string[] })
            .attachedPlayerIds ?? []
        ).includes(draggedPlayer.id),
      )
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
      .filter(
        (t) =>
          (t as unknown as { attachedPlayerId?: string }).attachedPlayerId ===
          draggedPlayer.id,
      )
      .map((t) => ({
        text: t,
        initialX: normX(t.x, width),
        initialY: normY(t.y, height),
      }));

    dragContextRef.current = {
      attachedArrows,
      attachedConnectLines,
      attachedZones,
      attachedTexts,
      startPx,
      prevPlayerPx,
    };
  };

  const handleDragMove = (_e: KonvaEventObject<DragEvent>, _player: Player) => {
    const ctx = dragContextRef.current;
    const registry = nodesRegistryRef?.current;
    if (!ctx || !registry) return;

    const node = _e.currentTarget;
    const curX = node.x();
    const curY = node.y();
    const dx = curX - ctx.startPx.x;
    const dy = curY - ctx.startPx.y;

    // オニオンスキン軌跡ガイド線の更新
    if (ctx.prevPlayerPx && ghostLineRef.current) {
      ghostLineRef.current.points([
        ctx.prevPlayerPx.x,
        ctx.prevPlayerPx.y,
        curX,
        curY,
      ]);
    }

    for (const entry of ctx.attachedArrows) {
      const handles = registry.arrowNodes.get(entry.arrow.id);
      if (!handles?.node) continue;

      let sPxX = entry.initialP0.x;
      let sPxY = entry.initialP0.y;
      let ePxX = entry.initialP1.x;
      let ePxY = entry.initialP1.y;
      let cpX = entry.initialCp?.x;
      let cpY = entry.initialCp?.y;

      if (entry.isSource) {
        sPxX += dx;
        sPxY += dy;
        if (handles.startHandleNode) {
          handles.startHandleNode.position({ x: sPxX, y: sPxY });
        }
      } else {
        ePxX += dx;
        ePxY += dy;
        if (handles.endHandleNode) {
          handles.endHandleNode.position({ x: ePxX, y: ePxY });
        }
      }

      if (cpX !== undefined && cpY !== undefined) {
        cpX += dx / 2;
        cpY += dy / 2;
        if (handles.controlHandleNode) {
          handles.controlHandleNode.position({ x: cpX, y: cpY });
        }
        handles.node.points(
          getQuadraticBezierPoints(sPxX, sPxY, cpX, cpY, ePxX, ePxY),
        );
      } else {
        handles.node.points([sPxX, sPxY, ePxX, ePxY]);
      }
    }

    for (const cl of ctx.attachedConnectLines) {
      const lineNode = registry.connectLineNodes.get(cl.lineId);
      if (!lineNode) continue;
      const pts = [...lineNode.points()];
      if (cl.isSource) {
        pts[0] = curX;
        pts[1] = curY;
      } else {
        pts[2] = curX;
        pts[3] = curY;
      }
      lineNode.points(pts);
    }

    for (const entry of ctx.attachedZones) {
      const zoneNode = registry.zoneNodes.get(entry.zone.id);
      if (!zoneNode) continue;
      zoneNode.position({ x: dx, y: dy });
    }

    for (const entry of ctx.attachedTexts) {
      const textNode = registry.textNodes.get(entry.text.id);
      if (!textNode) continue;
      textNode.position({ x: entry.initialX + dx, y: entry.initialY + dy });
    }

    node.getLayer()?.batchDraw();
    registry.annotationLayer?.batchDraw();
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, player: Player) => {
    const ctx = dragContextRef.current;
    const registry = nodesRegistryRef?.current;

    // オニオンスキングループを非表示化
    if (ghostGroupRef.current) {
      ghostGroupRef.current.visible(false);
      ghostGroupRef.current.getLayer()?.batchDraw();
    }

    if (ctx && registry) {
      for (const entry of ctx.attachedZones) {
        const zoneNode = registry.zoneNodes.get(entry.zone.id);
        if (zoneNode) {
          zoneNode.position({ x: 0, y: 0 });
        }
      }
    }
    dragContextRef.current = null;

    const node = e.currentTarget;
    const { width, height } = stageSize;
    const nx = Math.max(0, Math.min(100, (node.x() / width) * 100));
    const ny = Math.max(0, Math.min(100, (node.y() / height) * 100));

    movePlayer(activeSlideId, player.id, nx, ny);
  };

  return (
    <>
      {/* ── ドラッグ中限定オニオンスキン (前スライドゴースト & 軌跡プレビュー) ── */}
      <Group ref={ghostGroupRef} visible={false} listening={false}>
        {/* 移動ベクトル・軌跡プレビュー線 */}
        <Line
          ref={ghostLineRef}
          points={[]}
          stroke="#38bdf8"
          strokeWidth={2}
          dash={[5, 4]}
          opacity={0.65}
          listening={false}
          perfectDrawEnabled={false}
        />
        {/* 前スライドの半透明ゴーストマーカー */}
        <Group ref={ghostMarkerGroupRef} listening={false}>
          <Circle
            ref={ghostCircleRef}
            radius={15}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={1.5}
            dash={[4, 3]}
            opacity={0.35}
            shadowColor="#000000"
            shadowBlur={4}
            shadowOpacity={0.3}
            listening={false}
            perfectDrawEnabled={false}
          />
          <Text
            ref={ghostTextRef}
            text=""
            fill="#ffffff"
            align="center"
            fontStyle="bold"
            opacity={0.65}
            listening={false}
            perfectDrawEnabled={false}
          />
          <Text
            ref={ghostLabelRef}
            text=""
            fill="#ffffff"
            align="center"
            opacity={0.65}
            shadowColor="rgba(0,0,0,0.8)"
            shadowBlur={3}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      </Group>

      <ConnectLinesGroup
        slide={slide}
        stageSize={stageSize}
        nodesRegistryRef={nodesRegistryRef}
        onSelectConnectLine={(playerId) => {
          selectObject({ id: playerId, kind: 'player' });
          setActiveMarkerOptionTab('connect');
        }}
      />
      {slide.players
        .filter((p) => p.area === 'pitch')
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
