import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Arrow } from 'react-konva';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ArrowLineNodeProps {
  arrow: ArrowAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  hasArrowHead: boolean;
  renderPoints: number[];
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  midHandlePxX: number;
  midHandlePxY: number;
  arrowRef: React.RefObject<Konva.Arrow | null>;
  startHandleRef: React.RefObject<Konva.Circle | null>;
  endHandleRef: React.RefObject<Konva.Circle | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  startDotRef: React.RefObject<Konva.Circle | null>;
  endDotRef: React.RefObject<Konva.Circle | null>;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
}

export const ArrowLineNode = React.memo(function ArrowLineNode({
  arrow,
  slideId,
  stageSize,
  isSelected,
  isInteractive,
  isAttachedToPlayer,
  hasArrowHead,
  renderPoints,
  p0,
  p1,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  midHandlePxX,
  midHandlePxY,
  arrowRef,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
  startDotRef,
  endDotRef,
  onSelect,
  updateArrow,
}: ArrowLineNodeProps) {
  const { width, height } = stageSize;

  return (
    <Arrow
      ref={arrowRef as any}
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
      draggable={isInteractive && !isAttachedToPlayer && !arrow.locked}
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
        if (!isSelected) onSelect(e);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
      }}
      onDragMove={(e) => {
        const node = e.target;
        const dx = node.x();
        const dy = node.y();
        startHandleRef.current?.position({ x: sPxX + dx, y: sPxY + dy });
        endHandleRef.current?.position({ x: ePxX + dx, y: ePxY + dy });
        controlHandleRef.current?.position({
          x: midHandlePxX + dx,
          y: midHandlePxY + dy,
        });
        startDotRef.current?.position({ x: sPxX + dx, y: sPxY + dy });
        endDotRef.current?.position({ x: ePxX + dx, y: ePxY + dy });
        node.getLayer()?.batchDraw();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const dxNorm = (node.x() / width) * 100;
        const dyNorm = (node.y() / height) * 100;
        node.position({ x: 0, y: 0 });
        startDotRef.current?.position({ x: sPxX, y: sPxY });
        endDotRef.current?.position({ x: ePxX, y: ePxY });
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';

        const patch: Partial<ArrowAnnotation> = {
          points: [
            { x: p0.x + dxNorm, y: p0.y + dyNorm },
            { x: p1.x + dxNorm, y: p1.y + dyNorm },
          ],
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
  );
});
