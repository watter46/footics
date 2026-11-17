'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pxToNorm } from '@/features/tactical-unified/core';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { EphemeralDragDelta } from '@/lib/tactical/compiler/scene-graph-dto';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';

interface UseBallDragProps {
  stageSize: { width: number; height: number };
}

export function useBallDrag({ stageSize }: UseBallDragProps) {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveDragDelta = useSessionStore((s) => s.setActiveDragDelta);
  const setIsHudOpen = useSessionStore((s) => s.setIsHudOpen);

  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );

  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDeltaRef = useRef<EphemeralDragDelta | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const cancelPendingDragDelta = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = null;
    pendingDeltaRef.current = null;
  }, []);

  const scheduleDragDelta = useCallback(
    (delta: EphemeralDragDelta) => {
      pendingDeltaRef.current = delta;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const pending = pendingDeltaRef.current;
          pendingDeltaRef.current = null;
          if (pending) {
            setActiveDragDelta(pending);
          }
        });
      }
    },
    [setActiveDragDelta],
  );

  useEffect(() => {
    return () => {
      cancelPendingDragDelta();
    };
  }, [cancelPendingDragDelta]);

  const handleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(true);
      setIsHudOpen(false);
      startPosRef.current = activeSlide
        ? { x: activeSlide.ball.x, y: activeSlide.ball.y }
        : null;

      const node = e.currentTarget as Konva.Group;
      node.scale({ x: 1.25, y: 1.25 });
      node.moveToTop();
      const stage = node.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';
    },
    [activeSlide, setIsHudOpen],
  );

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const startPos = startPosRef.current;
      if (!startPos) return;

      const node = e.currentTarget as Konva.Group;
      const currX = pxToNorm(node.x(), stageSize.width);
      const currY = pxToNorm(node.y(), stageSize.height);

      scheduleDragDelta({
        entityIds: ['ball'],
        deltaScreenNormX: currX - startPos.x,
        deltaScreenNormY: currY - startPos.y,
      });
    },
    [stageSize.width, stageSize.height, scheduleDragDelta],
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
      cancelPendingDragDelta();
      setIsDragging(false);
      setActiveDragDelta(null);
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
      setActiveDragDelta,
      cancelPendingDragDelta,
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
