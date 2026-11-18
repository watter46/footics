import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Circle } from 'react-konva';
import {
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import type { ArrowHandleKind } from './arrow-handles-group';
import { pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowStartHandleProps {
  arrow: DomainArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  sPxX: number;
  sPxY: number;
  p1: ScreenNormPoint;
  handleRef?: React.Ref<Konva.Circle>;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (id: string, p: Partial<DomainArrowAnnotation>) => void;
  onHandleDragMove?: (kind: ArrowHandleKind, pxX: number, pxY: number) => void;
  onHandleDragEnd?: () => void;
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

function setCursor(
  e: KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>,
  cursor: string,
) {
  const stage = e.target.getStage();
  if (stage) stage.container().style.cursor = cursor;
}

export const ArrowStartHandle = React.memo(function ArrowStartHandle({
  arrow,
  stageSize,
  isSelected,
  isInteractive,
  isAttachedToPlayer,
  sPxX,
  sPxY,
  p1,
  handleRef,
  onSelect,
  updateArrow,
  onHandleDragMove,
  onHandleDragEnd,
}: ArrowStartHandleProps) {
  const { width, height } = stageSize;

  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const pos = e.target.position();
    onHandleDragMove?.('start', pos.x, pos.y);
  };

  return (
    <Circle
      ref={handleRef}
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
        onHandleDragEnd?.();
        updateArrow(arrow.id, {
          points: [
            toScreenNormPoint(
              pxToNormX(pos.x, width),
              pxToNormY(pos.y, height),
            ),
            p1,
          ],
        });
      }}
    />
  );
});
