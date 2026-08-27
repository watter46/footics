'use client';

/**
 * player-layer.tsx
 * Konva player markers — D&D / Real-time Attached Objects Follow / VisionCone / ConnectLine / Badge
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
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
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
}: {
  cone: NonNullable<Player['visionCone']>;
  radius: number;
  stageSize: { width: number; height: number };
}) {
  if (!cone.visible) return null;
  const pxRadius = normX(cone.radius, stageSize.width);
  const spreadDeg = (cone.spreadRad * 180) / Math.PI;
  const angleDeg = (cone.angleRad * 180) / Math.PI - spreadDeg / 2;
  const alphaHex = Math.round((cone.opacity ?? 0.3) * 255)
    .toString(16)
    .padStart(2, '0');

  return (
    <Arc
      x={0}
      y={0}
      innerRadius={radius + 2}
      outerRadius={pxRadius}
      angle={spreadDeg}
      rotation={angleDeg}
      fill={cone.color + alphaHex}
      listening={false}
    />
  );
}

// ── Badge ──────────────────────────────────────────────────────────────

function BadgeShape({
  badge,
  radius,
}: {
  badge: Player['badges'][number];
  radius: number;
}) {
  if (!badge.visible) return null;
  const bw = Math.max(badge.label.length * 6 + 8, 24);
  const bh = 14;
  const bx = badge.offsetX - bw / 2;
  const by = -radius - bh - 4 + badge.offsetY;

  return (
    <Group x={bx} y={by} listening={false}>
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
}: {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}) {
  const { width, height } = stageSize;
  return (
    <Group listening={false}>
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
                  stroke={line.color}
                  strokeWidth={line.strokeWidth}
                  dash={dash}
                  listening={false}
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
  onSelect: (
    e: KonvaEventObject<MouseEvent> | KonvaEventObject<TouchEvent>,
  ) => void;
  onDragStart: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragMove: (e: KonvaEventObject<DragEvent>, player: Player) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, player: Player) => void;
}

const PlayerMarker = React.memo(function PlayerMarker({
  player,
  stageSize,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: PlayerMarkerProps) {
  const { width, height } = stageSize;
  const baseDim = Math.min(width, height);
  const sizeScale = player.style.sizeScale ?? 1.0;
  const radius = baseDim * 0.032 * sizeScale;
  const pxX = normX(player.x, width);
  const pxY = normY(player.y, height);
  const displayName = player.name ? getLastName(player.name) : '';
  const labelScale = player.style.labelSizeScale ?? 1.0;
  const numScale = player.style.numberSizeScale ?? 1.0;

  return (
    <Group
      x={pxX}
      y={pxY}
      draggable
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(width, pos.x)),
        y: Math.max(0, Math.min(height, pos.y)),
      })}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={(e) => {
        const node = e.currentTarget;
        // React re-render を起こさず Konva のハードウェアアクセラレーションで直接拡大 & 最前面表示
        node.scale({ x: 1.2, y: 1.2 });
        node.moveToTop();
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
        onDragStart(e as KonvaEventObject<DragEvent>, player);
      }}
      onDragMove={(e) => {
        onDragMove(e as KonvaEventObject<DragEvent>, player);
      }}
      onDragEnd={(e) => {
        const node = e.currentTarget;
        node.scale({ x: 1, y: 1 });
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';
        onDragEnd(e as KonvaEventObject<DragEvent>, player);
      }}
    >
      {player.visionCone && (
        <VisionConeShape
          cone={player.visionCone}
          radius={radius}
          stageSize={stageSize}
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
        shadowColor={isSelected ? '#3b82f6' : 'rgba(0,0,0,0.5)'}
        shadowBlur={isSelected ? 8 : 4}
        shadowOffset={{ x: 0, y: 2 }}
        shadowOpacity={0.4}
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
          align="center"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={3}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {player.style.bottomLabel === 'number' && player.shirtNo && (
        <Text
          x={-radius * 2}
          y={radius + 3}
          width={radius * 4}
          text={player.shirtNo}
          fontSize={radius * 0.65 * labelScale}
          fill="#ffffff"
          align="center"
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={3}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {player.badges.map((badge) => (
        <BadgeShape key={badge.id} badge={badge} radius={radius} />
      ))}
    </Group>
  );
});

export function PlayerLayer({
  slide,
  stageSize,
  nodesRegistryRef,
}: PlayerLayerProps) {
  const movePlayer = useTacticalUnifiedStore((s) => s.movePlayer);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const addConnectLine = useTacticalUnifiedStore((s) => s.addConnectLine);

  // ドラッグ中の追従対象スナップショット管理 (React re-render を起こさない)
  const dragContextRef = useRef<{
    dragStartPos: { x: number; y: number };
    attachedArrows: Array<{
      arrow: ArrowAnnotation;
      mode: 'both' | 'start_only' | 'end_only' | 'whole';
      origP0: { x: number; y: number };
      origP1: { x: number; y: number };
      origCp?: { x: number; y: number };
    }>;
    attachedTexts: Array<{
      text: TextAnnotation;
      origX: number;
      origY: number;
    }>;
    attachedZones: Array<{
      zone: ZoneAnnotation;
    }>;
    attachedBall: {
      origX: number;
      origY: number;
    } | null;
  } | null>(null);

  const handleDragStart = (_e: KonvaEventObject<DragEvent>, player: Player) => {
    const { width, height } = stageSize;
    const pPxX = normX(player.x, width);
    const pPxY = normY(player.y, height);

    // 1. 紐づく矢印の抽出
    const attachedArrows: Array<{
      arrow: ArrowAnnotation;
      mode: 'both' | 'start_only' | 'end_only' | 'whole';
      origP0: { x: number; y: number };
      origP1: { x: number; y: number };
      origCp?: { x: number; y: number };
    }> = [];

    for (const arrow of slide.arrows) {
      const p0 = arrow.points[0] ?? { x: 20, y: 50 };
      const p1 = arrow.points[1] ?? { x: 40, y: 50 };

      // 選手に明示的に紐づく矢印のみ追従（オブジェクトツールのフリー矢印は除外）
      const isStartAttached = arrow.sourcePlayerId === player.id;
      const isEndAttached = arrow.targetPlayerId === player.id;

      if (!isStartAttached && !isEndAttached) continue;

      if (isStartAttached && isEndAttached) {
        attachedArrows.push({
          arrow,
          mode: 'both',
          origP0: { ...p0 },
          origP1: { ...p1 },
          origCp: arrow.controlPoint ? { ...arrow.controlPoint } : undefined,
        });
      } else if (isStartAttached) {
        const otherPlayerNearEnd = slide.players.find(
          (p) =>
            p.id !== player.id &&
            p.area === 'pitch' &&
            arrow.targetPlayerId === p.id,
        );
        attachedArrows.push({
          arrow,
          mode: otherPlayerNearEnd ? 'start_only' : 'whole',
          origP0: { ...p0 },
          origP1: { ...p1 },
          origCp: arrow.controlPoint ? { ...arrow.controlPoint } : undefined,
        });
      } else if (isEndAttached) {
        attachedArrows.push({
          arrow,
          mode: 'end_only',
          origP0: { ...p0 },
          origP1: { ...p1 },
          origCp: arrow.controlPoint ? { ...arrow.controlPoint } : undefined,
        });
      }
    }

    // 2. 紐づくテキスト注釈の抽出
    const attachedTexts = slide.texts
      .filter((text) => Math.hypot(text.x - player.x, text.y - player.y) <= 8)
      .map((text) => ({
        text,
        origX: normX(text.x, width),
        origY: normY(text.y, height),
      }));

    // 3. 紐づくゾーンの抽出 (重心距離 <= 8)
    const attachedZones = slide.zones
      .filter((zone) => {
        if (zone.points.length === 0) return false;
        const cx =
          zone.points.reduce((sum, pt) => sum + pt.x, 0) / zone.points.length;
        const cy =
          zone.points.reduce((sum, pt) => sum + pt.y, 0) / zone.points.length;
        return Math.hypot(cx - player.x, cy - player.y) <= 8;
      })
      .map((zone) => ({ zone }));

    // 4. 紐づくボールの判定
    let attachedBall = null;
    if (
      slide.ball?.visible &&
      Math.hypot(slide.ball.x - player.x, slide.ball.y - player.y) <= 7
    ) {
      attachedBall = {
        origX: normX(slide.ball.x, width),
        origY: normY(slide.ball.y, height),
      };
    }

    dragContextRef.current = {
      dragStartPos: { x: pPxX, y: pPxY },
      attachedArrows,
      attachedTexts,
      attachedZones,
      attachedBall,
    };
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>, player: Player) => {
    const ctx = dragContextRef.current;
    if (!ctx || !nodesRegistryRef?.current) return;

    const node = e.currentTarget;
    const curPxX = node.x();
    const curPxY = node.y();
    const dxPx = curPxX - ctx.dragStartPos.x;
    const dyPx = curPxY - ctx.dragStartPos.y;

    const { width, height } = stageSize;
    const registry = nodesRegistryRef.current;

    // 1. 矢印のリアルタイム追従更新
    for (const entry of ctx.attachedArrows) {
      const { arrow, mode, origP0, origP1, origCp } = entry;
      const arrowEntry = registry.arrowNodes.get(arrow.id);
      if (!arrowEntry?.node) continue;

      const isCurved =
        arrow.curveType === 'curved' ||
        arrow.curveType === 'arc' ||
        origCp !== undefined;

      let sPxX = normX(origP0.x, width);
      let sPxY = normY(origP0.y, height);
      let ePxX = normX(origP1.x, width);
      let ePxY = normY(origP1.y, height);
      let cpPxX = origCp ? normX(origCp.x, width) : (sPxX + ePxX) / 2;
      let cpPxY = origCp ? normY(origCp.y, height) : (sPxY + ePxY) / 2;

      if (mode === 'both' || mode === 'whole') {
        sPxX = curPxX;
        sPxY = curPxY;
        ePxX = normX(origP1.x, width) + dxPx;
        ePxY = normY(origP1.y, height) + dyPx;
        cpPxX = origCp ? normX(origCp.x, width) + dxPx : (sPxX + ePxX) / 2;
        cpPxY = origCp ? normY(origCp.y, height) + dyPx : (sPxY + ePxY) / 2;
      } else if (mode === 'start_only') {
        sPxX = curPxX;
        sPxY = curPxY;
        if (origCp) {
          cpPxX = normX(origCp.x, width) + dxPx / 2;
          cpPxY = normY(origCp.y, height) + dyPx / 2;
        } else {
          cpPxX = (sPxX + ePxX) / 2;
          cpPxY = (sPxY + ePxY) / 2;
        }
      } else if (mode === 'end_only') {
        ePxX = curPxX;
        ePxY = curPxY;
        if (origCp) {
          cpPxX = normX(origCp.x, width) + dxPx / 2;
          cpPxY = normY(origCp.y, height) + dyPx / 2;
        } else {
          cpPxX = (sPxX + ePxX) / 2;
          cpPxY = (sPxY + ePxY) / 2;
        }
      }

      const renderPoints = isCurved
        ? getQuadraticBezierPoints(sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY)
        : [sPxX, sPxY, ePxX, ePxY];

      arrowEntry.node.points(renderPoints);
      if (arrowEntry.startHandleNode) {
        arrowEntry.startHandleNode.position({ x: sPxX, y: sPxY });
      }
      if (arrowEntry.endHandleNode) {
        arrowEntry.endHandleNode.position({ x: ePxX, y: ePxY });
      }
      if (arrowEntry.controlHandleNode) {
        arrowEntry.controlHandleNode.position({ x: cpPxX, y: cpPxY });
      }
    }

    // 2. テキスト注釈のリアルタイム追従更新
    for (const entry of ctx.attachedTexts) {
      const textNode = registry.textNodes.get(entry.text.id);
      if (textNode) {
        textNode.position({
          x: entry.origX + dxPx,
          y: entry.origY + dyPx,
        });
      }
    }

    // 3. ゾーンのリアルタイム追従更新
    for (const entry of ctx.attachedZones) {
      const zoneNode = registry.zoneNodes.get(entry.zone.id);
      if (zoneNode) {
        zoneNode.position({ x: dxPx, y: dyPx });
      }
    }

    // 4. ボールのリアルタイム追従更新
    if (ctx.attachedBall && registry.ballNode) {
      registry.ballNode.position({
        x: ctx.attachedBall.origX + dxPx,
        y: ctx.attachedBall.origY + dyPx,
      });
    }

    // 5. コネクタ線のリアルタイム追従更新
    // 自身が始点となるライン
    for (const line of player.connectLines) {
      const target = slide.players.find((p) => p.id === line.toPlayerId);
      if (target && target.area === 'pitch') {
        const lineNode = registry.connectLineNodes.get(line.id);
        if (lineNode) {
          const targetPxX = normX(target.x, width);
          const targetPxY = normY(target.y, height);
          lineNode.points([curPxX, curPxY, targetPxX, targetPxY]);
        }
      }
    }
    // 自身が終点となるライン
    for (const other of slide.players) {
      if (other.id === player.id || other.area === 'bench') continue;
      for (const line of other.connectLines) {
        if (line.toPlayerId === player.id) {
          const lineNode = registry.connectLineNodes.get(line.id);
          if (lineNode) {
            const fromPxX = normX(other.x, width);
            const fromPxY = normY(other.y, height);
            lineNode.points([fromPxX, fromPxY, curPxX, curPxY]);
          }
        }
      }
    }

    // 各レイヤーのバッチ再描画
    registry.annotationLayer?.batchDraw();
    if (ctx.attachedBall) {
      registry.ballLayer?.batchDraw();
    }
    node.getLayer()?.batchDraw();
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, player: Player) => {
    const ctx = dragContextRef.current;
    const registry = nodesRegistryRef?.current;

    if (ctx && registry) {
      // ゾーンの位置オフセットをリセット（ストア反映で再描画されるため）
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
      <ConnectLinesGroup
        slide={slide}
        stageSize={stageSize}
        nodesRegistryRef={nodesRegistryRef}
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
              onSelect={(e) => {
                e.cancelBubble = true;

                // コネクタ接続モード中
                if (connectingPlayerId) {
                  // 自分自身またはベンチ選手は対象外
                  if (
                    player.id === connectingPlayerId ||
                    player.area === 'bench'
                  ) {
                    return;
                  }

                  // コネクタを作成
                  addConnectLine(activeSlideId, connectingPlayerId, {
                    id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    toPlayerId: player.id,
                    lineStyle: 'solid',
                    color: '#ffffff',
                    strokeWidth: 2,
                    visible: true,
                  });
                  setConnectingPlayerId(null);
                  return;
                }

                // 通常の選択
                const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
                selectObject({ id: player.id, kind: 'player' }, isShift);
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
