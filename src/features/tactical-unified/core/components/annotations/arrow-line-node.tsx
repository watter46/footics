import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import { Arrow } from 'react-konva';
import { useObjectDragLifecycle } from '@/features/tactical-unified/core/hooks/use-object-drag-lifecycle';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowLineNodeProps {
  arrow: DomainArrowAnnotation;
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
  updateArrow: (arrowId: string, patch: Partial<DomainArrowAnnotation>) => void;
  onBodyDragMove?: (dxPx: number, dyPx: number) => void;
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
  const { beginDrag, endDrag } = useObjectDragLifecycle({
    isSelected,
    onSelect: (_isShift, e) => onSelect(e),
  });
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
        beginDrag(e);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
      }}
      onDragMove={(e) => {
        if (isAttachedToPlayer) return;
        e.cancelBubble = true;
        const node = e.target;
        onBodyDragMove?.(node.x(), node.y());
      }}
      onDragEnd={(e) => {
        if (!isAttachedToPlayer) {
          endDrag();
        }
        e.cancelBubble = true;
        const node = e.target;
        const dx = node.x();
        const dy = node.y();
        const dxNorm = (dx / width) * 100;
        const dyNorm = (dy / height) * 100;
        node.position({ x: 0, y: 0 });
        onBodyDragMove?.(0, 0);

        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';

        const patch: Partial<DomainArrowAnnotation> = {
          points: [
            toScreenNormPoint(p0.x + dxNorm, p0.y + dyNorm),
            toScreenNormPoint(p1.x + dxNorm, p1.y + dyNorm),
          ],
          ...(arrow.sourcePlayerId || arrow.targetPlayerId
            ? { sourcePlayerId: undefined, targetPlayerId: undefined }
            : {}),
          ...(arrow.controlPoint
            ? {
                controlPoint: toScreenNormPoint(
                  arrow.controlPoint.x + dxNorm,
                  arrow.controlPoint.y + dyNorm,
                ),
              }
            : {}),
        };
        updateArrow(arrow.id, patch);
      }}
    />
  );
});
