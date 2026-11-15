import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Circle } from 'react-konva';
import {
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import type { ArrowHandlePreviewDelta } from './arrow-handles-group';
import { cpPxToNormX, cpPxToNormY } from './math-utils';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowControlPointsProps {
  arrow: DomainArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isWavy: boolean;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  midHandlePxX: number;
  midHandlePxY: number;
  p0: ScreenNormPoint;
  p1: ScreenNormPoint;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (arrowId: string, patch: Partial<DomainArrowAnnotation>) => void;
  onPreviewMove?: (delta: ArrowHandlePreviewDelta | null) => void;
}

export const ArrowControlPoints = React.memo(function ArrowControlPoints({
  arrow,
  stageSize,
  isSelected,
  isInteractive,
  isWavy,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  midHandlePxX,
  midHandlePxY,
  p0,
  p1,
  onSelect,
  updateArrow,
  onPreviewMove,
}: ArrowControlPointsProps) {
  const { width, height } = stageSize;

  return (
    <Circle
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
        onPreviewMove?.({ kind: 'control', pxX: pos.x, pxY: pos.y });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const pos = e.target.position();
        const calcCpX = 2 * pos.x - 0.5 * (sPxX + ePxX);
        const calcCpY = 2 * pos.y - 0.5 * (sPxY + ePxY);

        const newNormX = cpPxToNormX(calcCpX, width);
        const newNormY = cpPxToNormY(calcCpY, height);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';

        const midPxX = (sPxX + ePxX) / 2;
        const midPxY = (sPxY + ePxY) / 2;
        const distFromMidPx = Math.hypot(pos.x - midPxX, pos.y - midPxY);

        onPreviewMove?.(null);

        if (distFromMidPx < 6.0) {
          updateArrow(arrow.id, {
            sourcePlayerId: arrow.sourcePlayerId,
            curveType: 'straight',
            controlPoint: undefined,
            points: [p0, p1],
          });
        } else {
          updateArrow(arrow.id, {
            sourcePlayerId: arrow.sourcePlayerId,
            curveType: 'curved',
            controlPoint: toScreenNormPoint(newNormX, newNormY),
            points: [p0, p1],
          });
        }
      }}
    />
  );
});
