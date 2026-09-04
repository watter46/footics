import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Circle } from 'react-konva';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ArrowEndHandleProps {
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
  p0: { x: number; y: number };
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

function calcEndMid(
  curSx: number,
  curSy: number,
  posX: number,
  posY: number,
  cpX?: number,
  cpY?: number,
  hasCp?: boolean,
) {
  if (!hasCp || cpX === undefined || cpY === undefined) {
    return { x: (curSx + posX) / 2, y: (curSy + posY) / 2 };
  }
  return {
    x: 0.25 * curSx + 0.5 * cpX + 0.25 * posX,
    y: 0.25 * curSy + 0.5 * cpY + 0.25 * posY,
  };
}

export const ArrowEndHandle = React.memo(function ArrowEndHandle({
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
  p0,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
  onSelect,
  updateArrow,
  updateKonvaPoints,
}: ArrowEndHandleProps) {
  const { width, height } = stageSize;

  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
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
      const mid = calcEndMid(
        curSx,
        curSy,
        pos.x,
        pos.y,
        cpPxX,
        cpPxY,
        !!arrow.controlPoint,
      );
      controlHandleRef.current.position(mid);
    }
    updateKonvaPoints(
      curSx,
      curSy,
      pos.x,
      pos.y,
      arrow.controlPoint ? cpPxX : undefined,
      arrow.controlPoint ? cpPxY : undefined,
    );
  };

  return (
    <Circle
      ref={endHandleRef as any}
      x={ePxX}
      y={ePxY}
      {...handleStyle}
      opacity={isSelected ? 1 : 0}
      visible={isSelected || isAttachedToPlayer}
      listening={
        isInteractive && (isSelected || isAttachedToPlayer) && !arrow.locked
      }
      draggable={isInteractive && !arrow.locked}
      hitStrokeWidth={16}
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
          targetPlayerId: undefined,
          points: [
            p0,
            { x: pxToNormX(pos.x, width), y: pxToNormY(pos.y, height) },
          ],
        });
      }}
    />
  );
});
