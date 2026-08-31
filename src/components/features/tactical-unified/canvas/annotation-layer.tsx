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
function cpPxToNormX(px: number, w: number) {
  return (px / w) * 100;
}
function cpPxToNormY(py: number, h: number) {
  return (py / h) * 100;
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

  // 2次ベジェ曲線の頂点 M (t=0.5: M = 0.25*P0 + 0.5*P_control + 0.25*P1)
  const midHandlePxX = arrow.controlPoint
    ? 0.25 * sPxX + 0.5 * cpPxX + 0.25 * ePxX
    : (sPxX + ePxX) / 2;
  const midHandlePxY = arrow.controlPoint
    ? 0.25 * sPxY + 0.5 * cpPxY + 0.25 * ePxY
    : (sPxY + ePxY) / 2;

  const isDotEnd =
    arrow.endMarker === 'dot' || arrow.arrowType === 'route_line';

  const dotRadius = Math.max(5, arrow.strokeWidth * 1.6);

  let renderSx = sPxX;
  let renderSy = sPxY;
  let renderEx = ePxX;
  let renderEy = ePxY;

  if (isDotEnd) {
    if (!isCurved) {
      const dx = ePxX - sPxX;
      const dy = ePxY - sPxY;
      const dist = Math.hypot(dx, dy);
      if (dist > dotRadius * 2) {
        const ux = dx / dist;
        const uy = dy / dist;
        renderSx = sPxX + ux * dotRadius;
        renderSy = sPxY + uy * dotRadius;
        renderEx = ePxX - ux * dotRadius;
        renderEy = ePxY - uy * dotRadius;
      }
    } else {
      const v0x = cpPxX - sPxX;
      const v0y = cpPxY - sPxY;
      const d0 = Math.hypot(v0x, v0y) || 1;
      renderSx = sPxX + (v0x / d0) * dotRadius;
      renderSy = sPxY + (v0y / d0) * dotRadius;

      const v1x = ePxX - cpPxX;
      const v1y = ePxY - cpPxY;
      const d1 = Math.hypot(v1x, v1y) || 1;
      renderEx = ePxX - (v1x / d1) * dotRadius;
      renderEy = ePxY - (v1y / d1) * dotRadius;
    }
  }

  const renderPoints = isCurved
    ? getQuadraticBezierPoints(
        renderSx,
        renderSy,
        cpPxX,
        cpPxY,
        renderEx,
        renderEy,
      )
    : [renderSx, renderSy, renderEx, renderEy];

  const arrowRef = React.useRef<any>(null);
  const startHandleRef = React.useRef<any>(null);
  const endHandleRef = React.useRef<any>(null);
  const controlHandleRef = React.useRef<any>(null);
  const startDotRef = React.useRef<any>(null);
  const endDotRef = React.useRef<any>(null);

  useEffect(() => {
    if (controlHandleRef.current) {
      controlHandleRef.current.position({
        x: midHandlePxX,
        y: midHandlePxY,
      });
    }
    if (startHandleRef.current) {
      startHandleRef.current.position({ x: sPxX, y: sPxY });
    }
    if (endHandleRef.current) {
      endHandleRef.current.position({ x: ePxX, y: ePxY });
    }
  }, [midHandlePxX, midHandlePxY, sPxX, sPxY, ePxX, ePxY]);

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
      (controlHandleRef.current
        ? 2 * controlHandleRef.current.x() - 0.5 * (sx + ex)
        : (sx + ex) / 2);
    const curCpY =
      cpy ??
      (controlHandleRef.current
        ? 2 * controlHandleRef.current.y() - 0.5 * (sy + ey)
        : (sy + ey) / 2);

    const isCurrentlyCurved =
      isCurved ||
      cpx !== undefined ||
      cpy !== undefined ||
      (controlHandleRef.current &&
        Math.hypot(
          controlHandleRef.current.x() - (sx + ex) / 2,
          controlHandleRef.current.y() - (sy + ey) / 2,
        ) > 2);

    let rsx = sx;
    let rsy = sy;
    let rex = ex;
    let rey = ey;
    if (isDotEnd) {
      if (!isCurrentlyCurved) {
        const dx = ex - sx;
        const dy = ey - sy;
        const dist = Math.hypot(dx, dy);
        if (dist > dotRadius * 2) {
          const ux = dx / dist;
          const uy = dy / dist;
          rsx = sx + ux * dotRadius;
          rsy = sy + uy * dotRadius;
          rex = ex - ux * dotRadius;
          rey = ey - uy * dotRadius;
        }
      } else {
        const v0x = curCpX - sx;
        const v0y = curCpY - sy;
        const d0 = Math.hypot(v0x, v0y) || 1;
        rsx = sx + (v0x / d0) * dotRadius;
        rsy = sy + (v0y / d0) * dotRadius;

        const v1x = ex - curCpX;
        const v1y = ey - curCpY;
        const d1 = Math.hypot(v1x, v1y) || 1;
        rex = ex - (v1x / d1) * dotRadius;
        rey = ey - (v1y / d1) * dotRadius;
      }
    }

    if (isCurrentlyCurved) {
      arrowRef.current.points(
        getQuadraticBezierPoints(rsx, rsy, curCpX, curCpY, rex, rey),
      );
    } else {
      arrowRef.current.points([rsx, rsy, rex, rey]);
    }
    if (startDotRef.current) {
      startDotRef.current.position({ x: sx, y: sy });
    }
    if (endDotRef.current) {
      endDotRef.current.position({ x: ex, y: ey });
    }
    arrowRef.current.getLayer()?.batchDraw();
  };

  const hasArrowHead =
    arrow.arrowHead &&
    arrow.endMarker !== 'none' &&
    arrow.arrowType !== 'line' &&
    !isDotEnd;

  return (
    <Group>
      <Arrow
        ref={arrowRef}
        points={renderPoints}
        stroke={arrow.color}
        fill={arrow.color}
        strokeWidth={arrow.strokeWidth}
        dash={arrow.dashArray}
        pointerLength={hasArrowHead ? 15 : 0}
        pointerWidth={hasArrowHead ? 15 : 0}
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
            controlHandleRef.current.position({
              x: midHandlePxX + dx,
              y: midHandlePxY + dy,
            });
          }
          if (startDotRef.current) {
            startDotRef.current.position({ x: sPxX + dx, y: sPxY + dy });
          }
          if (endDotRef.current) {
            endDotRef.current.position({ x: ePxX + dx, y: ePxY + dy });
          }
          node.getLayer()?.batchDraw();
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          const node = e.target;
          const dxNorm = (node.x() / width) * 100;
          const dyNorm = (node.y() / height) * 100;
          node.position({ x: 0, y: 0 });
          if (startDotRef.current) {
            startDotRef.current.position({ x: sPxX, y: sPxY });
          }
          if (endDotRef.current) {
            endDotRef.current.position({ x: ePxX, y: ePxY });
          }
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
              x: arrow.controlPoint.x + dxNorm,
              y: arrow.controlPoint.y + dyNorm,
            };
          }
          updateArrow(slideId, arrow.id, patch);
        }}
      />

      {isDotEnd && (
        <>
          <Circle
            ref={startDotRef}
            x={sPxX}
            y={sPxY}
            radius={Math.max(5, arrow.strokeWidth * 1.6)}
            stroke={arrow.color}
            strokeWidth={Math.max(2, arrow.strokeWidth)}
            fill="transparent"
            perfectDrawEnabled={false}
            listening={false}
          />
          <Circle
            ref={endDotRef}
            x={ePxX}
            y={ePxY}
            radius={Math.max(5, arrow.strokeWidth * 1.6)}
            stroke={arrow.color}
            strokeWidth={Math.max(2, arrow.strokeWidth)}
            fill="transparent"
            perfectDrawEnabled={false}
            listening={false}
          />
        </>
      )}

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
                if (controlHandleRef.current) {
                  if (!arrow.controlPoint) {
                    controlHandleRef.current.position({
                      x: (pos.x + curEx) / 2,
                      y: (pos.y + curEy) / 2,
                    });
                  } else {
                    controlHandleRef.current.position({
                      x: 0.25 * pos.x + 0.5 * cpPxX + 0.25 * curEx,
                      y: 0.25 * pos.y + 0.5 * cpPxY + 0.25 * curEy,
                    });
                  }
                }
                updateKonvaPoints(
                  pos.x,
                  pos.y,
                  curEx,
                  curEy,
                  arrow.controlPoint ? cpPxX : undefined,
                  arrow.controlPoint ? cpPxY : undefined,
                );
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
              if (controlHandleRef.current) {
                if (!arrow.controlPoint) {
                  controlHandleRef.current.position({
                    x: (curSx + pos.x) / 2,
                    y: (curSy + pos.y) / 2,
                  });
                } else {
                  controlHandleRef.current.position({
                    x: 0.25 * curSx + 0.5 * cpPxX + 0.25 * pos.x,
                    y: 0.25 * curSy + 0.5 * cpPxY + 0.25 * pos.y,
                  });
                }
              }
              updateKonvaPoints(
                curSx,
                curSy,
                pos.x,
                pos.y,
                arrow.controlPoint ? cpPxX : undefined,
                arrow.controlPoint ? cpPxY : undefined,
              );
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
            x={midHandlePxX}
            y={midHandlePxY}
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

              // 2次ベジェ曲線頂点 M = pos から P_control を逆算:
              // M = 0.25*P0 + 0.5*P_control + 0.25*P1
              // ∴ P_control = 2*M - 0.5*(P0 + P1)
              const calcCpX = 2 * pos.x - 0.5 * (curSx + curEx);
              const calcCpY = 2 * pos.y - 0.5 * (curSy + curEy);

              updateKonvaPoints(curSx, curSy, curEx, curEy, calcCpX, calcCpY);
            }}
            onDragEnd={(e) => {
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

              // 逆算された制御点 P_control (クランプなしで広範レンジ保持)
              const calcCpX = 2 * pos.x - 0.5 * (curSx + curEx);
              const calcCpY = 2 * pos.y - 0.5 * (curSy + curEy);

              const newNormX = cpPxToNormX(calcCpX, width);
              const newNormY = cpPxToNormY(calcCpY, height);
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';

              // 直線に戻すかどうかの判定: ポインタ M (pos) と 中点 (curSx + curEx)/2 のピクセル距離
              const midPxX = (curSx + curEx) / 2;
              const midPxY = (curSy + curEy) / 2;
              const distFromMidPx = Math.hypot(pos.x - midPxX, pos.y - midPxY);

              if (distFromMidPx < 6.0) {
                e.target.position({ x: midPxX, y: midPxY });
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
  const strokeColor = zone.strokeColor ?? zone.color ?? '#22c55e';
  const strokeWidth = zone.strokeWidth || 2;

  const shapeNodeRef = useRef<Konva.Node | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

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
                const lineNode = e.target.getParent()?.findOne('Line') as
                  | Konva.Line
                  | undefined;
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
  const normPosX = zone.x ?? zone.points[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points[0]?.y ?? 20;
  let normW =
    zone.width ??
    (zone.points.length >= 2
      ? Math.abs(zone.points[1].x - zone.points[0].x)
      : 30);
  let normH =
    zone.height ??
    (zone.points.length >= 4
      ? Math.abs(zone.points[2].y - zone.points[0].y)
      : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = normX(normW, width);
  const pxH = normY(normH, height);
  const cx = normX(normPosX, width) + pxW / 2;
  const cy = normY(normPosY, height) + pxH / 2;
  const rotation = zone.rotation || 0;

  return (
    <Group>
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
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
              return oldBox;
            return newBox;
          }}
          keepRatio={false}
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
          anchorSize={9}
          anchorCornerRadius={2}
          onTransformEnd={() => {
            const node = shapeNodeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const rot = node.rotation();
            node.scaleX(1);
            node.scaleY(1);

            const newPxW = Math.abs(pxW * scaleX);
            const newPxH = Math.abs(pxH * scaleY);
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
      stroke="#020617"
      strokeWidth={text.fontSize > 20 ? 2 : 1}
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
