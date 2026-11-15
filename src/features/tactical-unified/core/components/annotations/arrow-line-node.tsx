import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Arrow } from 'react-konva';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowBodyDragDelta {
  readonly dxPx: number;
  readonly dyPx: number;
}

export interface ArrowLineNodeProps {
  arrow: ArrowAnnotation;
  resolvedArrow: ResolvedArrowPrimitive;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  renderPoints: number[];
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  arrowRef: React.RefObject<Konva.Arrow | null>;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (arrowId: string, patch: Partial<ArrowAnnotation>) => void;
  onBodyDragMove?: (delta: ArrowBodyDragDelta | null) => void;
}

export const ArrowLineNode = React.memo(function ArrowLineNode({
  arrow,
  resolvedArrow,
  stageSize,
  isSelected,
  isInteractive,
  isAttachedToPlayer,
  renderPoints,
  p0,
  p1,
  arrowRef,
  onSelect,
  updateArrow,
  onBodyDragMove,
}: ArrowLineNodeProps) {
  const { width, height } = stageSize;
  const hasArrowHead = resolvedArrow.endMarker === 'arrow';
  const strokeColor = isSelected ? '#60a5fa' : resolvedArrow.color;

  return (
    <Arrow
      ref={arrowRef}
      points={renderPoints}
      stroke={strokeColor}
      fill={strokeColor}
      strokeWidth={
        isSelected
          ? resolvedArrow.strokeWidthPx + 1
          : resolvedArrow.strokeWidthPx
      }
      dash={
        resolvedArrow.dashArrayPx.length > 0
          ? [...resolvedArrow.dashArrayPx]
          : undefined
      }
      dashOffset={resolvedArrow.dashOffsetPx}
      pointerLength={hasArrowHead ? resolvedArrow.pointerLengthPx : 0}
      pointerWidth={hasArrowHead ? resolvedArrow.pointerWidthPx : 0}
      opacity={resolvedArrow.opacity}
      visible={resolvedArrow.visible}
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
        if (isAttachedToPlayer) return;
        e.cancelBubble = true;
        const node = e.target;
        onBodyDragMove?.({ dxPx: node.x(), dyPx: node.y() });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const node = e.target;
        const dx = node.x();
        const dy = node.y();
        const dxNorm = (dx / width) * 100;
        const dyNorm = (dy / height) * 100;
        node.position({ x: 0, y: 0 });
        onBodyDragMove?.(null);

        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';

        const patch: Partial<ArrowAnnotation> = {
          points: [
            { x: p0.x + dxNorm, y: p0.y + dyNorm },
            { x: p1.x + dxNorm, y: p1.y + dyNorm },
          ],
        };
        if (arrow.sourcePlayerId || arrow.targetPlayerId) {
          patch.sourcePlayerId = undefined;
          patch.targetPlayerId = undefined;
        }
        if (arrow.controlPoint) {
          patch.controlPoint = {
            x: arrow.controlPoint.x + dxNorm,
            y: arrow.controlPoint.y + dyNorm,
          };
        }
        updateArrow(arrow.id, patch);
      }}
    />
  );
});
