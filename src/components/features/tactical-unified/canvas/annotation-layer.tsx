'use client';

/**
 * annotation-layer.tsx
 * Konva arrows / zones / text annotations for the unified canvas
 * ピッチ上でのドラッグ移動・始点/終点ハンドル・カーブ変形ハンドルを完全サポート
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect, useRef } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Text as KonvaText,
  Line,
  Rect,
  Transformer,
} from 'react-konva';
import type {
  ArrowAnnotation,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';

interface AnnotationLayerProps {
  slide: Slide;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
}

const ROTATE_CURSOR = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/><path d='M21 3v5h-5'/></svg>") 12 12, auto`;

function checkCornerRotate(
  pos: { x: number; y: number },
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotation: number,
): boolean {
  if (w <= 0 || h <= 0) return false;
  const rad = (rotation * Math.PI) / 180;
  const hw = w / 2;
  const hh = h / 2;

  const cornersLocal = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: -hw, y: hh },
    { x: hw, y: hh },
  ];

  const corners = cornersLocal.map((pt) => ({
    x: cx + pt.x * Math.cos(rad) - pt.y * Math.sin(rad),
    y: cy + pt.x * Math.sin(rad) + pt.y * Math.cos(rad),
  }));

  for (const corner of corners) {
    const dist = Math.hypot(pos.x - corner.x, pos.y - corner.y);
    if (dist >= 6 && dist <= 28) {
      return true;
    }
  }
  return false;
}

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}
function pxToNormX(px: number, w: number) {
  return Math.max(0, Math.min(100, (px / w) * 100));
}
function pxToNormY(py: number, h: number) {
  return Math.max(0, Math.min(100, (py / h) * 100));
}

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

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

// ── Arrow Object (ドラッグ＆リアルタイムハンドル追従操作: ゼロ再レンダリング最適化) ───────────

const ArrowObject = React.memo(function ArrowObject({
  arrow,
  slide,
  slideId,
  stageSize,
  isSelected,
  onSelect,
  updateArrow,
  nodesRegistryRef,
}: {
  arrow: ArrowAnnotation;
  slide: Slide;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}) {
  const { width, height } = stageSize;
  const rawP0 = arrow.points[0] ?? { x: 20, y: 50 };
  const rawP1 = arrow.points[1] ?? { x: 40, y: 50 };

  const sourcePlayer = arrow.sourcePlayerId
    ? slide.players.find(
        (p) => p.id === arrow.sourcePlayerId && p.area === 'pitch',
      )
    : undefined;

  const targetPlayer = arrow.targetPlayerId
    ? slide.players.find(
        (p) => p.id === arrow.targetPlayerId && p.area === 'pitch',
      )
    : undefined;

  const isAttachedToPlayer = !!sourcePlayer;

  const p0 = sourcePlayer ? { x: sourcePlayer.x, y: sourcePlayer.y } : rawP0;
  const p1 = targetPlayer ? { x: targetPlayer.x, y: targetPlayer.y } : rawP1;

  const sPxX = normX(p0.x, width);
  const sPxY = normY(p0.y, height);
  const ePxX = normX(p1.x, width);
  const ePxY = normY(p1.y, height);

  const isCurved =
    arrow.curveType === 'curved' ||
    arrow.curveType === 'arc' ||
    arrow.controlPoint !== undefined;

  const cpPxX = arrow.controlPoint
    ? normX(arrow.controlPoint.x, width)
    : (sPxX + ePxX) / 2;
  const cpPxY = arrow.controlPoint
    ? normY(arrow.controlPoint.y, height)
    : (sPxY + ePxY) / 2;

  const renderPoints = isCurved
    ? getQuadraticBezierPoints(sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY)
    : [sPxX, sPxY, ePxX, ePxY];

  const arrowRef = React.useRef<any>(null);
  const startHandleRef = React.useRef<any>(null);
  const endHandleRef = React.useRef<any>(null);
  const controlHandleRef = React.useRef<any>(null);

  useEffect(() => {
    if (!nodesRegistryRef) return;
    nodesRegistryRef.current.arrowNodes.set(arrow.id, {
      node: arrowRef.current,
      startHandleNode: startHandleRef.current,
      endHandleNode: endHandleRef.current,
      controlHandleNode: controlHandleRef.current,
    });
    return () => {
      nodesRegistryRef.current.arrowNodes.delete(arrow.id);
    };
  }, [arrow.id, nodesRegistryRef]);

  const updateKonvaPoints = (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    cpx?: number,
    cpy?: number,
  ) => {
    if (!arrowRef.current) return;
    const curCpX =
      cpx ??
      (controlHandleRef.current ? controlHandleRef.current.x() : (sx + ex) / 2);
    const curCpY =
      cpy ??
      (controlHandleRef.current ? controlHandleRef.current.y() : (sy + ey) / 2);

    const isCurrentlyCurved =
      isCurved ||
      cpx !== undefined ||
      cpy !== undefined ||
      (controlHandleRef.current &&
        Math.hypot(
          controlHandleRef.current.x() - (sx + ex) / 2,
          controlHandleRef.current.y() - (sy + ey) / 2,
        ) > 2);

    if (isCurrentlyCurved) {
      arrowRef.current.points(
        getQuadraticBezierPoints(sx, sy, curCpX, curCpY, ex, ey),
      );
    } else {
      arrowRef.current.points([sx, sy, ex, ey]);
    }
    arrowRef.current.getLayer()?.batchDraw();
  };

  return (
    <Group>
      <Arrow
        ref={arrowRef}
        points={renderPoints}
        stroke={isSelected ? '#60a5fa' : arrow.color}
        fill={isSelected ? '#60a5fa' : arrow.color}
        strokeWidth={arrow.strokeWidth}
        dash={arrow.dashArray}
        pointerLength={arrow.arrowHead ? 15 : 0}
        pointerWidth={arrow.arrowHead ? 15 : 0}
        tension={0}
        onClick={onSelect}
        onTap={onSelect}
        hitStrokeWidth={16}
        perfectDrawEnabled={false}
        draggable={isSelected && !isAttachedToPlayer}
        onDragStart={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grabbing';
        }}
        onDragMove={(e) => {
          const node = e.target;
          const dx = node.x();
          const dy = node.y();
          if (startHandleRef.current) {
            startHandleRef.current.position({ x: sPxX + dx, y: sPxY + dy });
          }
          if (endHandleRef.current) {
            endHandleRef.current.position({ x: ePxX + dx, y: ePxY + dy });
          }
          if (controlHandleRef.current) {
            controlHandleRef.current.position({ x: cpPxX + dx, y: cpPxY + dy });
          }
          node.getLayer()?.batchDraw();
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          const dxNorm = (node.x() / width) * 100;
          const dyNorm = (node.y() / height) * 100;
          node.position({ x: 0, y: 0 });
          const stage = node.getStage();
          if (stage) stage.container().style.cursor = 'default';

          const newP0 = {
            x: Math.max(0, Math.min(100, p0.x + dxNorm)),
            y: Math.max(0, Math.min(100, p0.y + dyNorm)),
          };
          const newP1 = {
            x: Math.max(0, Math.min(100, p1.x + dxNorm)),
            y: Math.max(0, Math.min(100, p1.y + dyNorm)),
          };

          const patch: Partial<ArrowAnnotation> = {
            points: [newP0, newP1],
          };
          if (arrow.controlPoint) {
            patch.controlPoint = {
              x: Math.max(0, Math.min(100, arrow.controlPoint.x + dxNorm)),
              y: Math.max(0, Math.min(100, arrow.controlPoint.y + dyNorm)),
            };
          }
          updateArrow(slideId, arrow.id, patch);
        }}
      />

      {isSelected && (
        <Group>
          {!isAttachedToPlayer && (
            <Circle
              ref={startHandleRef}
              x={sPxX}
              y={sPxY}
              radius={7}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={2.5}
              shadowColor="rgba(0,0,0,0.5)"
              shadowBlur={4}
              perfectDrawEnabled={false}
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'grab';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'grabbing';
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const pos = e.target.position();
                const curEx = endHandleRef.current
                  ? endHandleRef.current.x()
                  : ePxX;
                const curEy = endHandleRef.current
                  ? endHandleRef.current.y()
                  : ePxY;
                if (!arrow.controlPoint && controlHandleRef.current) {
                  controlHandleRef.current.position({
                    x: (pos.x + curEx) / 2,
                    y: (pos.y + curEy) / 2,
                  });
                }
                updateKonvaPoints(pos.x, pos.y, curEx, curEy);
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                const pos = e.target.position();
                const newNormX = pxToNormX(pos.x, width);
                const newNormY = pxToNormY(pos.y, height);
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';

                updateArrow(slideId, arrow.id, {
                  points: [{ x: newNormX, y: newNormY }, p1],
                });
              }}
            />
          )}

          <Circle
            ref={endHandleRef}
            x={ePxX}
            y={ePxY}
            radius={7}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={2.5}
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={4}
            perfectDrawEnabled={false}
            draggable
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grabbing';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              const curSx =
                !isAttachedToPlayer && startHandleRef.current
                  ? startHandleRef.current.x()
                  : sPxX;
              const curSy =
                !isAttachedToPlayer && startHandleRef.current
                  ? startHandleRef.current.y()
                  : sPxY;
              if (!arrow.controlPoint && controlHandleRef.current) {
                controlHandleRef.current.position({
                  x: (curSx + pos.x) / 2,
                  y: (curSy + pos.y) / 2,
                });
              }
              updateKonvaPoints(curSx, curSy, pos.x, pos.y);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              const newNormX = pxToNormX(pos.x, width);
              const newNormY = pxToNormY(pos.y, height);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';

              updateArrow(slideId, arrow.id, {
                sourcePlayerId: arrow.sourcePlayerId,
                points: [p0, { x: newNormX, y: newNormY }],
              });
            }}
          />

          <Circle
            ref={controlHandleRef}
            x={cpPxX}
            y={cpPxY}
            radius={6.5}
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={4}
            perfectDrawEnabled={false}
            draggable
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'grabbing';
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              const curSx =
                !isAttachedToPlayer && startHandleRef.current
                  ? startHandleRef.current.x()
                  : sPxX;
              const curSy =
                !isAttachedToPlayer && startHandleRef.current
                  ? startHandleRef.current.y()
                  : sPxY;
              const curEx = endHandleRef.current
                ? endHandleRef.current.x()
                : ePxX;
              const curEy = endHandleRef.current
                ? endHandleRef.current.y()
                : ePxY;
              updateKonvaPoints(curSx, curSy, curEx, curEy, pos.x, pos.y);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const pos = e.target.position();
              const newNormX = pxToNormX(pos.x, width);
              const newNormY = pxToNormY(pos.y, height);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';

              const midNormX = (p0.x + p1.x) / 2;
              const midNormY = (p0.y + p1.y) / 2;
              const distFromMid = Math.hypot(
                newNormX - midNormX,
                newNormY - midNormY,
              );

              if (distFromMid < 1.0) {
                updateArrow(slideId, arrow.id, {
                  sourcePlayerId: arrow.sourcePlayerId,
                  curveType: 'straight',
                  controlPoint: undefined,
                  points: [p0, p1],
                });
              } else {
                updateArrow(slideId, arrow.id, {
                  sourcePlayerId: arrow.sourcePlayerId,
                  curveType: 'curved',
                  controlPoint: { x: newNormX, y: newNormY },
                  points: [p0, p1],
                });
              }
            }}
          />
        </Group>
      )}
    </Group>
  );
});

// ── Zone Object (Rect / Ellipse / Polygon 完全サポート) ─────────────────────

const ZoneObject = React.memo(function ZoneObject({
  zone,
  slideId,
  stageSize,
  isSelected,
  onSelect,
  updateZone,
  nodesRegistryRef,
  isCreatingThis,
  mousePreviewPos,
}: {
  zone: ZoneAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
}) {
  const { width, height } = stageSize;
  const shapeType = zone.shapeType || 'rect';

  const opacity = zone.opacity ?? 0.25;
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  const fillRGBA = (zone.color || '#22c55e') + alphaHex;
  const strokeColor = isSelected ? '#3b82f6' : (zone.strokeColor ?? zone.color);
  const strokeWidth = isSelected
    ? Math.max(2, zone.strokeWidth || 2)
    : (zone.strokeWidth || 2);

  const shapeNodeRef = useRef<Konva.Node | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  // 回転ドラッグ状態
  const isRotatingRef = useRef(false);
  const rotateCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startMouseAngleRef = useRef(0);
  const startShapeRotationRef = useRef(0);

  useEffect(() => {
    if (!transformerRef.current) return;
    if (isSelected && shapeNodeRef.current && shapeType !== 'polygon') {
      transformerRef.current.nodes([shapeNodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, shapeType]);

  // 1. 多角形（Polygon Zone）
  if (shapeType === 'polygon') {
    const pts = zone.points;
    const isComplete = zone.isComplete !== false;

    let renderPts = pts.flatMap((p) => [normX(p.x, width), normY(p.y, height)]);
    if (isCreatingThis && mousePreviewPos) {
      renderPts = [...renderPts, mousePreviewPos.x, mousePreviewPos.y];
    }

    const vertexPairs = pts.map((p) => ({
      normX: p.x,
      normY: p.y,
      pxX: normX(p.x, width),
      pxY: normY(p.y, height),
    }));

    return (
      <Group
        draggable={isSelected}
        onDragStart={(e) => {
          if (e.target.name() === 'control-handle') {
            e.cancelBubble = true;
          }
        }}
        onDragEnd={(e) => {
          if (e.target.name() === 'control-handle') return;
          e.cancelBubble = true;
          const dxPx = e.target.x();
          const dyPx = e.target.y();
          e.target.position({ x: 0, y: 0 });

          const dxNorm = (dxPx / width) * 100;
          const dyNorm = (dyPx / height) * 100;

          const newPts = pts.map((p) => ({
            x: Math.max(0, Math.min(100, p.x + dxNorm)),
            y: Math.max(0, Math.min(100, p.y + dyNorm)),
          }));

          updateZone(slideId, zone.id, { points: newPts });
        }}
      >
        <Line
          ref={(node) => {
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          points={renderPts}
          closed={isComplete}
          fill={isComplete ? fillRGBA : undefined}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={20}
          onClick={onSelect}
          onTap={onSelect}
        />

        {/* 描画中の頂点ドット */}
        {!isComplete &&
          vertexPairs.map((v, idx) => (
            <Circle
              key={`v-draw-${zone.id}-${idx}`}
              x={v.pxX}
              y={v.pxY}
              radius={idx === 0 ? 7 : 4}
              fill={idx === 0 ? '#38bdf8' : '#ffffff'}
              stroke={zone.color}
              strokeWidth={2}
              listening={false}
            />
          ))}

        {/* 選択中の頂点ドラッグ変形ハンドル */}
        {isComplete &&
          isSelected &&
          vertexPairs.map((v, idx) => (
            <Circle
              key={`v-handle-${zone.id}-${idx}`}
              name="control-handle"
              x={v.pxX}
              y={v.pxY}
              radius={7}
              hitStrokeWidth={20}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={2.5}
              draggable
              onMouseEnter={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grab';
              }}
              onMouseLeave={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'default';
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grabbing';
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const newPxX = e.target.x();
                const newPxY = e.target.y();
                const lineNode = e.target
                  .getParent()
                  ?.findOne('Line') as Konva.Line | undefined;
                if (lineNode) {
                  const currentLinePts = [...lineNode.points()];
                  currentLinePts[idx * 2] = newPxX;
                  currentLinePts[idx * 2 + 1] = newPxY;
                  lineNode.points(currentLinePts);
                  lineNode.getLayer()?.batchDraw();
                }
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                const newPxX = e.target.x();
                const newPxY = e.target.y();
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grab';

                const newNormX = pxToNormX(newPxX, width);
                const newNormY = pxToNormY(newPxY, height);

                const updatedPoints = [...pts];
                updatedPoints[idx] = { x: newNormX, y: newNormY };

                updateZone(slideId, zone.id, { points: updatedPoints });
              }}
            />
          ))}
      </Group>
    );
  }

  // 2. 四角形（Rect） & 楕円（Ellipse）
  // 座標・サイズ（正規化からピクセルへ変換）
  let normPosX = zone.x ?? (zone.points[0]?.x ?? 20);
  let normPosY = zone.y ?? (zone.points[0]?.y ?? 20);
  let normW =
    zone.width ??
    (zone.points.length >= 2 ? Math.abs(zone.points[1].x - zone.points[0].x) : 30);
  let normH =
    zone.height ??
    (zone.points.length >= 4 ? Math.abs(zone.points[2].y - zone.points[0].y) : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = normX(normW, width);
  const pxH = normY(normH, height);
  const cx = normX(normPosX, width) + pxW / 2;
  const cy = normY(normPosY, height) + pxH / 2;
  const rotation = zone.rotation || 0;

  const handlePointerDownForRotate = (e: KonvaEventObject<MouseEvent>) => {
    if (!isSelected) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const isOverRotate = checkCornerRotate(pos, cx, cy, pxW, pxH, rotation);
    if (isOverRotate) {
      isRotatingRef.current = true;
      rotateCenterRef.current = { x: cx, y: cy };
      startMouseAngleRef.current = Math.atan2(pos.y - cy, pos.x - cx);
      startShapeRotationRef.current = rotation;
    }
  };

  const handlePointerMoveForRotate = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (isRotatingRef.current && shapeNodeRef.current) {
      const currentAngle = Math.atan2(
        pos.y - rotateCenterRef.current.y,
        pos.x - rotateCenterRef.current.x,
      );
      const angleDiffDeg =
        ((currentAngle - startMouseAngleRef.current) * 180) / Math.PI;
      const newRot = (startShapeRotationRef.current + angleDiffDeg) % 360;

      shapeNodeRef.current.rotation(newRot);
      shapeNodeRef.current.getLayer()?.batchDraw();
      return;
    }

    if (isSelected) {
      const isOver = checkCornerRotate(pos, cx, cy, pxW, pxH, rotation);
      const c = stage?.container();
      if (c) {
        if (isOver) c.style.cursor = ROTATE_CURSOR;
        else if (c.style.cursor.includes('data:image/svg+xml')) {
          c.style.cursor = 'default';
        }
      }
    }
  };

  const handlePointerUpForRotate = () => {
    if (isRotatingRef.current && shapeNodeRef.current) {
      isRotatingRef.current = false;
      const newRot = shapeNodeRef.current.rotation();
      updateZone(slideId, zone.id, { rotation: newRot });
    }
  };

  return (
    <Group
      onMouseDown={handlePointerDownForRotate}
      onMouseMove={handlePointerMoveForRotate}
      onMouseUp={handlePointerUpForRotate}
    >
      {shapeType === 'ellipse' ? (
        <Ellipse
          ref={(node) => {
            shapeNodeRef.current = node;
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          x={cx}
          y={cy}
          radiusX={pxW / 2}
          radiusY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            const newNormX = pxToNormX(node.x() - pxW / 2, width);
            const newNormY = pxToNormY(node.y() - pxH / 2, height);
            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              rotation: node.rotation(),
            });
          }}
        />
      ) : (
        <Rect
          ref={(node) => {
            shapeNodeRef.current = node;
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          x={cx}
          y={cy}
          width={pxW}
          height={pxH}
          offsetX={pxW / 2}
          offsetY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            const newNormX = pxToNormX(node.x() - pxW / 2, width);
            const newNormY = pxToNormY(node.y() - pxH / 2, height);
            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              rotation: node.rotation(),
            });
          }}
        />
      )}

      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-right',
            'middle-left',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
          rotateEnabled={false}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={8}
          onTransformEnd={() => {
            const node = shapeNodeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const rot = node.rotation();
            node.scaleX(1);
            node.scaleY(1);

            const newPxW = pxW * scaleX;
            const newPxH = pxH * scaleY;
            const newPxX = node.x() - newPxW / 2;
            const newPxY = node.y() - newPxH / 2;

            const newNormX = pxToNormX(newPxX, width);
            const newNormY = pxToNormY(newPxY, height);
            const newNormW = (newPxW / width) * 100;
            const newNormH = (newPxH / height) * 100;

            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              width: newNormW,
              height: newNormH,
              rotation: rot,
              points: [
                { x: newNormX, y: newNormY },
                { x: newNormX + newNormW, y: newNormY },
                { x: newNormX + newNormW, y: newNormY + newNormH },
                { x: newNormX, y: newNormY + newNormH },
              ],
            });
          }}
        />
      )}
    </Group>
  );
});

// ── Text Object ───────────────────────────────────────────────────────

const TextObject = React.memo(function TextObject({
  text,
  slideId,
  stageSize,
  isSelected,
  onSelect,
  updateText,
  nodesRegistryRef,
}: {
  text: TextAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateText: (
    slideId: string,
    textId: string,
    patch: Partial<TextAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}) {
  const { width, height } = stageSize;
  const fontStyle =
    [text.bold ? 'bold' : '', text.italic ? 'italic' : '']
      .filter(Boolean)
      .join(' ') || 'normal';

  return (
    <KonvaText
      ref={(node) => {
        if (nodesRegistryRef) {
          if (node) {
            nodesRegistryRef.current.textNodes.set(text.id, node);
          } else {
            nodesRegistryRef.current.textNodes.delete(text.id);
          }
        }
      }}
      x={normX(text.x, width)}
      y={normY(text.y, height)}
      text={text.content}
      fontSize={text.fontSize}
      fill={isSelected ? '#60a5fa' : text.color}
      fontStyle={fontStyle}
      shadowColor="rgba(0,0,0,0.6)"
      shadowBlur={4}
      onClick={onSelect}
      onTap={onSelect}
      perfectDrawEnabled={false}
      draggable={isSelected}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const newX = pxToNormX(node.x(), width);
        const newY = pxToNormY(node.y(), height);
        updateText(slideId, text.id, { x: newX, y: newY });
      }}
    />
  );
});

// ── Layer ─────────────────────────────────────────────────────────────

export function AnnotationLayer({
  slide,
  stageSize,
  nodesRegistryRef,
  activePolygonId,
  mousePreviewPos,
}: AnnotationLayerProps) {
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  function makeSelectHandler(id: string, kind: 'arrow' | 'zone' | 'text') {
    return (e: KonvaClickEvent) => {
      e.cancelBubble = true;
      const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
      selectObject({ id, kind }, isShift);
    };
  }

  return (
    <Group>
      {slide.zones.map((zone) => (
        <ZoneObject
          key={zone.id}
          zone={zone}
          slideId={activeSlideId}
          stageSize={stageSize}
          isSelected={selectedObjects.some((o) => o.id === zone.id)}
          onSelect={makeSelectHandler(zone.id, 'zone')}
          updateZone={updateZone}
          nodesRegistryRef={nodesRegistryRef}
          isCreatingThis={zone.id === activePolygonId}
          mousePreviewPos={mousePreviewPos}
        />
      ))}
      {slide.arrows.map((arrow) => (
        <ArrowObject
          key={arrow.id}
          arrow={arrow}
          slide={slide}
          slideId={activeSlideId}
          stageSize={stageSize}
          isSelected={selectedObjects.some((o) => o.id === arrow.id)}
          onSelect={makeSelectHandler(arrow.id, 'arrow')}
          updateArrow={updateArrow}
          nodesRegistryRef={nodesRegistryRef}
        />
      ))}
      {slide.texts.map((text) => (
        <TextObject
          key={text.id}
          text={text}
          slideId={activeSlideId}
          stageSize={stageSize}
          isSelected={selectedObjects.some((o) => o.id === text.id)}
          onSelect={makeSelectHandler(text.id, 'text')}
          updateText={updateText}
          nodesRegistryRef={nodesRegistryRef}
        />
      ))}
    </Group>
  );
}

