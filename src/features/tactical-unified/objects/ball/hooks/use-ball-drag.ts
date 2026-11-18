'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef } from 'react';
import { pxToNorm } from '@/features/tactical-unified/core';
import { useObjectDragLifecycle } from '@/features/tactical-unified/core/hooks/use-object-drag-lifecycle';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import { syncBallDragKonvaNodes } from '@/features/tactical-unified/core/utils/drag-konva-sync';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';

interface UseBallDragProps {
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  selectionRingRef?: React.RefObject<Konva.Circle | null>;
  isSelected?: boolean;
}

export function useBallDrag({
  stageSize,
  nodesRegistryRef,
  selectionRingRef,
  isSelected,
}: UseBallDragProps) {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectObject = useSessionStore((s) => s.selectObject);

  const { isDragging, beginDrag, endDrag } = useObjectDragLifecycle({
    isSelected: Boolean(isSelected),
    onSelect: (isShift) => selectObject({ id: 'ball', kind: 'ball' }, isShift),
  });

  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );

  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      beginDrag(e);
      selectionRingRef?.current?.visible(false);
      startPosRef.current = activeSlide
        ? { x: activeSlide.ball.x, y: activeSlide.ball.y }
        : null;

      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1.25, y: 1.25 });
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';
    },
    [activeSlide, beginDrag, selectionRingRef],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const registry = nodesRegistryRef?.current;
      if (!registry) return;

      const node = e.currentTarget as Konva.Group;
      syncBallDragKonvaNodes({
        registry,
        ballPx: { x: node.x(), y: node.y() },
        stageSize,
      });
    },
    [nodesRegistryRef, stageSize],
  );

  const dragBoundFunc = useCallback(
    function (this: Konva.Node, pos: Konva.Vector2d) {
      const parentPos = this.getParent()?.getAbsolutePosition() ?? {
        x: 0,
        y: 0,
      };
      return {
        x: Math.max(
          parentPos.x,
          Math.min(parentPos.x + stageSize.width, pos.x),
        ),
        y: Math.max(
          parentPos.y,
          Math.min(parentPos.y + stageSize.height, pos.y),
        ),
      };
    },
    [stageSize.width, stageSize.height],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      endDrag();
      selectionRingRef?.current?.visible(Boolean(isSelected));
      startPosRef.current = null;

      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1, y: 1 });
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'default';

      const finalX = clampToScreenNorm(pxToNorm(node.x(), stageSize.width));
      const finalY = clampToScreenNorm(pxToNorm(node.y(), stageSize.height));

      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_BALL',
        patch: { x: finalX, y: finalY },
      });
    },
    [
      activePhaseId,
      activeSlideId,
      dispatchSlide,
      endDrag,
      isSelected,
      selectionRingRef,
      stageSize.width,
      stageSize.height,
    ],
  );

  return {
    isDragging,
    dragBoundFunc,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
