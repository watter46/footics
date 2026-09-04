import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Circle } from 'react-konva';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { cpPxToNormX, cpPxToNormY } from './math-utils';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ArrowControlPointsProps {
  arrow: ArrowAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  isWavy: boolean;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  midHandlePxX: number;
  midHandlePxY: number;
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  startHandleRef: React.RefObject<Konva.Circle | null>;
  endHandleRef: React.RefObject<Konva.Circle | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
  updateKonvaPoints: (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    cpx?: number,
    cpy?: number,
  ) => void;
}

/**
 * 選択時のベジェ曲率ドラッグハンドル描画Konvaノード
 */
export const ArrowControlPoints = React.memo(function ArrowControlPoints({
  arrow,
  slideId,
  stageSize,
  isSelected,
  isInteractive,
  isAttachedToPlayer,
  isWavy,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  midHandlePxX,
  midHandlePxY,
  p0,
  p1,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
  onSelect,
  updateArrow,
  updateKonvaPoints,
}: ArrowControlPointsProps) {
  const { width, height } = stageSize;

  return (
    <Circle
      ref={controlHandleRef as any}
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
      listening={isInteractive && isSelected && !isWavy && !arrow.locked}
      draggable={isInteractive && !arrow.locked}
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

        const calcCpX = 2 * pos.x - 0.5 * (curSx + curEx);
        const calcCpY = 2 * pos.y - 0.5 * (curSy + curEy);

        const newNormX = cpPxToNormX(calcCpX, width);
        const newNormY = cpPxToNormY(calcCpY, height);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';

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
  );
});
