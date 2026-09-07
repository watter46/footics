'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { useCallback, useRef } from 'react';
import { normToPx } from '@/features/tactical-unified/objects/canvas';
import {
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { hideGhostGroup, setupGhostGroup } from './ball-drag-helper';

interface UseBallDragProps {
  stageSize: { width: number; height: number };
  ghostGroupRef: React.RefObject<any>;
  ghostLineRef: React.RefObject<any>;
}

export function useBallDrag({
  stageSize,
  ghostGroupRef,
  ghostLineRef,
}: UseBallDragProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const setBallPosition = useTacticalUnifiedStore((s) => s.setBallPosition);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);

  const prevBallPxRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      selectObject({ id: 'ball', kind: 'ball' }, false);
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1.25, y: 1.25 });
      node.moveToTop();
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';

      const prevB = prevSlide?.ball;
      if (prevB?.visible) {
        const pPxX = normToPx(prevB.x, stageSize.width);
        const pPxY = normToPx(prevB.y, stageSize.height);
        prevBallPxRef.current = { x: pPxX, y: pPxY };
        setupGhostGroup(
          ghostGroupRef.current,
          ghostLineRef.current,
          pPxX,
          pPxY,
          node.x(),
          node.y(),
        );
      } else {
        prevBallPxRef.current = null;
        hideGhostGroup(ghostGroupRef.current);
      }
    },
    [
      prevSlide?.ball,
      selectObject,
      stageSize.height,
      stageSize.width,
      ghostGroupRef,
      ghostLineRef,
    ],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.currentTarget as Konva.Group;
      if (prevBallPxRef.current && ghostLineRef.current) {
        ghostLineRef.current.points([
          prevBallPxRef.current.x,
          prevBallPxRef.current.y,
          node.x(),
          node.y(),
        ]);
        node.getLayer()?.batchDraw();
      }
    },
    [ghostLineRef],
  );

  const dragBoundFunc = useCallback(
    (pos: { x: number; y: number }) => ({
      x: Math.max(-stageSize.width, Math.min(stageSize.width * 2, pos.x)),
      y: Math.max(-stageSize.height, Math.min(stageSize.height * 2, pos.y)),
    }),
    [stageSize.width, stageSize.height],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1, y: 1 });
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'default';

      hideGhostGroup(ghostGroupRef.current);
      prevBallPxRef.current = null;

      const clampedPxX = Math.max(
        -stageSize.width,
        Math.min(stageSize.width * 2, node.x()),
      );
      const clampedPxY = Math.max(
        -stageSize.height,
        Math.min(stageSize.height * 2, node.y()),
      );
      const x = (clampedPxX / stageSize.width) * 100;
      const y = (clampedPxY / stageSize.height) * 100;
      setBallPosition(activeSlideId, x, y);
    },
    [
      activeSlideId,
      setBallPosition,
      stageSize.height,
      stageSize.width,
      ghostGroupRef,
    ],
  );

  return {
    dragBoundFunc,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
