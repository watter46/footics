'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { updateTrajectoryArrowPositions } from '@/features/tactical-unified/core/components/annotations/trajectory-arrow-drag-updater';
import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  computeFallbackNormPos,
  hideGhostGroup,
  setupBallGhostOnDragStart,
  updateBallGhostLine,
} from './ball-drag-helper';

interface UseBallDragProps {
  stageSize: { width: number; height: number };
  ghostGroupRef: React.RefObject<Konva.Group | null>;
  ghostLineRef: React.RefObject<Konva.Line | null>;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function useBallDrag({
  stageSize,
  ghostGroupRef,
  ghostLineRef,
  nodesRegistryRef,
}: UseBallDragProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const setBallPosition = useTacticalUnifiedStore((s) => s.setBallPosition);

  const [isDragging, setIsDragging] = useState(false);
  const prevBallPxRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(true);
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1.25, y: 1.25 });
      node.moveToTop();
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';

      prevBallPxRef.current = setupBallGhostOnDragStart(
        prevSlide?.ball,
        stageSize,
        node,
        ghostGroupRef.current,
        ghostLineRef.current,
      );
    },
    [prevSlide?.ball, stageSize, ghostGroupRef, ghostLineRef],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.currentTarget as Konva.Group;
      updateBallGhostLine(ghostLineRef.current, prevBallPxRef.current, node);
      updateTrajectoryArrowPositions(
        nodesRegistryRef?.current?.trajectoryArrowNodes,
        'ball',
        node.x(),
        node.y(),
        stageSize.width,
        stageSize.height,
      );
    },
    [ghostLineRef, nodesRegistryRef, stageSize.width, stageSize.height],
  );

  const dragBoundFunc = useCallback(
    function (this: Konva.Node, pos: Konva.Vector2d) {
      const parentPos = this.getParent()?.getAbsolutePosition() ?? {
        x: 0,
        y: 0,
      };
      return {
        x: Math.max(
          parentPos.x - stageSize.width,
          Math.min(parentPos.x + stageSize.width * 2, pos.x),
        ),
        y: Math.max(
          parentPos.y - stageSize.height,
          Math.min(parentPos.y + stageSize.height * 2, pos.y),
        ),
      };
    },
    [stageSize.width, stageSize.height],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(false);
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1, y: 1 });
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'default';

      hideGhostGroup(ghostGroupRef.current);
      prevBallPxRef.current = null;

      const finalPos = computeFallbackNormPos(node, stageSize);
      setBallPosition(activeSlideId, finalPos.x, finalPos.y);
    },
    [activeSlideId, setBallPosition, stageSize, ghostGroupRef],
  );

  return {
    isDragging,
    dragBoundFunc,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
