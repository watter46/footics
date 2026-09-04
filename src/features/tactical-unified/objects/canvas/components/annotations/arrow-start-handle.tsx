import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Circle } from 'react-konva';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ArrowStartHandleProps {
  arrow: ArrowAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  cpPxX: number;
  cpPxY: number;
  p1: { x: number; y: number };
  startHandleRef: React.RefObject<Konva.Circle | null>;
  endHandleRef: React.RefObject<Konva.Circle | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (
    slideId: string,
    id: string,
    p: Partial<ArrowAnnotation>,
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

const handleStyle = {
  radius: 7,
  fill: '#ffffff',
  stroke: '#3b82f6',
  strokeWidth: 2.5,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 4,
  perfectDrawEnabled: false,
};

function setCursor(e: KonvaEventObject<any>, cursor: string) {
  const stage = e.target.getStage();
  if (stage) stage.container().style.cursor = cursor;
}

function calcStartMid(
  posX: number,
  posY: number,
  curEx: number,
  curEy: number,
  cpX?: number,
  cpY?: number,
  hasCp?: boolean,
) {
  if (!hasCp || cpX === undefined || cpY === undefined) {
    return { x: (posX + curEx) / 2, y: (posY + curEy) / 2 };
  }
  return {
    x: 0.25 * posX + 0.5 * cpX + 0.25 * curEx,
    y: 0.25 * posY + 0.5 * cpY + 0.25 * curEy,
  };
}

export const ArrowStartHandle = React.memo(function ArrowStartHandle({
  arrow,
  slideId,
  stageSize,
  isSelected,
  isInteractive,
  isAttachedToPlayer,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  cpPxX,
  cpPxY,
  p1,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
  onSelect,
  updateArrow,
  updateKonvaPoints,
}: ArrowStartHandleProps) {
  const { width, height } = stageSize;

  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const pos = e.target.position();
    const curEx = endHandleRef.current ? endHandleRef.current.x() : ePxX;
    const curEy = endHandleRef.current ? endHandleRef.current.y() : ePxY;
    if (controlHandleRef.current) {
      const mid = calcStartMid(
        pos.x,
        pos.y,
        curEx,
        curEy,
        cpPxX,
        cpPxY,
        !!arrow.controlPoint,
      );
      controlHandleRef.current.position(mid);
    }
    updateKonvaPoints(
      pos.x,
      pos.y,
      curEx,
      curEy,
      arrow.controlPoint ? cpPxX : undefined,
      arrow.controlPoint ? cpPxY : undefined,
    );
  };

  return (
    <Circle
      ref={startHandleRef as any}
      x={sPxX}
      y={sPxY}
      {...handleStyle}
      visible={isSelected && !isAttachedToPlayer}
      listening={
        isInteractive && isSelected && !isAttachedToPlayer && !arrow.locked
      }
      draggable={isInteractive && !arrow.locked}
      onMouseEnter={(e) => setCursor(e, 'grab')}
      onMouseLeave={(e) => setCursor(e, 'default')}
      onDragStart={(e) => {
        e.cancelBubble = true;
        if (!isSelected) onSelect(e);
        setCursor(e, 'grabbing');
      }}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const pos = e.target.position();
        setCursor(e, 'default');
        updateArrow(slideId, arrow.id, {
          points: [
            { x: pxToNormX(pos.x, width), y: pxToNormY(pos.y, height) },
            p1,
          ],
        });
      }}
    />
  );
});
