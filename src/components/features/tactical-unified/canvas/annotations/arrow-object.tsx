'use client';

/**
 * arrow-object.tsx
 * 実線・点線・波線矢印の描画・制御ハンドル（ベジェ／正弦波幾何計算含む）
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect } from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import type { ArrowAnnotation, Slide } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from '../canvas-registry';
import {
  cpPxToNormX,
  cpPxToNormY,
  normX,
  normY,
  pxToNormX,
  pxToNormY,
} from './math-utils';
import { getQuadraticBezierPoints, getWavyPoints } from './wavy-arrow-math';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ArrowObjectProps {
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
}

export const ArrowObject = React.memo(function ArrowObject({
  arrow,
  slide,
  slideId,
  stageSize,
  isSelected,
  onSelect,
  updateArrow,
  nodesRegistryRef,
}: ArrowObjectProps) {
  const { width, height } = stageSize;
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const isInteractive = activeTool === 'select';
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

  const isWavy = arrow.arrowType === 'dribble';

  const renderPoints = isWavy
    ? getWavyPoints(renderSx, renderSy, renderEx, renderEy)
    : isCurved
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
      if (!isCurrentlyCurved && !isWavy) {
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

    if (isWavy) {
      arrowRef.current.points(getWavyPoints(rsx, rsy, rex, rey));
    } else if (isCurrentlyCurved) {
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
        draggable={isInteractive && !isAttachedToPlayer}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = isAttachedToPlayer
              ? 'pointer'
              : 'grab';
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
        onDragStart={(e) => {
          if (isAttachedToPlayer) return;
          e.cancelBubble = true;
          if (!isSelected) {
            onSelect(e);
          }
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
            x: p0.x + dxNorm,
            y: p0.y + dyNorm,
          };
          const newP1 = {
            x: p1.x + dxNorm,
            y: p1.y + dyNorm,
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

      {/* ── ハンドル群 ── */}
      {/* 1. 始点ハンドル: フリー矢印かつ選択中のみ表示 */}
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
        visible={isSelected && !isAttachedToPlayer}
        listening={isInteractive && isSelected && !isAttachedToPlayer}
        draggable={isInteractive}
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
          if (!isSelected) onSelect(e);
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grabbing';
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const pos = e.target.position();
          const curEx = endHandleRef.current ? endHandleRef.current.x() : ePxX;
          const curEy = endHandleRef.current ? endHandleRef.current.y() : ePxY;
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

      {/* 2. 終点（先端）ハンドル: 選択中またはPlayer付属矢印で常時ドラッグ可能（未選択時は透明ヒットエリア） */}
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
        opacity={isSelected ? 1 : 0}
        visible={isSelected || isAttachedToPlayer}
        listening={isInteractive && (isSelected || isAttachedToPlayer)}
        perfectDrawEnabled={false}
        draggable={isInteractive}
        hitStrokeWidth={16}
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
          if (!isSelected) {
            onSelect(e);
          }
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
            targetPlayerId: undefined,
            points: [p0, { x: newNormX, y: newNormY }],
          });
        }}
      />

      {/* 3. カーブ制御ハンドル: 選択時のみ表示 (波線矢印ではカーブハンドルは不要) */}
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
        visible={isSelected && !isWavy}
        listening={isInteractive && isSelected && !isWavy}
        draggable={isInteractive}
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
          if (!isSelected) {
            onSelect(e);
          }
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
          const curEx = endHandleRef.current ? endHandleRef.current.x() : ePxX;
          const curEy = endHandleRef.current ? endHandleRef.current.y() : ePxY;

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
          const curEx = endHandleRef.current ? endHandleRef.current.x() : ePxX;
          const curEy = endHandleRef.current ? endHandleRef.current.y() : ePxY;

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
  );
});
